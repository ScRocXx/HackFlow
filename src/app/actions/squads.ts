'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Squad, SquadMember, TeamVaultProfile, TeamVaultAsset, Profile } from '@/lib/supabase/types'
import { createInAppNotification, createBatchInAppNotifications } from '@/lib/notifications/in-app'

export async function createSquad(name: string, memberIds: string[] = []) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return { success: false, error: 'Squad name is required' }
    }

    // 1. Create the squad
    const { data: squad, error: squadErr } = await supabase
      .from('squads')
      .insert({
        name: trimmedName,
        created_by: user.id,
      })
      .select()
      .single()

    if (squadErr || !squad) {
      console.error('createSquad insert error:', squadErr)
      return { success: false, error: squadErr?.message || 'Failed to create squad' }
    }

    // 2. Add creator as leader
    const membersToInsert: { squad_id: string; user_id: string; role: 'leader' | 'member' }[] = [
      { squad_id: squad.id, user_id: user.id, role: 'leader' },
    ]

    // 3. Add initial member IDs (excluding creator if included)
    memberIds.forEach((uid) => {
      if (uid && uid !== user.id) {
        membersToInsert.push({
          squad_id: squad.id,
          user_id: uid,
          role: 'member',
        })
      }
    })

    const { error: membersErr } = await supabase
      .from('squad_members')
      .insert(membersToInsert)

    if (membersErr) {
      console.error('createSquad members insert error:', membersErr)
    } else if (membersToInsert.length > 1) {
      // Dispatch in-app notifications to other members
      try {
        const { data: creatorProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        const creatorName = creatorProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'A squad leader'
        const otherUserIds = membersToInsert.filter(m => m.user_id !== user.id).map(m => m.user_id)

        if (otherUserIds.length > 0) {
          await createBatchInAppNotifications(
            otherUserIds.map(uid => ({
              userId: uid,
              title: `Added to Squad: ${squad.name}`,
              body: `${creatorName} added you to the squad "${squad.name}". Check out your squad vault!`,
              link: '/vault',
            }))
          )
        }
      } catch (notifErr) {
        console.error('Error sending squad creation notifications:', notifErr)
      }
    }

    revalidatePath('/vault')
    revalidatePath('/friends')
    revalidatePath('/dashboard')
    return { success: true, data: squad }
  } catch (err: any) {
    console.error('createSquad exception:', err)
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export async function getMySquads(): Promise<{ success: boolean; data: Squad[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, data: [], error: 'Unauthorized' }
    }

    // 1. Get squad IDs where user is member or creator
    const { data: memberRows, error: memberErr } = await supabase
      .from('squad_members')
      .select('squad_id')
      .eq('user_id', user.id)

    if (memberErr) {
      return { success: false, data: [], error: memberErr.message }
    }

    const squadIds = (memberRows || []).map((r) => r.squad_id)

    // Also get squads created by user
    const { data: createdSquads } = await supabase
      .from('squads')
      .select('id')
      .eq('created_by', user.id)

    createdSquads?.forEach((s) => {
      if (!squadIds.includes(s.id)) squadIds.push(s.id)
    })

    if (squadIds.length === 0) {
      return { success: true, data: [] }
    }

    // 2. Fetch the squads
    const { data: squads, error: squadErr } = await supabase
      .from('squads')
      .select('*')
      .in('id', squadIds)
      .order('created_at', { ascending: false })

    if (squadErr) {
      return { success: false, data: [], error: squadErr.message }
    }

    // 3. Fetch members with profiles for each squad
    const { data: allMembers } = await supabase
      .from('squad_members')
      .select('id, squad_id, user_id, role, joined_at')
      .in('squad_id', squadIds)

    const allMemberUserIds = Array.from(new Set((allMembers || []).map((m) => m.user_id)))
    const { data: profiles } = allMemberUserIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', allMemberUserIds)
      : { data: [] }

    const profileMap = new Map<string, Profile>()
    profiles?.forEach((p) => profileMap.set(p.id, p))

    const squadsWithMembers: Squad[] = (squads || []).map((s) => {
      const squadMembers: SquadMember[] = (allMembers || [])
        .filter((m) => m.squad_id === s.id)
        .map((m) => ({
          ...m,
          role: m.role as 'leader' | 'member',
          profile: profileMap.get(m.user_id),
        }))

      return {
        ...s,
        members: squadMembers,
        member_count: squadMembers.length,
      }
    })

    return { success: true, data: squadsWithMembers }
  } catch (err: any) {
    console.error('getMySquads exception:', err)
    return { success: false, data: [], error: err.message }
  }
}

