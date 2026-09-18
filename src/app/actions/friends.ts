'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Friendship, Profile } from '@/lib/supabase/types'
import { sendEmail } from '@/lib/notifications/send-email'
import { getServerBaseUrl } from '@/lib/utils/url-server'
import React from 'react'

export async function sendFriendRequest(receiverEmail: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const cleanEmail = receiverEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }

    if (user.email && user.email.toLowerCase() === cleanEmail) {
      return { success: false, error: 'You cannot send a friend request to yourself' }
    }

    // Check if a friendship already exists in either direction
    const { data: existingOutgoing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('sender_id', user.id)
      .eq('receiver_email', cleanEmail)
      .maybeSingle()

    if (existingOutgoing) {
      if (existingOutgoing.status === 'accepted') {
        return { success: false, error: 'You are already friends with this user' }
      }
      if (existingOutgoing.status === 'pending') {
        return { success: false, error: 'Friend request already sent and pending' }
      }
    }

    // Check if receiver is already a registered user
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', cleanEmail)
      .maybeSingle()

    const receiverId = receiverProfile?.id || null

    // Check if this specific recipient already sent us a request
    if (user.email && receiverId) {
      const { data: existingIncoming } = await supabase
        .from('friendships')
        .select('id, status')
        .eq('sender_id', receiverId)
        .eq('receiver_email', user.email.toLowerCase())
        .maybeSingle()

      if (existingIncoming) {
        if (existingIncoming.status === 'accepted') {
          return { success: false, error: 'You are already friends with this user' }
        }
        if (existingIncoming.status === 'pending') {
          return { success: false, error: 'This user has already sent you a friend request. Check your incoming requests.' }
        }
      }
    }

    // Insert friendship row
    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        sender_id: user.id,
        receiver_email: cleanEmail,
        receiver_id: receiverId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending friend request:', error)
      return { success: false, error: error.message }
    }

    // Fetch sender profile for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const senderName = senderProfile?.full_name || user.email?.split('@')[0] || 'A HackFlow member'

    // If receiver is registered, send in-app notification
    if (receiverId) {
      await supabase.from('notifications').insert({
        user_id: receiverId,
        title: 'Friend Request',
        body: `${senderName} sent you a friend request.`,
        link: '/friends',
        read: false,
      })
    }

    // Fire off transactional email invite
    try {
      const appBaseUrl = getServerBaseUrl();
      await sendEmail({
        to: cleanEmail,
        subject: `${senderName} invited you to collaborate on HackFlow`,
        html: `<!DOCTYPE html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; padding: 24px; margin: 0;">
  <div style="background-color: #ffffff; max-width: 560px; margin: 0 auto; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d; border-radius: 6px; overflow: hidden;">
    <div style="background-color: #10201d; padding: 18px; text-align: center;">
      <h1 style="color: #f7f7f2; margin: 0; font-size: 20px; font-weight: bold;">⚡ HackFlow Squad Invite</h1>
    </div>
    <div style="padding: 28px;">
      <h2 style="color: #10201d; margin-top: 0; font-size: 18px;">${senderName} wants to collaborate!</h2>
      <p style="color: #34433f; font-size: 15px; line-height: 1.6;">
        <strong>${senderName}</strong> (${user.email}) invited you to connect as a squad friend on HackFlow to coordinate hackathon sprints, share vaults, and track team deadlines.
      </p>
      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${appBaseUrl}/friends" style="background-color: #e53927; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border-radius: 4px;">
          Accept Friend Request &rarr;
        </a>
      </div>
    </div>
    <div style="border-top: 1px solid #e6ebf1; padding: 14px; text-align: center; font-size: 12px; color: #8898aa;">
      Sent automatically by HackFlow
    </div>
  </div>
</body>
</html>`,
      })
    } catch (emailErr) {
      console.warn('Failed to send friend invite email:', emailErr)
    }

    revalidatePath('/friends')
    revalidatePath('/vault')
    return { success: true, data: friendship }
  } catch (err: any) {
    console.error('sendFriendRequest exception:', err)
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export async function acceptFriendRequest(friendshipId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Verify user is the intended recipient
    const { data: friendship, error: fetchErr } = await supabase
      .from('friendships')
      .select('id, sender_id, receiver_email, receiver_id')
      .eq('id', friendshipId)
      .single()

    if (fetchErr || !friendship) {
      return { success: false, error: 'Friend request not found' }
    }

    const isMatch =
      friendship.receiver_id === user.id ||
      (user.email && friendship.receiver_email.toLowerCase() === user.email.toLowerCase())

    if (!isMatch) {
      return { success: false, error: 'You are not authorized to accept this request' }
    }

    const { error: updateErr } = await supabase
      .from('friendships')
      .update({
        status: 'accepted',
        receiver_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', friendshipId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Notify sender that their request was accepted
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const accepterName = receiverProfile?.full_name || user.email?.split('@')[0] || 'Your friend'

    await supabase.from('notifications').insert({
      user_id: friendship.sender_id,
      title: 'Friend Request Accepted',
      body: `${accepterName} accepted your friend request.`,
      link: '/friends',
      read: false,
    })

    revalidatePath('/friends')
    revalidatePath('/vault')
    return { success: true }
  } catch (err: any) {
    console.error('acceptFriendRequest error:', err)
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export async function declineFriendRequest(friendshipId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: friendship, error: fetchErr } = await supabase
      .from('friendships')
      .select('id, sender_id, receiver_id, receiver_email')
      .eq('id', friendshipId)
      .maybeSingle()

    if (fetchErr || !friendship) {
      return { success: false, error: 'Friendship request not found' }
    }

    const isReceiver = friendship.receiver_id === user.id || 
      (user.email && friendship.receiver_email?.toLowerCase() === user.email.toLowerCase());

    if (!isReceiver) {
      return { success: false, error: 'Forbidden: Only the recipient can decline this request' }
    }

    const { error } = await supabase
      .from('friendships')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', friendshipId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/friends')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export async function removeFriend(friendshipId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: friendship, error: fetchErr } = await supabase
      .from('friendships')
      .select('id, sender_id, receiver_id, receiver_email')
      .eq('id', friendshipId)
      .maybeSingle()

    if (fetchErr || !friendship) {
      return { success: false, error: 'Friendship record not found' }
    }

    const isParty = friendship.sender_id === user.id || 
      friendship.receiver_id === user.id || 
      (user.email && friendship.receiver_email?.toLowerCase() === user.email.toLowerCase());

    if (!isParty) {
      return { success: false, error: 'Forbidden: You are not authorized to remove this connection' }
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/friends')
    revalidatePath('/vault')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal server error' }
  }
}

export async function getFriendsList(): Promise<{ success: boolean; data: Friendship[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, data: [], error: 'Unauthorized' }
    }

    // Bidirectional query: sender_id = user.id OR receiver_id = user.id (OR receiver_email = user.email)
    const { data: rawFriendships, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    if (error) {
      console.error('getFriendsList error:', error)
      return { success: false, data: [], error: error.message }
    }

    if (!rawFriendships || rawFriendships.length === 0) {
      return { success: true, data: [] }
    }

    // Collect all other participant IDs to fetch profiles
    const otherUserIds: string[] = []
    rawFriendships.forEach(f => {
      const otherId = f.sender_id === user.id ? f.receiver_id : f.sender_id
      if (otherId) otherUserIds.push(otherId)
    })

    const { data: profiles } = otherUserIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', otherUserIds)
      : { data: [] }

    const profileMap = new Map<string, Profile>()
    profiles?.forEach(p => profileMap.set(p.id, p))

    // Map friendships with friend_profile (the counterparty)
    const friendships: Friendship[] = rawFriendships.map(f => {
      const isSender = f.sender_id === user.id
      const counterpartyId = isSender ? f.receiver_id : f.sender_id
      const counterpartyEmail = isSender ? f.receiver_email : ''

      let friendProfile = counterpartyId ? profileMap.get(counterpartyId) : undefined

      if (!friendProfile) {
        friendProfile = {
          id: counterpartyId || 'unknown',
          email: counterpartyEmail,
          full_name: counterpartyEmail ? counterpartyEmail.split('@')[0] : 'Teammate',
          avatar_url: null,
          created_at: f.created_at,
        }
      }

      return {
        ...f,
        friend_profile: friendProfile,
      }
    })

    return { success: true, data: friendships }
  } catch (err: any) {
    console.error('getFriendsList exception:', err)
    return { success: false, data: [], error: err.message }
  }
}

export async function getPendingRequests(): Promise<{
  success: boolean
  incoming: Friendship[]
  outgoing: Friendship[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, incoming: [], outgoing: [], error: 'Unauthorized' }
    }

    // Incoming pending requests
    let incomingQuery = supabase
      .from('friendships')
      .select('*')
      .eq('status', 'pending')

    if (user.email) {
      incomingQuery = incomingQuery.or(`receiver_id.eq.${user.id},receiver_email.ilike.${user.email}`)
    } else {
      incomingQuery = incomingQuery.eq('receiver_id', user.id)
    }

    const { data: incomingData, error: inErr } = await incomingQuery

    // Outgoing pending requests
    const { data: outgoingData, error: outErr } = await supabase
      .from('friendships')
      .select('*')
      .eq('sender_id', user.id)
      .eq('status', 'pending')

    if (inErr || outErr) {
      return { success: false, incoming: [], outgoing: [], error: inErr?.message || outErr?.message }
    }

    // Fetch sender profiles for incoming
    const senderIds = (incomingData || []).map(f => f.sender_id)
    const { data: senderProfiles } = senderIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', senderIds)
      : { data: [] }

    const senderProfileMap = new Map<string, Profile>()
    senderProfiles?.forEach(p => senderProfileMap.set(p.id, p))

    const incoming: Friendship[] = (incomingData || []).map(f => ({
      ...f,
      sender_profile: senderProfileMap.get(f.sender_id) || {
        id: f.sender_id,
        email: '',
        full_name: 'HackFlow Member',
        avatar_url: null,
        created_at: f.created_at,
      },
    }))

    const outgoing: Friendship[] = outgoingData || []

    return { success: true, incoming, outgoing }
  } catch (err: any) {
    return { success: false, incoming: [], outgoing: [], error: err.message }
  }
}
