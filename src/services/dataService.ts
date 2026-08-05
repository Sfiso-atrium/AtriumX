import { supabase } from './supabaseClient'

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  residence: string | null
  avatar_initials: string
  avatar_color: string
  plan: 'ghost' | 'flash' | 'visible' | 'loud' | 'unmissable'
  plan_expires_at: string | null
  avg_rating: number
  total_ratings: number
  total_listings: number
  is_verified: boolean
  is_admin: boolean
  watched_residences: string[]
  joined_date: string
  created_at: string
}
export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  category: string
  custom_category: string | null
  image_urls: string[]
  video_url: string | null
  residence: string
  listing_type: 'single' | 'ongoing'
  is_negotiable: boolean
  plan_tier: string
  status: 'pending' | 'active' | 'sold' | 'expired' | 'suspended'
  report_count: number
  contact_count: number
  view_count: number
  variants: { name: string; price: number }[]
  expires_at: string
  created_at: string
  has_pending_edit: boolean
  edited_at: string | null
  seller?: Profile
}


export interface Conversation {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  is_resolved: boolean
  created_at: string
  listing?: Listing
  other_party?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  sent_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'listing_approved' | 'listing_rejected' | 'rating_request'
  message: string
  listing_id: string | null
  conversation_id: string | null
  read: boolean
  created_at: string
}

export interface Rating {
  id: string
  seller_id: string
  buyer_id: string
  listing_id: string
  stars: number
  comment: string | null
  created_at: string
  listing?: { id: string; title: string }
  buyer?: { full_name: string; avatar_initials: string; avatar_color: string }
}

export interface Report {
  id: string
  listing_id: string
  reporter_id: string
  reason: string
  created_at: string
  reporter?: { full_name: string }
}
// ── PLAN CONSTANTS ─────────────────────────────────────────────────────────

export const PLAN_TIERS = {
  ghost:       { label: 'Ghost',       price: 'Free', priceNum: 0,   days: 3,  maxListings: 1, maxPhotos: 0, maxVariants: 0,   maxMsgs: 3,   canChat: true, canRenew: false, canNegBadge: false, pushNotif: false, bulkPost: 0,   searchBoost: false, badge: null },
  visible:     { label: 'Visible',     price: 'R29',  priceNum: 29,  days: 7,  maxListings: 2, maxPhotos: 1, maxVariants: 3,   maxMsgs: 10,  canChat: true, canRenew: true,  canNegBadge: true,  pushNotif: true,  bulkPost: 0,   searchBoost: false, badge: 'Spotted' },
  loud:        { label: 'Loud',        price: 'R79',  priceNum: 79,  days: 14, maxListings: 3, maxPhotos: 3, maxVariants: 8,   maxMsgs: 999, canChat: true, canRenew: true,  canNegBadge: true,  pushNotif: true,  bulkPost: 3,   searchBoost: false, badge: 'Verified' },
  unmissable:  { label: 'Unmissable',  price: 'R149', priceNum: 149, days: 30, maxListings: 6, maxPhotos: 5, maxVariants: 999, maxMsgs: 999, canChat: true, canRenew: true,  canNegBadge: true,  pushNotif: true,  bulkPost: 999, searchBoost: true,  badge: 'Featured' },
} as const

export type PlanKey = keyof typeof PLAN_TIERS

export const PLAN_ORDER: PlanKey[] = ['ghost', 'visible', 'loud', 'unmissable']

// ── AUTH ───────────────────────────────────────────────────────────────────

// Registration is restricted to eligible student email domains. Login is a
// completely separate function (loginWithEmail, below) and is untouched by
// this — existing accounts, including the gmail.com demo accounts used
// during development, keep working exactly as before regardless of domain.
const ALLOWED_STUDENT_DOMAINS = ['student.uj.ac.za', 'students.wits.ac.za']

// Pre-existing accounts that predate this restriction. Kept here too, not
// just relied on via login, so re-registering with one of these emails
// (e.g. after an account reset) is never blocked either.
const GRANDFATHERED_EMAILS = [
  'mmvelase121@gmail.com',
  'sfiso@gmail.com',
  'sandile@gmail.com',
  'abongwe@gmail.com',
  'babongile@gmail.com',
  'thandeka@gmail.com',
]

