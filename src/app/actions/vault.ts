'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureExternalUrl } from '@/lib/utils/url';
import { createInAppNotification, hasRecentNudge } from '@/lib/notifications/in-app';
import type { TeamVaultProfile, TeamVaultAsset, SquadScratchpad, Profile } from '@/lib/supabase/types';

export async function getVaultProfiles(squadId?: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: [] };

    if (!squadId) {
      return { success: false, error: 'Squad ID is required', data: [] };
    }

    // 1. Fetch all members belonging to this squad
    const { data: squadMembers, error: smErr } = await supabase
      .from('squad_members')
      .select('user_id, role')
      .eq('squad_id', squadId);

    if (smErr || !squadMembers || squadMembers.length === 0) {
      return { success: true, data: [] };
    }

    const memberIds = squadMembers.map((m) => m.user_id);

    // 2. Fetch profiles and team_vault_profiles in parallel
    const [profilesRes, vaultProfilesRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', memberIds),
      supabase.from('team_vault_profiles').select('*').in('user_id', memberIds),
    ]);

    const profileMap = new Map<string, Profile>();
    profilesRes.data?.forEach((p) => profileMap.set(p.id, p));

    const vaultMap = new Map<string, TeamVaultProfile>();
    vaultProfilesRes.data?.forEach((vp) => vaultMap.set(vp.user_id, vp));

    // 3. Merge so members without vault profiles are visibly flagged as pending
    const merged: TeamVaultProfile[] = squadMembers.map((sm) => {
      const vp = vaultMap.get(sm.user_id);
      const p = profileMap.get(sm.user_id);

      const isComplete = Boolean(
        vp && (vp.phone || vp.college || vp.roll_number || vp.resume_url || vp.github_url)
      );

      return {
        id: vp?.id || sm.user_id,
        user_id: sm.user_id,
        full_name: vp?.full_name || p?.full_name || 'Squad Member',
        email: vp?.email || p?.email || '',
        phone: vp?.phone || null,
        college: vp?.college || null,
        roll_number: vp?.roll_number || null,
        github_url: vp?.github_url || null,
        linkedin_url: vp?.linkedin_url || null,
        portfolio_url: vp?.portfolio_url || null,
        resume_url: vp?.resume_url || null,
        created_at: vp?.created_at,
        has_vault_profile: Boolean(vp),
        is_complete: isComplete,
        role: sm.role as 'leader' | 'member',
        avatar_url: p?.avatar_url || null,
      };
    });

    return { success: true, data: merged };
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

    if (!squadId) {
      return { success: false, error: 'Squad ID is required', data: [] };
    }

    let query = supabase.from('team_vault_assets').select('*').eq('squad_id', squadId);

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

    if (!assetData.squad_id) {
      return { success: false, error: 'Squad ID is required' };
    }

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
        squad_id: assetData.squad_id,
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

export async function nudgeTeammateProfile(squadId: string, targetUserId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (user.id === targetUserId) {
      return { success: false, error: 'Cannot nudge yourself' };
    }

    // 1. Validate sender is an active member of this squad
    const { data: senderMembership } = await supabase
      .from('squad_members')
      .select('id')
      .eq('squad_id', squadId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!senderMembership) {
      return { success: false, error: 'Forbidden: You must be a member of this squad to nudge teammates' };
    }

    // 2. Validate target user is an active member of this squad
    const { data: targetMembership } = await supabase
      .from('squad_members')
      .select('id')
      .eq('squad_id', squadId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!targetMembership) {
      return { success: false, error: 'Target user is not a member of this squad' };
    }

    // 3. Rate-limit check: check if a nudge was already sent in the last 15 minutes
    const alreadyNudged = await hasRecentNudge(targetUserId, squadId, 15);
    if (alreadyNudged) {
      return {
        success: false,
        error: 'A nudge was already sent to this teammate in the last 15 minutes. Please wait before nudging again.',
      };
    }

    // 4. Fetch squad name
    const { data: squad } = await supabase
      .from('squads')
      .select('name')
      .eq('id', squadId)
      .maybeSingle();

    const squadName = squad?.name || 'your squad';

    // 5. Fetch sender name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const senderName = senderProfile?.full_name || user.email?.split('@')[0] || 'A teammate';

    // 6. Dispatch in-app notification with deep link to auto-open edit modal
    await createInAppNotification({
      userId: targetUserId,
      title: '📢 Squad Registration Profile Needed',
      body: `${senderName} requested your registration details for squad "${squadName}". Please complete your Vault profile so your squad can 1-click register for competitions.`,
      link: `/vault?squad=${squadId}&action=edit-profile`,
    });

    return { success: true };
  } catch (err: any) {
    console.error('nudgeTeammateProfile error:', err);
    return { success: false, error: err.message || 'Failed to send nudge' };
  }
}

export async function getSquadScratchpad(squadId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized', data: null };

    const { data: scratchpad, error } = await supabase
      .from('squad_scratchpads')
      .select('*')
      .eq('squad_id', squadId)
      .maybeSingle();

    if (error) {
      console.warn('getSquadScratchpad warning:', error);
      return { success: false, error: error.message, data: null };
    }

    if (!scratchpad) {
      return {
        success: true,
        data: {
          squad_id: squadId,
          meet_url: null,
          chat_channel_url: null,
          staging_url: null,
          test_credentials: null,
          notes: null,
          updated_by: null,
        } as SquadScratchpad,
      };
    }

    let editorProfile: Profile | undefined = undefined;
    if (scratchpad.updated_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', scratchpad.updated_by)
        .maybeSingle();
      if (profile) editorProfile = profile;
    }

    return {
      success: true,
      data: {
        ...scratchpad,
        editor_profile: editorProfile,
      } as SquadScratchpad,
    };
  } catch (err: any) {
    return { success: false, error: err.message, data: null };
  }
}

export async function updateSquadScratchpad(
  squadId: string,
  scratchData: {
    meet_url?: string | null;
    chat_channel_url?: string | null;
    staging_url?: string | null;
    test_credentials?: string | null;
    notes?: string | null;
  }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify squad membership
    const { data: membership } = await supabase
      .from('squad_members')
      .select('id')
      .eq('squad_id', squadId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return { success: false, error: 'Forbidden: You must be a squad member to update this scratchpad' };
    }

    const { data, error } = await supabase
      .from('squad_scratchpads')
      .upsert({
        squad_id: squadId,
        meet_url: scratchData.meet_url?.trim() ? ensureExternalUrl(scratchData.meet_url.trim()) : null,
        chat_channel_url: scratchData.chat_channel_url?.trim() ? ensureExternalUrl(scratchData.chat_channel_url.trim()) : null,
        staging_url: scratchData.staging_url?.trim() ? ensureExternalUrl(scratchData.staging_url.trim()) : null,
        test_credentials: scratchData.test_credentials?.trim() || null,
        notes: scratchData.notes || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'squad_id' })
      .select('*')
      .single();

    if (error) {
      console.error('updateSquadScratchpad error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/vault');
    return { success: true, data };
  } catch (err: any) {
    console.error('updateSquadScratchpad exception:', err);
    return { success: false, error: err.message || 'Failed to update scratchpad' };
  }
}
