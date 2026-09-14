'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createInAppNotification } from '@/lib/notifications/in-app';
import { sendTeamInviteEmail } from '@/lib/notifications/send-email';

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
      .select('id, full_name, email')
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
      email: email,
      user_id: targetUserId,
      role: 'member',
      joined_at: targetUserId ? new Date().toISOString() : null
    });

    if (error) return { success: false, error: error.message };

    // Also sync to event_participants if registered user
    if (targetUserId) {
      await supabase.from('event_participants').upsert({
        event_id: eventId,
        user_id: targetUserId,
        role: 'collaborator',
        joined_at: new Date().toISOString()
      }, { onConflict: 'event_id,user_id' });
    }

    // Dispatch in-app notification and email
    try {
      const { data: event } = await supabase.from('events').select('title').eq('id', eventId).single();
      const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const inviterName = inviterProfile?.full_name || user.email?.split('@')[0] || 'Team Lead';
      const eventTitle = event?.title || 'Hackathon';
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const eventUrl = `${appBaseUrl}/events/${eventId}`;

      if (targetUserId) {
        await createInAppNotification({
          userId: targetUserId,
          title: `Invited to Team: ${eventTitle}`,
          body: `${inviterName} invited you to join the team for "${eventTitle}".`,
          link: `/events/${eventId}`,
        });
      }

      await sendTeamInviteEmail({
        to: email,
        inviterName: inviterName,
        eventTitle: eventTitle,
        inviteUrl: eventUrl,
      });
    } catch (notifErr) {
      console.error('Error dispatching team invite notification/email:', notifErr);
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
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