function isEligibleForRegistration(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  if (GRANDFATHERED_EMAILS.includes(normalized)) return true
  const domain = normalized.split('@')[1] || ''
  return ALLOWED_STUDENT_DOMAINS.includes(domain)
}

const INELIGIBLE_EMAIL_MESSAGE =
  'You have to be a student to create an account. If you believe your student email should be accepted, contact students@atriumx.co.za and we\'ll add your institution.'

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
  residence: string
): Promise<{ user: Profile | null; error: string | null }> {
  if (!isEligibleForRegistration(email)) {
    return { user: null, error: INELIGIBLE_EMAIL_MESSAGE }
  }

  const initials = fullName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = ['#0F6E56', '#185FA5', '#993C1D', '#993556', '#534AB7', '#3B6D11']
  const avatarColor = colors[Math.floor(Math.random() * colors.length)]

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        residence,
        avatar_initials: initials,
        avatar_color: avatarColor,
        email,
      },
    },
  })

  if (error) return { user: null, error: error.message }
  if (!data.user) return { user: null, error: 'Registration failed.' }

  let profile = null
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 600))
    profile = await getUserById(data.user.id)
    if (profile) break
  }
  if (!profile) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      residence,
      avatar_initials: initials,
      avatar_color: avatarColor,
      plan: 'ghost',
      watched_residences: [residence],
    })
    if (insertError) return { user: null, error: insertError.message }
    const retried = await getUserById(data.user.id)
    return { user: retried, error: null }
  }

  return { user: profile, error: null }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ user: Profile | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials'))
      return { user: null, error: 'Incorrect email or password. Please try again.' }
    return { user: null, error: error.message }
  }

  if (!data.user) return { user: null, error: 'Login failed. Please try again.' }

  const profile = await getUserById(data.user.id)
  if (!profile) return { user: null, error: 'Account found but profile is missing. Contact support.' }

  return { user: profile, error: null }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

export async function restoreSession(): Promise<Profile | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  return getUserById(data.user.id)
}

// ── PROFILES ───────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return { ...data, watched_residences: data.watched_residences ?? [] } as Profile
}

export async function updateProfile(
  id: string,
  fields: Partial<Pick<Profile, 'full_name' | 'residence' | 'avatar_color' | 'watched_residences'>>
): Promise<{ user: Profile | null; error: string | null }> {
  const updates: Record<string, unknown> = { ...fields }
  if (fields.full_name) {
    updates.avatar_initials = fields.full_name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) return { user: null, error: error.message }
  const updated = await getUserById(id)
  return { user: updated, error: null }
}

export async function getUserListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as Listing[]
}

// ── RESIDENCES ─────────────────────────────────────────────────────────────

export async function getResidences(): Promise<string[]> {
  const { data, error } = await supabase
    .from('residences')
    .select('name')
    .order('name', { ascending: true })
  if (error || !data) return []
  return data.map(r => r.name)
}

// ── LISTINGS ───────────────────────────────────────────────────────────────

export async function getListings(filters: {
  category?: string
  search?: string
  currentUser?: Profile | null
} = {}): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

const { data, error } = await query
  if (error || !data) return []

  const PLAN_RANK: Record<string, number> = { unmissable: 4, loud: 3, visible: 2, ghost: 1 }
  const sorted = [...data].sort(
    (a, b) => (PLAN_RANK[b.plan_tier] || 0) - (PLAN_RANK[a.plan_tier] || 0)
  )

  return sorted as Listing[]
}

export async function getListingById(id: string, viewerId?: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .eq('id', id)
    .single()
  if (error || !data) return null

  if (!viewerId || viewerId !== data.seller_id) {
    await supabase
      .from('listings')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id)
  }

  return data as Listing
}

