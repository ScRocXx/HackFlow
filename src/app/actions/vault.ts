'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureExternalUrl } from '@/lib/utils/url';
import type { TeamVaultProfile, TeamVaultAsset } from '@/lib/supabase/types';

export async function getVaultProfiles(squadId?: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: [] };

    let query = supabase.from('team_vault_profiles').select('*');

    if (squadId) {
      // Fetch only profiles of members in this squad
      const { data: squadMembers, error: smErr } = await supabase
        .from('squad_members')
        .select('user_id')
        .eq('squad_id', squadId);

      if (smErr || !squadMembers || squadMembers.length === 0) {
        return { success: true, data: [] };
      }

      const memberIds = squadMembers.map((m) => m.user_id);
      query = query.in('user_id', memberIds);
    } else {
      // Personal Vault: show only current user's profile card
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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

    // Defensive: Ensure profile row exists in public.profiles to satisfy FK constraint
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email || profileData.email.trim(),
      full_name: profileData.full_name.trim() || user.user_metadata?.full_name || 'HackFlow Member',
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'id' });

    const { data, error } = await supabase
      .from('team_vault_profiles')
      .upsert({
        user_id: user.id,
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone?.trim() || null,
        college: profileData.college?.trim() || null,
        roll_number: profileData.roll_number?.trim() || null,
        github_url: profileData.github_url?.trim() ? ensureExternalUrl(profileData.github_url) : null,
        linkedin_url: profileData.linkedin_url?.trim() ? ensureExternalUrl(profileData.linkedin_url) : null,
        portfolio_url: profileData.portfolio_url?.trim() ? ensureExternalUrl(profileData.portfolio_url) : null,
        resume_url: profileData.resume_url?.trim() ? ensureExternalUrl(profileData.resume_url) : null,
      }, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      if (error.message?.includes('Could not find the table')) {
        return { 
          success: false, 
          error: 'Database table missing: Please run supabase/fix_schema_and_rls.sql in your Supabase SQL editor.' 
        };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/vault');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save profile' };
  }
}

export async function getVaultAssets(assetType?: string, squadId?: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: [] };

    let query = supabase.from('team_vault_assets').select('*');

    if (squadId) {
      query = query.eq('squad_id', squadId);
    } else {
      // Personal vault: only assets with squad_id IS NULL created by current user
      query = query.is('squad_id', null).eq('created_by', user.id);
    }

    if (assetType && assetType !== 'all') {
      query = query.eq('asset_type', assetType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
  squad_id?: string | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!assetData.title?.trim() || !assetData.url?.trim()) {
      return { success: false, error: 'Title and URL are required' };
    }

    // Defensive: Ensure profile row exists in public.profiles to satisfy FK constraint
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'HackFlow Member',
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'id' });

    const { data, error } = await supabase
      .from('team_vault_assets')
      .insert({
        title: assetData.title.trim(),
        asset_type: assetData.asset_type,
        url: ensureExternalUrl(assetData.url),
        description: assetData.description?.trim() || null,
        tags: assetData.tags || [],
        created_by: user.id,
        squad_id: assetData.squad_id || null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.message?.includes('Could not find the table')) {
        return { 
          success: false, 
          error: 'Database table missing: Please run supabase/fix_schema_and_rls.sql in your Supabase SQL editor.' 
        };
      }
      return { success: false, error: error.message };
    }

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

    // Fetch asset to verify ownership
    const { data: asset } = await supabase
      .from('team_vault_assets')
      .select('created_by, squad_id')
      .eq('id', assetId)
      .maybeSingle();

    if (!asset) return { success: false, error: 'Asset not found' };

    if (asset.created_by !== user.id) {
      if (asset.squad_id) {
        // Allow squad leader to delete
        const { data: squadMembership } = await supabase
          .from('squad_members')
          .select('role')
          .eq('squad_id', asset.squad_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (squadMembership?.role !== 'leader') {
          return { success: false, error: 'Forbidden: Only the creator or squad leader can delete this asset' };
        }
      } else {
        return { success: false, error: 'Forbidden: You can only delete assets you created' };
      }
    }

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
