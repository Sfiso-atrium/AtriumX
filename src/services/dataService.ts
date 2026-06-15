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
  type: string
  message: string
  listing_id: string | null
  conversation_id: string | null
  read: boolean
  created_at: string
}

// ── PLAN CONSTANTS ─────────────────────────────────────────────────────────

export const PLAN_TIERS = {
  ghost:       { label: 'Ghost',       price: 'Free', priceNum: 0,   days: 3,  maxListings: 1,  maxPhotos: 0, maxVariants: 0,  maxMsgs: 3,   canChat: true,  canRenew: false, canNegBadge: false, analytics: false, pushNotif: false, bulkPost: 0,  searchBoost: false, verified: false, spotlight: false },
  flash:       { label: 'Flash',       price: 'R9',   priceNum: 9,   days: 2,  maxListings: 1,  maxPhotos: 1, maxVariants: 0,  maxMsgs: 10,  canChat: true,  canRenew: false, canNegBadge: true,  analytics: false, pushNotif: false, bulkPost: 0,  searchBoost: false, verified: false, spotlight: false },
  visible:     { label: 'Visible',     price: 'R29',  priceNum: 29,  days: 7,  maxListings: 3,  maxPhotos: 1, maxVariants: 3,  maxMsgs: 999, canChat: true,  canRenew: true,  canNegBadge: true,  analytics: false, pushNotif: true,  bulkPost: 0,  searchBoost: false, verified: false, spotlight: false },
  loud:        { label: 'Loud',        price: 'R79',  priceNum: 79,  days: 14, maxListings: 8,  maxPhotos: 3, maxVariants: 8,  maxMsgs: 999, canChat: true,  canRenew: true,  canNegBadge: true,  analytics: true,  pushNotif: true,  bulkPost: 3,  searchBoost: false, verified: true,  spotlight: false },
  unmissable:  { label: 'Unmissable',  price: 'R149', priceNum: 149, days: 30, maxListings: 999,maxPhotos: 5, maxVariants: 999,maxMsgs: 999, canChat: true,  canRenew: true,  canNegBadge: true,  analytics: true,  pushNotif: true,  bulkPost: 999,searchBoost: true,  verified: true,  spotlight: true  },
} as const

export type PlanKey = keyof typeof PLAN_TIERS

// ── AUTH ───────────────────────────────────────────────────────────────────

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
  residence: string
): Promise<{ user: Profile | null; error: string | null }> {
  const initials = fullName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = ['#1A5F7A', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12', '#3498DB']
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
  return data as Profile
}

export async function updateProfile(
  id: string,
  fields: Partial<Pick<Profile, 'full_name' | 'residence' | 'avatar_color' | 'watched_residences'>>
): Promise<{ error: string | null }> {
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
  return { error: error ? error.message : null }
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
  return data as Listing[]
}

export async function getListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .eq('id', id)
    .single()
  if (error || !data) return null

  await supabase
    .from('listings')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', id)

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
}): Promise<{ id: string | null; error: string | null }> {
  const tierConfig = PLAN_TIERS[payload.planTier]
  const expiresAt = new Date(
    Date.now() + tierConfig.days * 86400000
  ).toISOString()

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
  return { id: data.id, error: null }
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
  const { error } = await supabase
    .from('listings')
    .update({ status: 'active', expires_at: expiresAt })
    .eq('id', listingId)
  return { error: error ? error.message : null }
}

export async function reportListing(
  listingId: string,
  reporterId: string,
  reason?: string
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
await supabase.rpc('increment_contact_count', { listing_id: listingId }).catch(() => {})


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
      buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_initials, avatar_color),
      seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_initials, avatar_color)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
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

export async function getMessageCount(convId: string, senderId: string): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', convId)
    .eq('sender_id', senderId)
  return count || 0
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

export async function createNotification(payload: {
  userId: string
  type: Notification['type']
  message: string
  listingId?: string
  conversationId?: string
}): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    message: payload.message,
    listing_id: payload.listingId || null,
    conversation_id: payload.conversationId || null,
  })
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

export async function approveListingById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', id)
  return { error: error ? error.message : null }
}

export async function rejectListingById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'suspended' })
    .eq('id', id)
  return { error: error ? error.message : null }
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