export async function createListing(payload: {
  sellerId: string
  title: string
  description: string
  price: number
  category: string
  customCategory?: string
  imageUrls: string[]
  videoUrl?: string
  residence: string
  listingType: 'single' | 'ongoing'
  isNegotiable: boolean
  planTier: PlanKey
  variants: { name: string; price: number }[]
): Promise<{ id: string | null; error: string | null }> {
  // Check the account's current plan BEFORE creating the listing. We need
  // this to know whether the person still has time left on what they paid
  // for, or whether this is a fresh purchase.
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', payload.sellerId)
    .single()

  const currentRank = profile ? PLAN_ORDER.indexOf(profile.plan as PlanKey) : -1
  const currentStillActive = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date()
  const newRank = PLAN_ORDER.indexOf(payload.planTier)

  const tierConfig = PLAN_TIERS[payload.planTier]
  const fullDuration = new Date(Date.now() + tierConfig.days * 86400000).toISOString()

  // Same tier (or lower) while the plan is still active: this listing rides
  // on time already paid for, so it expires WITH the plan, not 14 fresh days
  // from today. Higher tier, or a lapsed plan: that's a new purchase, so it
  // gets the full duration.
  const expiresAt =
    currentStillActive && newRank <= currentRank
      ? profile!.plan_expires_at!
      : fullDuration

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: payload.sellerId,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      custom_category: payload.customCategory || null,
      image_urls: payload.imageUrls,
      video_url: payload.videoUrl || null,
      residence: payload.residence,
      listing_type: payload.listingType,
      is_negotiable: payload.isNegotiable,
      plan_tier: payload.planTier,
      variants: payload.variants,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single()

if (error || !data) return { id: null, error: error?.message || 'Failed to create listing.' }

if (!currentStillActive || newRank >= currentRank) {
    await supabase
      .from('profiles')
      .update({ plan: payload.planTier, plan_expires_at: expiresAt })
      .eq('id', payload.sellerId)

    // Plan is account-wide, not per-listing — every other listing this
    // seller has rides along to the new tier too. Their own expiry is left
    // alone; this only changes which plan's badge/features they show.
    await supabase
      .from('listings')
      .update({ plan_tier: payload.planTier })
      .eq('seller_id', payload.sellerId)
      .in('status', ['active', 'pending'])
  }

  return { id: data.id, error: null }
}
export async function updateListing(
  listingId: string,
  payload: {
    title: string
    description: string
    price: number
    category: string
    customCategory?: string
    imageUrls: string[]
    videoUrl?: string
    residence: string
    listingType: 'single' | 'ongoing'
    isNegotiable: boolean
    variants: { name: string; price: number }[]
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('listings')
    .update({
      title: payload.title,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      custom_category: payload.customCategory || null,
      image_urls: payload.imageUrls,
      video_url: payload.videoUrl || null,
      residence: payload.residence,
      listing_type: payload.listingType,
      is_negotiable: payload.isNegotiable,
variants: payload.variants,
      // Status is intentionally left untouched here — an edit to an already
      // -live listing must stay live immediately. has_pending_edit/edited_at
      // are what let admins know a review is warranted, without gating
      // visibility on that review happening.
      has_pending_edit: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', listingId)
 
 
  return { error: error ? error.message : null }
}
export async function markListingAsSold(
  listingId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listingId)
  return { error: error ? error.message : null }
}

export async function renewListing(
  listingId: string,
  planTier: PlanKey
): Promise<{ error: string | null }> {
  const days = PLAN_TIERS[planTier].days
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString()
  const { data, error } = await supabase
    .from('listings')
    .update({ status: 'active', expires_at: expiresAt })
    .eq('id', listingId)
    .neq('status', 'suspended')
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { error: 'This listing was suspended by a moderator and cannot be renewed.' }
  }
  return { error: null }
}

export async function reportListing(
  listingId: string,
  reporterId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('reports')
    .insert({ listing_id: listingId, reporter_id: reporterId, reason })
  if (!error) {
    const { error: rpcError } = await supabase.rpc('increment_report_count', { listing_id: listingId })
    if (rpcError) console.error('Report count increment failed:', rpcError.message)
  }
  return { error: error ? error.message : null }
}

// ── IMAGE UPLOAD ───────────────────────────────────────────────────────────

export async function uploadListingImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()
  const filename = `listings/${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('listing-images')
    .upload(filename, file, { upsert: false })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data } = supabase.storage
    .from('listing-images')
    .getPublicUrl(filename)

  return { url: data.publicUrl, error: null }
}

// ── CONVERSATIONS ──────────────────────────────────────────────────────────

export async function startConversation(
  listingId: string,
  buyerId: string,
  sellerId: string
): Promise<{ convId: string | null; error: string | null }> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .single()

  if (existing) return { convId: existing.id, error: null }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select('id')
    .single()

  if (error || !data) return { convId: null, error: error?.message || 'Failed to start conversation.' }

  try {
    await supabase.rpc('increment_contact_count', { listing_id: listingId })
  } catch (_) {}

  return { convId: data.id, error: null }
}

export async function getConversationsForUser(
  userId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title, image_urls, price),
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_initials, avatar_color, plan),
      seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_initials, avatar_color, plan),
      messages(id, conversation_id, sender_id, content, read, sent_at)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('sent_at', { ascending: false, foreignTable: 'messages' })
    .limit(1, { foreignTable: 'messages' })

  if (error || !data) return []

  const conversations = data as unknown as (Conversation & { messages?: Message[] })[]

  // Latest activity = the conversation's most recent message. If nobody has
  // sent a message yet, fall back to when the conversation itself was
  // created so brand-new chats still slot in correctly.
  return conversations
    .map(c => ({ ...c, last_message: c.messages?.[0] }))
    .sort((a, b) => {
      const aTime = new Date(a.last_message?.sent_at ?? a.created_at).getTime()
      const bTime = new Date(b.last_message?.sent_at ?? b.created_at).getTime()
      return bTime - aTime
    })
}
export async function getConversationsForListing(
  listingId: string,
  sellerId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_initials, avatar_color, plan)
    `)
    .eq('listing_id', listingId)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as Conversation[]
}

