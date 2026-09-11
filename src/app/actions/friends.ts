'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Friendship, Profile } from '@/lib/supabase/types'
import { sendEmail } from '@/lib/notifications/send-email'
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

    // Check if the recipient sent us a request
    if (user.email) {
      const { data: existingIncoming } = await supabase
        .from('friendships')
        .select('id, status')
        .eq('receiver_email', user.email.toLowerCase())
        .maybeSingle()

      if (existingIncoming && existingIncoming.status === 'accepted') {
        return { success: false, error: 'You are already friends with this user' }
      }
    }

    // Check if receiver is already a registered user
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', cleanEmail)
      .maybeSingle()

    const receiverId = receiverProfile?.id || null

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
      await sendEmail({
        to: cleanEmail,
        subject: `${senderName} invited you to collaborate on HackFlow`,
        react: React.createElement(
          'div',
          { style: { fontFamily: 'sans-serif', padding: '24px', backgroundColor: '#f9f9f9' } },
          React.createElement('h2', { style: { color: '#10201d' } }, 'HackFlow Squad Invite'),
          React.createElement(
            'p',
            null,
            `${senderName} (${user.email}) wants to connect as a squad friend on HackFlow to coordinate hackathon sprints, share vaults, and track team deadlines.`
          ),
          React.createElement(
            'p',
            null,
            'Log in to HackFlow or create an account to accept the request!'
          )
        ),
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
