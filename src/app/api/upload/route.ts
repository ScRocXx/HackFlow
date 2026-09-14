import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
const BUCKET_NAME = 'hackflow_uploads';

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
      return NextResponse.json({ error: 'File exceeds the 50MB limit' }, { status: 400 });
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

    // 1. Primary: Supabase Storage
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        const adminClient = createServiceClient(supabaseUrl, serviceRoleKey);

        // Ensure bucket exists with public access
        await adminClient.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
        }).catch(() => {});

        const { error: uploadError } = await adminClient.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/pdf',
            upsert: true,
          });

        if (!uploadError) {
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
        }
        console.warn('Supabase storage upload error, falling back to local storage:', uploadError);
      }
    } catch (storageErr) {
      console.warn('Supabase storage failure, using local file fallback:', storageErr);
    }

    // 2. Reliable Fallback: public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localFileName = `${Date.now()}_${cleanName}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);

    const localUrl = `/uploads/${localFileName}`;
    return NextResponse.json({
      success: true,
      url: localUrl,
      fileName: originalName,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload file' }, { status: 500 });
  }
}