export async function getConversationMessages(
  convId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('sent_at', { ascending: true })
  if (error || !data) return []
  return data as Message[]
}

export async function sendMessage(
  convId: string,
  senderId: string,
  content: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: convId, sender_id: senderId, content })
  return { error: error ? error.message : null }
}

export async function deleteConversation(
  convId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', convId)
  return { error: error ? error.message : null }
}

export async function markConversationResolved(
  convId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('conversations')
    .update({ is_resolved: true })
    .eq('id', convId)
  return { error: error ? error.message : null }
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('conversations')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

  if (!data || data.length === 0) return 0

  const convIds = data.map(c => c.id)
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .eq('read', false)
    .neq('sender_id', userId)

  return count || 0
}
export async function markMessagesRead(
  convId: string,
  userId: string
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', convId)
    .eq('read', false)
    .neq('sender_id', userId)
}
// ── RATINGS ────────────────────────────────────────────────────────────────

export async function submitRating(
  sellerId: string,
  buyerId: string,
  listingId: string,
  stars: number,
  comment?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ratings')
    .insert({ seller_id: sellerId, buyer_id: buyerId, listing_id: listingId, stars, comment })
  return { error: error ? error.message : null }
}

// Ratings live on the seller's profile, not on any one listing — this powers
// the "Reviews" section on Profile.tsx so a buyer's rating shows up there
// regardless of which of the seller's listings it was left for.
export async function getSellerRatings(sellerId: string): Promise<Rating[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      *,
      listing:listings(id, title),
      buyer:profiles!ratings_buyer_id_fkey(full_name, avatar_initials, avatar_color)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as unknown as Rating[]
}

// ── RATING INVITE (seller-initiated, opt-in) ────────────────────────────────

export interface RecentBuyer {
  buyer_id: string
  full_name: string
  avatar_initials: string
  avatar_color: string
}

// Buyers the seller chatted with about this specific listing, minus anyone
// who's already rated it. Backed by the get_recent_buyers() SECURITY DEFINER
// RPC (see migration 012) which verifies the caller is the listing's seller.
export async function getRecentBuyers(
  sellerId: string,
  listingId: string
): Promise<RecentBuyer[]> {
  const { data, error } = await supabase.rpc('get_recent_buyers', {
    p_seller_id: sellerId,
    p_listing_id: listingId,
  })
  if (error || !data) return []
  return data as RecentBuyer[]
}

