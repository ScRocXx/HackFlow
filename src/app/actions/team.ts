'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function inviteTeamMember(eventId: string, email: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify ownership
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'owner') {
      return { success: false, error: 'Only team owners can invite members' };
    }

    // Lookup profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
    
    let targetUserId = null;
    if (profiles && profiles.length > 0) {
      targetUserId = profiles[0].id;
    }

    // Check existing
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: 'User is already invited or in the team' };
    }

    const { error } = await supabase.from('team_members').insert({
      event_id: eventId,
      email: email, // Assuming team_members has an email column for pending invites
      user_id: targetUserId,
      role: 'member',
      joined_at: targetUserId ? new Date().toISOString() : null
    });

    if (error) return { success: false, error: error.message };

    // TODO: send invite email via Resend (will be implemented in notification engine)

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to invite team member' };
  }
}

export async function removeTeamMember(eventId: string, memberId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify ownership
    const { data: currentMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (!currentMember || currentMember.role !== 'owner') {
      return { success: false, error: 'Only team owners can remove members' };
    }

    // Prevent removing owner
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('id', memberId)
      .single();
    
    if (targetMember && targetMember.role === 'owner') {
      return { success: false, error: 'Cannot remove the team owner' };
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove team member' };
  }
}

export async function acceptInvite(eventId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabase
      .from('team_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', user.email)
      .single();

    if (!member) {
      return { success: false, error: 'No invite found' };
    }

    const { error } = await supabase
      .from('team_members')
      .update({
        user_id: user.id,
        joined_at: new Date().toISOString()
      })
      .eq('id', member.id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to accept invite' };
  }
}
