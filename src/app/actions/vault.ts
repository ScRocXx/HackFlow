'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { TeamVaultProfile, TeamVaultAsset } from '@/lib/supabase/types';

export async function getVaultProfiles() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: [] };

    const { data, error } = await supabase
      .from('team_vault_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('team_vault_profiles fetch warning:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: (data as TeamVaultProfile[]) || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function upsertVaultProfile(profileData: {
  full_name: string;
  email: string;
  phone?: string;
  college?: string;
  roll_number?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  resume_url?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!profileData.full_name?.trim() || !profileData.email?.trim()) {
      return { success: false, error: 'Name and email are required' };
    }

    const { data, error } = await supabase
      .from('team_vault_profiles')
      .upsert({
        user_id: user.id,
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone?.trim() || null,
        college: profileData.college?.trim() || null,
        roll_number: profileData.roll_number?.trim() || null,
        github_url: profileData.github_url?.trim() || null,
        linkedin_url: profileData.linkedin_url?.trim() || null,
        portfolio_url: profileData.portfolio_url?.trim() || null,
        resume_url: profileData.resume_url?.trim() || null,
      }, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/vault');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save profile' };
  }
}

export async function getVaultAssets(assetType?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: [] };

    let query = supabase
      .from('team_vault_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (assetType && assetType !== 'all') {
      query = query.eq('asset_type', assetType);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('team_vault_assets fetch warning:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: (data as TeamVaultAsset[]) || [] };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function createVaultAsset(assetData: {
  title: string;
  asset_type: 'pitch_deck' | 'figma_kit' | 'boilerplate' | 'diagram' | 'other';
  url: string;
  description?: string;
  tags?: string[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!assetData.title?.trim() || !assetData.url?.trim()) {
      return { success: false, error: 'Title and URL are required' };
    }

    const { data, error } = await supabase
      .from('team_vault_assets')
      .insert({
        title: assetData.title.trim(),
        asset_type: assetData.asset_type,
        url: assetData.url.trim(),
        description: assetData.description?.trim() || null,
        tags: assetData.tags || [],
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/vault');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create asset' };
  }
}

export async function deleteVaultAsset(assetId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('team_vault_assets')
      .delete()
      .eq('id', assetId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/vault');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete asset' };
  }
}