export async function getSquadDetails(squadId: string): Promise<{ success: boolean; data?: Squad; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: squad, error: squadErr } = await supabase
      .from('squads')
      .select('*')
      .eq('id', squadId)
      .single()

    if (squadErr || !squad) {
      return { success: false, error: 'Squad not found' }
    }

    const { data: memberRows } = await supabase
      .from('squad_members')
      .select('id, squad_id, user_id, role, joined_at')
      .eq('squad_id', squadId)

    const memberUserIds = (memberRows || []).map((m) => m.user_id)
    const { data: profiles } = memberUserIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', memberUserIds)
      : { data: [] }

    const profileMap = new Map<string, Profile>()
    profiles?.forEach((p) => profileMap.set(p.id, p))

    const members: SquadMember[] = (memberRows || []).map((m) => ({
      ...m,
      role: m.role as 'leader' | 'member',
      profile: profileMap.get(m.user_id),
    }))

    return {
      success: true,
      data: {
        ...squad,
        members,
        member_count: members.length,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function addSquadMember(squadId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('squad_members')
      .insert({
        squad_id: squadId,
        user_id: userId,
        role: 'member',
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // Notify the added squad member
    if (userId !== user.id) {
      try {
        const { data: squad } = await supabase.from('squads').select('name').eq('id', squadId).single()
        const { data: adderProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        const adderName = adderProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'A squad leader'
        const squadName = squad?.name || 'Squad'

        await createInAppNotification({
          userId: userId,
          title: `Added to Squad: ${squadName}`,
          body: `${adderName} added you as a member to "${squadName}". Check out your squad vault!`,
          link: '/vault',
        })
      } catch (notifErr) {
        console.error('Error dispatching squad member notification:', notifErr)
      }
    }

    revalidatePath('/vault')
    revalidatePath('/friends')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function removeSquadMember(squadId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Only creator or self-removal allowed
    const { data: squad } = await supabase
      .from('squads')
      .select('created_by')
      .eq('id', squadId)
      .single()

    if (squad?.created_by !== user.id && user.id !== userId) {
      return { success: false, error: 'Not authorized to remove this member' }
    }

    const { error } = await supabase
      .from('squad_members')
      .delete()
      .eq('squad_id', squadId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/vault')
    revalidatePath('/friends')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteSquad(squadId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', squadId)
      .eq('created_by', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/vault')
    revalidatePath('/friends')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSquadVaultProfiles(squadId: string): Promise<{ success: boolean; data: TeamVaultProfile[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, data: [], error: 'Unauthorized' }
    }

    // Get all user_ids in this squad
    const { data: members, error: mErr } = await supabase
      .from('squad_members')
      .select('user_id')
      .eq('squad_id', squadId)

    if (mErr || !members || members.length === 0) {
      return { success: true, data: [] }
    }

    const userIds = members.map((m) => m.user_id)

    const { data: profiles, error: pErr } = await supabase
      .from('team_vault_profiles')
      .select('*')
      .in('user_id', userIds)

    if (pErr) {
      return { success: false, data: [], error: pErr.message }
    }

    return { success: true, data: profiles || [] }
  } catch (err: any) {
    return { success: false, data: [], error: err.message }
  }
}

export async function getSquadVaultAssets(squadId: string): Promise<{ success: boolean; data: TeamVaultAsset[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, data: [], error: 'Unauthorized' }
    }

    const { data: assets, error } = await supabase
      .from('team_vault_assets')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: assets || [] }
  } catch (err: any) {
    return { success: false, data: [], error: err.message }
  }
}