// Sends a rating_request notification to a specific buyer. Routed through
// the send_rating_invite() RPC (migration 012) since a direct client insert
// into notifications for someone else's user_id is rejected by RLS.
export async function sendRatingInvite(
  sellerId: string,
  sellerName: string,
  buyerId: string,
  listingId: string,
  conversationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('send_rating_invite', {
    p_seller_id: sellerId,
    p_seller_name: sellerName,
    p_buyer_id: buyerId,
    p_listing_id: listingId,
    p_conversation_id: conversationId,
  })
  return { error: error ? error.message : null }
}

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────

export async function getUnreadNotifications(
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data) return []
  return data as Notification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

// ── ADMIN ──────────────────────────────────────────────────────────────────

export async function getPendingListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as Listing[]
}

export async function getAllListingsAdmin(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as Listing[]
}

export async function getEditedListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .eq('has_pending_edit', true)
    .order('edited_at', { ascending: false })
  if (error || !data) return []
  return data as Listing[]
}

// Admin has looked at the edit — clears the flag without touching status,
// since the listing was never taken down in the first place.
export async function acknowledgeListingEdit(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('listings')
    .update({ has_pending_edit: false })
    .eq('id', id)
  return { error: error ? error.message : null }
}

// Approve (pending → active) and reject (pending → suspended) both notify
// the seller with the correct fixed notification type. Routed through
// SECURITY DEFINER RPCs (migration 012) that check is_admin internally —
// the old direct update+insert pattern silently dropped the notification
// insert because it failed notifications RLS.
export async function approveListingById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('approve_listing', { p_listing_id: id })
  return { error: error ? error.message : null }
}

export async function rejectListingById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('reject_listing', { p_listing_id: id })
  return { error: error ? error.message : null }
}

// Suspending an already-active listing (from the "All Listings" tab) does
// NOT notify the seller per spec 4.10 — distinct from rejecting a pending
// listing, which does.
export async function suspendListingById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('suspend_listing', { p_listing_id: id })
  return { error: error ? error.message : null }
}

// reports->profiles is a single, unambiguous FK (only reporter_id), so
// embedding through public_profiles works fine here — unlike ratings/
// conversations which have two FKs into profiles and need the two-step
// fetch pattern instead.
export async function getReportsForListings(listingIds: string[]): Promise<Report[]> {
  if (listingIds.length === 0) return []
  const { data, error } = await supabase
    .from('reports')
    .select('*, reporter:public_profiles(full_name)')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as unknown as Report[]
}

export async function clearReports(listingId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('listing_id', listingId)
  if (!error) {
    await supabase
      .from('listings')
      .update({ report_count: 0 })
      .eq('id', listingId)
  }
  return { error: error ? error.message : null }
}

// ── PUSH PREFERENCES ───────────────────────────────────────────────────────

export async function savePushPreference(
  userId: string,
  enabled: boolean
): Promise<void> {
  await supabase
    .from('push_preferences')
    .upsert({ user_id: userId, push_enabled: enabled, updated_at: new Date().toISOString() })
}

export async function getPushPreference(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('push_preferences')
    .select('push_enabled')
    .eq('user_id', userId)
    .single()
  return data?.push_enabled ?? false
}

// ── BUSINESS ───────────────────────────────────────────────────────────────

export async function submitBusinessApplication(payload: {
  businessName: string
  businessType: string
  customBusinessType?: string
  contactPerson: string
  email: string
  phone: string
  selectedPackage: string
  description: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('business_profiles').insert({
    business_name: payload.businessName,
    business_type: payload.businessType,
    custom_business_type: payload.customBusinessType || null,
    contact_person: payload.contactPerson,
    email: payload.email,
    phone: payload.phone,
    selected_package: payload.selectedPackage,
    description: payload.description,
  })
  return { error: error ? error.message : null }
}
