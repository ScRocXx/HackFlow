import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import path from 'path';

const MAX_FILE_SIZE = Math.floor(4.5 * 1024 * 1024); // 4.5MB Vercel serverless request body limit
const BUCKET_NAME = 'hackflow_uploads';
let isBucketVerified = false;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to upload files' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'pitch_decks';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 4.5MB serverless upload limit' }, { status: 400 });
    }

    const originalName = file.name || 'presentation_deck.pdf';
    const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const extension = path.extname(cleanName).toLowerCase();

    // Verify acceptable presentation/document types
    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.key'];
    const isPdfMime = file.type === 'application/pdf' || file.type.includes('pdf');
    if (!allowedExtensions.includes(extension) && !isPdfMime) {
      return NextResponse.json(
        { error: 'Only PDF and presentation files (.pdf, .ppt, .pptx) are supported' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${user.id}/${folder}/${Date.now()}_${cleanName}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Cloud storage is not configured. Missing SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    const adminClient = createServiceClient(supabaseUrl, serviceRoleKey);

    // Ensure bucket exists with public access (checked at most once per lambda lifecycle)
    if (!isBucketVerified) {
      await adminClient.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      }).catch(() => {});
      isBucketVerified = true;
    }

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[UploadRoute] Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 502 }
      );
    }

    const { data: { publicUrl } } = adminClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: originalName,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload file' }, { status: 500 });
  }
}
