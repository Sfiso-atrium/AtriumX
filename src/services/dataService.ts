import { supabase } from './supabaseClient'
import { compressImageForUpload, fileToBase64 } from './imageCache'

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string
  residence: string | null
  avatar_initials: string
  avatar_color: string
plan: 'ghost' | 'visible' | 'loud' | 'unmissable' | 'noticeboard' | 'featured' | 'campus_partner'
  plan_expires_at: string | null
  account_type: 'student' | 'business'
  avg_rating: number
  total_ratings: number
  total_listings: number
is_verified: boolean
  is_admin: boolean
  is_blocked: boolean
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
  business_address?: string | null
  business_website?: string | null
}


export interface Conversation {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  is_resolved: boolean
  is_closed_by_admin: boolean
  closed_at: string | null
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
  type: 'listing_approved' | 'listing_rejected' | 'rating_request' | 'message' | 'message_locked' |
        'review' | 'review_locked' | 'business_approved' | 'business_rejected' |
        'deadline_reminder' | 'watchlist_match' | 'referral_listing' |
        'group_deadline_reminder' | 'group_deadline_update' | 'group_message'
  message: string
  listing_id: string | null
  conversation_id: string | null
  group_id: string | null
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
  conversation_id: string | null
  reporter_id: string
  reason: string
  status: 'open' | 'reviewed'
  created_at: string
  reporter?: { full_name: string }
}

export interface ChatReport extends Report {
  conversation?: {
    id: string
    is_closed_by_admin: boolean
    listing?: { title: string }
    buyer?: Profile
    seller?: Profile
  }
}
// ── PLAN CONSTANTS ─────────────────────────────────────────────────────────

export const PLAN_TIERS = {
  ghost:       { label: 'Ghost',       price: 'Free', priceNum: 0,   days: 3,  maxListings: 1, maxPhotos: 1, maxVariants: 0,   maxMsgs: 3,   canChat: true, canRenew: false, canNegBadge: false, pushNotif: false, bulkPost: 0,   searchBoost: false, badge: null },
  visible:     { label: 'Visible',     price: 'R29',  priceNum: 29,  days: 7,  maxListings: 1, maxPhotos: 1, maxVariants: 3,   maxMsgs: 10,  canChat: true, canRenew: true,  canNegBadge: true,  pushNotif: true,  bulkPost: 0,   searchBoost: false, badge: 'Spotted' },
  loud:        { label: 'Loud',        price: 'R79',  priceNum: 79,  days: 14, maxListings: 2, maxPhotos: 2, maxVariants: 8,   maxMsgs: 999, canChat: true, canRenew: true,  canNegBadge: true,  pushNotif: true,  bulkPost: 3,   searchBoost: false, badge: 'Verified' },
  unmissable:  { label: 'Unmissable',  price: 'R149', priceNum: 149, days: 30, maxListings: 3, maxPhotos: 3, maxVariants: 999, maxMsgs: 999, canChat: true, canRenew: true,  canNegBadge: true,  pushNotif: true,  bulkPost: 999, searchBoost: true,  badge: 'Featured' },
  // Business tiers. No payment infrastructure exists yet, so every business
  // account currently lives on 'noticeboard' regardless of what's shown
  // here — these values are what the tier grants once upgrades are wired
  // up, and are also what the reply/chat gates (migration 014) check
  // against right now.
noticeboard:    { label: 'Noticeboard',    price: 'Free', priceNum: 0,   days: 7,  maxListings: 1, maxPhotos: 1, maxVariants: 0, maxMsgs: 0,   canChat: false, canRenew: false, canNegBadge: false, pushNotif: false, bulkPost: 0, searchBoost: false, badge: null },
  featured:       { label: 'Featured',       price: 'R350', priceNum: 350, days: 14, maxListings: 2, maxPhotos: 2, maxVariants: 0, maxMsgs: 999, canChat: true,  canRenew: true,  canNegBadge: false, pushNotif: true,  bulkPost: 0, searchBoost: false, badge: 'Sponsored' },
  campus_partner: { label: 'Campus Partner', price: 'R800', priceNum: 800, days: 30, maxListings: 3, maxPhotos: 3, maxVariants: 0, maxMsgs: 999, canChat: true,  canRenew: true,  canNegBadge: false, pushNotif: true,  bulkPost: 0, searchBoost: true,  badge: 'Campus Partner' },
} as const

export type PlanKey = keyof typeof PLAN_TIERS

export const PLAN_ORDER: PlanKey[] = ['ghost', 'visible', 'loud', 'unmissable']
export const BUSINESS_PLAN_ORDER: PlanKey[] = ['noticeboard', 'featured', 'campus_partner']

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
  'Sorry, we could not sign you in. AtriumX is only open to registered students, If you believe this is a mistake email us at students@atriumx.co.za and we\'ll sort it out.'

const OFFLINE_MESSAGE = "You appear to be offline. Please check your internet connection and try again."

// supabase-js surfaces a dropped connection as a raw error.message like
// "Failed to fetch" or "NetworkError when attempting to fetch resource" —
// technically accurate, meaningless to a person. Catch those patterns and
// swap in something that actually tells them what to do.
function isNetworkError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string,
  residence: string,
  refCode?: string
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

await supabase
    .from('residences')
    .upsert({ name: residence.trim() }, { onConflict: 'name', ignoreDuplicates: true })
    .then(({ error: resErr }) => {
      if (resErr) console.warn('Residence upsert failed:', resErr.message)
    })

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
        ref_code: refCode || null,
      },
    },
  })

  if (error) return { user: null, error: isNetworkError(error.message) ? OFFLINE_MESSAGE : error.message }
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
    return { user: null, error: isNetworkError(error.message) ? OFFLINE_MESSAGE : error.message }
  }

  if (!data.user) return { user: null, error: 'Login failed. Please try again.' }

const profile = await getUserById(data.user.id)
  if (!profile) return { user: null, error: 'Account found but profile is missing. Contact support.' }

  if (profile.is_blocked) {
    await supabase.auth.signOut()
    return {
      user: null,
      error: 'Your account has been suspended due to a violation of our community guidelines. If you believe this was a mistake, please contact support.',
    }
  }

  return { user: profile, error: null }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

export async function restoreSession(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const profile = await getUserById(session.user.id)
  if (profile?.is_blocked) {
    await supabase.auth.signOut()
    return null
  }
  return profile
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

// For viewing someone's PUBLIC profile page (yours or another user's) — goes
// through profiles_public so email never comes along for the ride. Keep
// using getUserById() above only where the id is guaranteed to be the
// caller's own (session bootstrap, login, refreshing your own plan) — those
// still need the full row and still work, since profiles_select_own now
// only matches when auth.uid() = id anyway.
export async function getPublicProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles_public')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return { ...data, email: '', watched_residences: data.watched_residences ?? [] } as Profile
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
.select('*, seller:profiles_public!inner(*)')
    .eq('status', 'active')
    .eq('seller.account_type', 'student')
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

// Business tab on the feed — same listings table, filtered the other way.
// Campus Partner is pinned above Featured, which is pinned above Noticeboard,
// matching the "pinned to top" promise on the pricing page.
export async function getBusinessListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
.select('*, seller:profiles_public!inner(*)')
    .eq('status', 'active')
    .eq('seller.account_type', 'business')
    .order('created_at', { ascending: false })
  if (error || !data) return []

  const sellerIds = [...new Set(data.map((l: any) => l.seller_id))]
  const addressMap: Record<string, { address: string | null; website: string | null }> = {}
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('business_profiles')
      .select('id, physical_address, website')
      .in('id', sellerIds)
    profiles?.forEach(p => {
      addressMap[p.id] = { address: p.physical_address, website: p.website }
    })
  }

  const withAddress = data.map((l: any) => ({
    ...l,
    business_address: addressMap[l.seller_id]?.address ?? null,
    business_website: addressMap[l.seller_id]?.website ?? null,
  }))

  const BUSINESS_PLAN_RANK: Record<string, number> = { campus_partner: 3, featured: 2, noticeboard: 1 }
  const sorted = withAddress.sort(
    (a, b) => (BUSINESS_PLAN_RANK[b.plan_tier] || 0) - (BUSINESS_PLAN_RANK[a.plan_tier] || 0)
  )

  return sorted as Listing[]
}
export async function getListingById(id: string, viewerId?: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, seller:profiles_public(*)')
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

  // Roll the account's plan forward to match what was just used, refreshing
  // its expiry. Guarded by rank so this can never downgrade the account —
  // the UI already blocks picking a lower tier, this is the backstop.
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', payload.sellerId)
    .single()

  const isBusinessTier = (BUSINESS_PLAN_ORDER as string[]).includes(payload.planTier)
  const rankOrder = isBusinessTier ? BUSINESS_PLAN_ORDER : PLAN_ORDER

  const currentRank = profile ? rankOrder.indexOf(profile.plan as PlanKey) : -1
  const currentStillActive = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date()
  const newRank = rankOrder.indexOf(payload.planTier)

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

export async function reportConversation(
  conversationId: string,
  listingId: string,
  reporterId: string,
  reason: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('reports')
    .insert({ conversation_id: conversationId, listing_id: listingId, reporter_id: reporterId, reason })
  return { error: error ? error.message : null }
}

export async function getChatReports(): Promise<ChatReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles_public!reporter_id(full_name),
      conversation:conversations(
        id, is_closed_by_admin,
        listing:listings(title),
        buyer:profiles!buyer_id(id, full_name, email, is_blocked),
        seller:profiles!seller_id(id, full_name, email, is_blocked)
      )
    `)
    .not('conversation_id', 'is', null)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as ChatReport[]
}

export async function setUserBlocked(
  userId: string,
  blocked: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_blocked: blocked })
    .eq('id', userId)
  return { error: error ? error.message : null }
}

export async function endConversationByAdmin(
  conversationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('conversations')
    .update({ is_closed_by_admin: true, closed_at: new Date().toISOString() })
    .eq('id', conversationId)
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
buyer:profiles_public!buyer_id(id, full_name, avatar_initials, avatar_color, plan, account_type),
      seller:profiles_public!seller_id(id, full_name, avatar_initials, avatar_color, plan, account_type),
      messages(id, conversation_id, sender_id, content, read, sent_at)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('sent_at', { ascending: false, foreignTable: 'messages' })
    .limit(1, { foreignTable: 'messages' })

  if (error || !data) return []

  const conversations = data as unknown as (Conversation & { messages?: Message[] })[]

  const convIds = conversations.map(c => c.id)
  const unreadCounts: Record<string, number> = {}
  if (convIds.length > 0) {
    const { data: unread } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('read', false)
      .neq('sender_id', userId)
    unread?.forEach(m => {
      unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1
    })
  }

  // Latest activity = the conversation's most recent message. If nobody has
  // sent a message yet, fall back to when the conversation itself was
  // created so brand-new chats still slot in correctly.
  return conversations
    .map(c => ({ ...c, last_message: c.messages?.[0], unread_count: unreadCounts[c.id] || 0 }))
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
buyer:profiles_public!buyer_id(id, full_name, avatar_initials, avatar_color, plan)
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
   buyer:profiles_public!buyer_id(full_name, avatar_initials, avatar_color)
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

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
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
    .select('*, reporter:profiles_public(full_name)')
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

export interface BusinessProfile {
  id: string
  business_name: string
  business_type: string
  custom_business_type: string | null
  contact_number: string
  physical_address: string | null
  website: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// Businesses register a real account (same auth.users + profiles path as
// students, just tagged account_type: 'business' — see migration 014) so
// they can log in, chat, and get notifications like everyone else. No
// student-domain email restriction applies here, unlike registerWithEmail.
export async function registerBusinessWithEmail(
  email: string,
  password: string,
  businessName: string,
  businessType: string,
  customBusinessType: string | undefined,
  contactNumber: string,
  physicalAddress: string | undefined,
  website: string | undefined,
  refCode?: string
): Promise<{ user: Profile | null; error: string | null }> {
  const initials = businessName
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
        full_name: businessName,
        avatar_initials: initials,
        avatar_color: avatarColor,
        account_type: 'business',
        email,
        ref_code: refCode || null,
      },
    },
  })

  if (error) return { user: null, error: isNetworkError(error.message) ? OFFLINE_MESSAGE : error.message }
  if (!data.user) return { user: null, error: 'Registration failed.' }

  let profile = null
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 600))
    profile = await getUserById(data.user.id)
    if (profile) break
  }
  if (!profile) return { user: null, error: 'Account created but profile is missing. Contact support.' }

const { error: bizError } = await supabase.from('business_profiles').insert({
    id: data.user.id,
    business_name: businessName,
    business_type: businessType,
    custom_business_type: businessType === 'Other' ? customBusinessType || null : null,
    contact_number: contactNumber,
    physical_address: physicalAddress?.trim() || null,
    website: website?.trim() || null,
  })
  if (bizError) return { user: null, error: bizError.message }

  return { user: profile, error: null }
}

export async function getBusinessProfile(id: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as BusinessProfile
}

export async function getPendingBusinesses(): Promise<(BusinessProfile & { profile: Profile })[]> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*, profile:profiles(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as (BusinessProfile & { profile: Profile })[]
}

export async function approveBusinessById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('approve_business', { p_business_id: id })
  return { error: error ? error.message : null }
}

export async function rejectBusinessById(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('reject_business', { p_business_id: id })
  return { error: error ? error.message : null }
}

// ── BUSINESS REVIEWS ─────────────────────────────────────────────────────
// Separate from `ratings` (buyer rates seller after a sale) — any student
// can leave a business a review at any time, no purchase required. Reply
// gating by plan tier is enforced in the database (migration 014
// enforce_review_reply_tier), not just here.

export interface BusinessReview {
  id: string
  business_id: string
  student_id: string
  stars: number
  comment: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
  student?: { full_name: string; avatar_initials: string; avatar_color: string }
}

export async function getBusinessReviews(businessId: string): Promise<BusinessReview[]> {
  const { data, error } = await supabase
    .from('business_reviews')
    .select('*, student:profiles_public!student_id(full_name, avatar_initials, avatar_color)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as BusinessReview[]
}

export async function submitBusinessReview(
  businessId: string,
  studentId: string,
  stars: number,
  comment: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('business_reviews').insert({
    business_id: businessId,
    student_id: studentId,
    stars,
    comment: comment.trim() || null,
  })
  if (error) {
    if (error.message.includes('duplicate key')) return { error: 'You have already reviewed this business.' }
    return { error: error.message }
  }
  return { error: null }
}

// Blocked in the database for anything below Campus Partner — see
// enforce_review_reply_tier in migration 014. The error message here is
// what surfaces if that trigger rejects the update.
export async function replyToBusinessReview(reviewId: string, reply: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('business_reviews')
    .update({ reply: reply.trim() })
    .eq('id', reviewId)
  if (error) {
    if (error.message.includes('Campus Partner')) return { error: 'Replying to reviews requires the Campus Partner plan.' }
    return { error: error.message }
  }
  return { error: null }
}

// ── PERSONAL SPACE (deadlines, schedule, budget, study log, watchlists) ─────

export interface Deadline {
  id: string
  user_id: string
  title: string
  due_at: string
  notes: string | null
  reminded: boolean
  created_at: string
}

export async function getDeadlines(userId: string): Promise<Deadline[]> {
  const { data, error } = await supabase
    .from('deadlines')
    .select('*')
    .eq('user_id', userId)
    .order('due_at', { ascending: true })
  if (error || !data) return []
  return data as Deadline[]
}

export async function createDeadline(
  userId: string, title: string, dueAt: string, notes: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('deadlines').insert({
    user_id: userId, title, due_at: dueAt, notes: notes.trim() || null,
  })
  return { error: error ? error.message : null }
}

export async function deleteDeadline(id: string): Promise<void> {
  await supabase.from('deadlines').delete().eq('id', id)
}

export interface ScheduleEntry {
  id: string
  user_id: string
  day_of_week: number
  start_time: string
  module: string
  room: string | null
  created_at: string
}

export async function getScheduleEntries(userId: string): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
  if (error || !data) return []
  return data as ScheduleEntry[]
}

export async function createScheduleEntry(
  userId: string, dayOfWeek: number, startTime: string, module: string, room: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('schedule_entries').insert({
    user_id: userId, day_of_week: dayOfWeek, start_time: startTime, module, room: room.trim() || null,
  })
  return { error: error ? error.message : null }
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  await supabase.from('schedule_entries').delete().eq('id', id)
}

export interface BudgetEntry {
  id: string
  user_id: string
  amount: number
  direction: 'in' | 'out'
  note: string | null
  created_at: string
}

export async function getBudgetEntries(userId: string): Promise<BudgetEntry[]> {
  const { data, error } = await supabase
    .from('budget_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as BudgetEntry[]
}

export async function createBudgetEntry(
  userId: string, amount: number, direction: 'in' | 'out', note: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('budget_entries').insert({
    user_id: userId, amount, direction, note: note.trim() || null,
  })
  return { error: error ? error.message : null }
}

export async function deleteBudgetEntry(id: string): Promise<void> {
  await supabase.from('budget_entries').delete().eq('id', id)
}

// toISOString() converts to UTC before slicing the date — for a South
// African user (UTC+2), that silently shifts the "day" for 2 hours every
// night. Studying at 00:30 local time would log against yesterday's date
// instead of today's. This builds the date string from the browser's own
// local year/month/day instead, so it matches what the clock on the wall
// actually says.
function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function getStudyMinutesForDate(userId: string, dateStr: string): Promise<number> {
  const { data } = await supabase
    .from('study_log')
    .select('minutes')
    .eq('user_id', userId)
    .eq('log_date', dateStr)
    .maybeSingle()
  return data?.minutes ?? 0
}

export async function getTodayStudyMinutes(userId: string): Promise<number> {
  return getStudyMinutesForDate(userId, localDateString())
}

export async function getYesterdayStudyMinutes(userId: string): Promise<number> {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return getStudyMinutesForDate(userId, localDateString(y))
}

export async function addStudyMinutes(userId: string, minutes: number): Promise<number> {
  const { data, error } = await supabase.rpc('increment_study_minutes', {
    p_log_date: localDateString(),
    p_minutes: minutes,
  })
  if (error) throw error
  return data as number
}

export interface Watchlist {
  id: string
  user_id: string
  keyword: string | null
  category: string | null
  max_price: number | null
  created_at: string
}

export async function getWatchlists(userId: string): Promise<Watchlist[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as Watchlist[]
}

export async function createWatchlist(
  userId: string, keyword: string, category: string, maxPrice: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('watchlists').insert({
    user_id: userId,
    keyword: keyword.trim() || null,
    category: category === 'all' ? null : category || null,
    max_price: maxPrice ? Number(maxPrice) : null,
  })
  return { error: error ? error.message : null }
}

export async function deleteWatchlist(id: string): Promise<void> {
  await supabase.from('watchlists').delete().eq('id', id)
}

// ── STUDY TIMETABLE (weekly courses + per-course lecture prep notes) ────────

export interface StudyCourse {
  id: string
  user_id: string
  day_of_week: number
  course_name: string
  minutes: number
  prepped: boolean
  created_at: string
}

export async function getStudyCourses(userId: string): Promise<StudyCourse[]> {
  const { data, error } = await supabase
    .from('study_timetable_courses')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as StudyCourse[]
}

export async function createStudyCourse(
  userId: string, dayOfWeek: number, courseName: string, minutes: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('study_timetable_courses').insert({
    user_id: userId, day_of_week: dayOfWeek, course_name: courseName, minutes,
  })
  return { error: error ? error.message : null }
}

export async function deleteStudyCourse(id: string): Promise<void> {
  await supabase.from('study_timetable_courses').delete().eq('id', id)
}

export interface StudyPrepNote {
  id: string
  course_id: string
  user_id: string
  focus_topic: string
  resource: string
  goal: string
  clarification_question: string | null
  clarified: boolean
  created_at: string
}

export async function getStudyPrepNotes(userId: string): Promise<StudyPrepNote[]> {
  const { data, error } = await supabase
    .from('study_prep_notes')
    .select('*')
    .eq('user_id', userId)
  if (error || !data) return []
  return data as StudyPrepNote[]
}

export async function createStudyPrepNote(
  userId: string, courseId: string, focusTopic: string, resource: string, goal: string, clarificationQuestion: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('study_prep_notes').insert({
    user_id: userId, course_id: courseId,
    focus_topic: focusTopic.trim(), resource: resource.trim(), goal: goal.trim(),
    clarification_question: clarificationQuestion.trim() || null,
  })
  if (error) return { error: error.message }
  await supabase.from('study_timetable_courses').update({ prepped: true }).eq('id', courseId)
  return { error: null }
}

export async function setStudyPrepClarified(id: string, clarified: boolean): Promise<void> {
  await supabase.from('study_prep_notes').update({ clarified }).eq('id', id)
}

// ── STUDY GROUPS ─────────────────────────────────────────────────────────
// Group chat + a group-scoped deadlines/timetable/schedule set. Separate
// tables from the personal-space ones above (see migration 027) — nothing
// here touches a user's own deadlines/schedule/timetable.

export interface StudyGroup {
  id: string
  name: string
  created_by: string
  avatar_url: string | null
  study_weekdays: number[] | null
  study_hour: number | null
  study_minute: number | null
  created_at: string
}

export interface StudyGroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'creator' | 'member'
  joined_at: string
  last_read_at: string
  profile?: { id: string; full_name: string; avatar_initials: string; avatar_color: string }
}

export interface StudyGroupMessage {
  id: string
  group_id: string
  sender_id: string
  content: string | null
  image_url: string | null
  sent_at: string
  type: 'text' | 'system'
  sender?: { id: string; full_name: string; avatar_initials: string; avatar_color: string }
}

// Groups the current user belongs to (creator or joined member), newest
// activity first isn't available yet without a message join — ordered by
// creation for now.
export async function getStudyGroupsForUser(userId: string): Promise<StudyGroup[]> {
  const { data, error } = await supabase
    .from('study_group_members')
    .select('study_groups(*)')
    .eq('user_id', userId)
  if (error || !data) return []
  return data
    .map((row: any) => row.study_groups)
    .filter(Boolean) as StudyGroup[]
}

export interface StudyGroupWithActivity extends StudyGroup {
  last_message?: StudyGroupMessage
  unread_count: number
}

// Same shape as getConversationsForUser, adapted for groups: latest
// message per group comes from one nested-select query (mirrors the
// conversations/messages foreign-table order+limit trick); unread counts
// are tallied separately because — unlike 1-on-1 messages, which have a
// single shared `read` flag — each group member has their *own*
// last_read_at, so "unread" can't be expressed as one shared .eq() filter.
export async function getStudyGroupsForUserWithActivity(userId: string): Promise<StudyGroupWithActivity[]> {
  const { data: memberRows, error: memberErr } = await supabase
    .from('study_group_members')
    .select('last_read_at, study_groups(*)')
    .eq('user_id', userId)
  if (memberErr || !memberRows) return []

  const membership = memberRows
    .map((row: any) => ({ group: row.study_groups as StudyGroup, lastReadAt: row.last_read_at as string }))
    .filter(m => m.group)
  if (membership.length === 0) return []

  const groupIds = membership.map(m => m.group.id)

  const { data: groupsWithLatest } = await supabase
    .from('study_groups')
    .select('id, study_group_messages(id, group_id, sender_id, content, image_url, sent_at, sender:profiles_public!sender_id(id, full_name, avatar_initials, avatar_color))')
    .in('id', groupIds)
    .order('sent_at', { ascending: false, foreignTable: 'study_group_messages' })
    .limit(1, { foreignTable: 'study_group_messages' })

  const lastMessageByGroup: Record<string, StudyGroupMessage> = {}
  ;(groupsWithLatest || []).forEach((g: any) => {
    if (g.study_group_messages?.[0]) lastMessageByGroup[g.id] = g.study_group_messages[0]
  })

  // Bounded to messages that could possibly be unread by *any* of the
  // user's groups (i.e. after the earliest of their last_read_at values),
  // then each message is checked against its own group's threshold.
  const earliestLastRead = membership.reduce((min, m) => m.lastReadAt < min ? m.lastReadAt : min, membership[0].lastReadAt)
  const { data: candidateMessages } = await supabase
    .from('study_group_messages')
    .select('group_id, sender_id, sent_at')
    .in('group_id', groupIds)
    .neq('sender_id', userId)
    .gte('sent_at', earliestLastRead)

  const unreadCountByGroup: Record<string, number> = {}
  ;(candidateMessages || []).forEach(m => {
    const mem = membership.find(x => x.group.id === m.group_id)
    if (mem && m.sent_at > mem.lastReadAt) {
      unreadCountByGroup[m.group_id] = (unreadCountByGroup[m.group_id] || 0) + 1
    }
  })

  return membership
    .map(({ group }) => ({
      ...group,
      last_message: lastMessageByGroup[group.id],
      unread_count: unreadCountByGroup[group.id] || 0,
    }))
    .sort((a, b) => {
      const aTime = new Date(a.last_message?.sent_at ?? a.created_at).getTime()
      const bTime = new Date(b.last_message?.sent_at ?? b.created_at).getTime()
      return bTime - aTime
    })
}

// Lean version of the above for badge counts — skips the message-content
// and sender-profile fetching entirely since a badge just needs a number.
export async function getUnreadStudyGroupCount(userId: string): Promise<number> {
  const { data: memberRows } = await supabase
    .from('study_group_members')
    .select('group_id, last_read_at')
    .eq('user_id', userId)
  if (!memberRows || memberRows.length === 0) return 0

  const groupIds = memberRows.map(r => r.group_id)
  const earliestLastRead = memberRows.reduce((min, r) => r.last_read_at < min ? r.last_read_at : min, memberRows[0].last_read_at)

  const { data: candidateMessages } = await supabase
    .from('study_group_messages')
    .select('group_id, sender_id, sent_at')
    .in('group_id', groupIds)
    .neq('sender_id', userId)
    .gte('sent_at', earliestLastRead)
  if (!candidateMessages) return 0

  let count = 0
  candidateMessages.forEach(m => {
    const row = memberRows.find(r => r.group_id === m.group_id)
    if (row && m.sent_at > row.last_read_at) count++
  })
  return count
}

// Opening a group's chat (or receiving a live message while already in
// it) is what "reading" it means here — same idea as markMessagesRead for
// 1-on-1 chats, just advancing a cursor instead of flipping per-row flags.
export async function markStudyGroupRead(groupId: string, userId: string): Promise<void> {
  await supabase
    .from('study_group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('user_id', userId)
}

export async function getStudyGroup(groupId: string): Promise<StudyGroup | null> {
  const { data, error } = await supabase
    .from('study_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()
  if (error || !data) return null
  return data as StudyGroup
}

// Renames the group. RLS ("study_groups_update_creator") already rejects
// this for anyone but the group's creator — no need to re-check role here.
export async function updateStudyGroupName(
  groupId: string, name: string
): Promise<{ error: string | null }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Group name cannot be empty.' }
  const { error } = await supabase
    .from('study_groups')
    .update({ name: trimmed })
    .eq('id', groupId)
  return { error: error ? error.message : null }
}

// Uploads to the private study-group-avatars bucket at
// {groupId}/{random}.jpg — always a fresh filename (never overwritten in
// place) so devices with the previous avatar cached on-device (see
// imageCache.ts) fetch the new file instead of showing a stale one. The
// old file is best-effort removed afterwards so storage doesn't grow
// unbounded; a failed cleanup isn't treated as a failed edit.
export async function uploadStudyGroupAvatar(
  groupId: string, file: File, previousPath: string | null
): Promise<{ error: string | null; path: string | null }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Please choose an image file.', path: null }
  }
  const compressed = await compressImageForUpload(file)
  const path = `${groupId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('study-group-avatars')
    .upload(path, compressed, { contentType: 'image/jpeg' })
  if (uploadError) return { error: uploadError.message, path: null }

  const { error } = await supabase
    .from('study_groups')
    .update({ avatar_url: path })
    .eq('id', groupId)
  if (error) return { error: error.message, path: null }

  if (previousPath) {
    await supabase.storage.from('study-group-avatars').remove([previousPath])
  }
  return { error: null, path }
}

// Creator is auto-added as a member by the DB trigger (migration 027) —
// no separate membership insert needed here. studyWeekdays/Hour/Minute is
// only a fallback — the Timetable tab is the real source of truth for
// notifications whenever a group has entries there.
export async function createStudyGroup(
  createdBy: string, name: string,
  studyWeekdays: number[] | null, studyHour: number | null, studyMinute: number | null
): Promise<{ group: StudyGroup | null; error: string | null }> {
  const { data, error } = await supabase
    .from('study_groups')
    .insert({
      name: name.trim(), created_by: createdBy,
      study_weekdays: studyWeekdays, study_hour: studyHour, study_minute: studyMinute,
    })
    .select()
    .single()
  if (error || !data) return { group: null, error: error?.message ?? 'Could not create group.' }
  return { group: data as StudyGroup, error: null }
}
// Joining via invite link = inserting yourself as a member of a group whose
// id came from the link (see migration 027 — no separate invite-token table).
export async function joinStudyGroup(
  groupId: string, userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('study_group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member' })
  // Already a member (unique constraint) isn't a real error for this flow.
  if (error && !error.message.includes('duplicate')) return { error: error.message }
  return { error: null }
}

// Removes the member's own row — RLS (study_group_members_delete_self)
// already only allows deleting your own membership. Once this row is
// gone, getStudyGroupsForUserWithActivity naturally stops returning the
// group (it queries from this same table), and the time-gated message
// policy means rejoining later via the invite link starts a fresh
// joined_at rather than restoring old access.
export async function leaveStudyGroup(
  groupId: string, userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('study_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  return { error: error ? error.message : null }
}

export async function getStudyGroupMembers(groupId: string): Promise<StudyGroupMember[]> {
  const { data, error } = await supabase
    .from('study_group_members')
    .select('*, profile:profiles_public!user_id(id, full_name, avatar_initials, avatar_color)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })
  if (error || !data) return []
  return data as unknown as StudyGroupMember[]
}

export async function getStudyGroupMessages(groupId: string): Promise<StudyGroupMessage[]> {
  const { data, error } = await supabase
    .from('study_group_messages')
    .select('*, sender:profiles_public!sender_id(id, full_name, avatar_initials, avatar_color)')
    .eq('group_id', groupId)
    .order('sent_at', { ascending: true })
  if (error || !data) return []
  return data as unknown as StudyGroupMessage[]
}

export async function sendStudyGroupMessage(
  groupId: string, senderId: string, content: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('study_group_messages')
    .insert({ group_id: groupId, sender_id: senderId, content: content.trim() })
  return { error: error ? error.message : null }
}

// Uploads to the private study-group-images bucket at
// {groupId}/{senderId}/{random}.jpg, then inserts the chat row pointing at
// that storage path. Compression happens here so every caller (gallery
// pick or camera capture) gets it for free.
// Sends the image to the moderate-group-image Edge Function, which checks
// it against Sightengine's nudity model BEFORE writing anything anywhere.
// If it's flagged, the function rejects it and nothing is ever uploaded
// to Storage or inserted as a message — this is what actually enforces
// the block, not just a client-side check that could be bypassed.
export async function sendStudyGroupImage(
  groupId: string, senderId: string, file: File
): Promise<{ error: string | null }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Only images can be shared in group chat.' }
  }
  const compressed = await compressImageForUpload(file)
  const imageBase64 = await fileToBase64(compressed)

  const { error } = await supabase.functions.invoke('moderate-group-image', {
    body: { groupId, imageBase64, fileName: compressed.name },
  })

  if (error) {
    let message = 'Could not send image.'
    try {
      const body = await (error as any).context?.json()
      if (body?.error) message = body.error
    } catch {
      // keep default message
    }
    return { error: message }
  }
  return { error: null }
}
// ── GROUP DEADLINES (mirrors personal `deadlines`, group_id instead of user_id) ──

export interface GroupDeadline {
  id: string
  group_id: string
  created_by: string
  title: string
  due_at: string
  notes: string | null
  reminded: boolean
  created_at: string
}

export async function getGroupDeadlines(groupId: string): Promise<GroupDeadline[]> {
  const { data, error } = await supabase
    .from('study_group_deadlines')
    .select('*')
    .eq('group_id', groupId)
    .order('due_at', { ascending: true })
  if (error || !data) return []
  return data as GroupDeadline[]
}

export async function createGroupDeadline(
  groupId: string, createdBy: string, title: string, dueAt: string, notes: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('study_group_deadlines').insert({
    group_id: groupId, created_by: createdBy, title, due_at: dueAt, notes: notes.trim() || null,
  })
  return { error: error ? error.message : null }
}

export async function deleteGroupDeadline(id: string): Promise<void> {
  await supabase.from('study_group_deadlines').delete().eq('id', id)
}

export interface GroupDeadlineStatus {
  id: string
  deadline_id: string
  group_id: string
  user_id: string
  status: 'pending' | 'done' | 'not_affected'
  responded_at: string | null
  created_at: string
  user?: { full_name: string; avatar_initials: string; avatar_color: string }
}

export async function getGroupDeadlineStatuses(deadlineId: string): Promise<GroupDeadlineStatus[]> {
  const { data, error } = await supabase
    .from('study_group_deadline_status')
    .select('*, user:profiles(full_name, avatar_initials, avatar_color)')
    .eq('deadline_id', deadlineId)
  if (error || !data) return []
  return data as unknown as GroupDeadlineStatus[]
}

export async function respondToGroupDeadline(
  deadlineId: string, userId: string, status: 'done' | 'not_affected'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('study_group_deadline_status')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('deadline_id', deadlineId)
    .eq('user_id', userId)
  return { error: error ? error.message : null }
}

// ── GROUP POMODORO (migration 031) ───────────────────────────────────────
// Deliberately no "is this running" column on the row itself — see the
// migration comment. Every one of these helpers derives state from
// started_at + duration_minutes vs the current time, so it's correct the
// instant anyone opens the panel, regardless of whether their tab was
// open the whole time or not.

export interface StudyGroupPomodoroSession {
  id: string
  group_id: string
  started_by: string
  started_at: string
  duration_minutes: number
  ended_at: string | null
  created_at: string
}

export async function getLatestStudyGroupPomodoroSession(groupId: string): Promise<StudyGroupPomodoroSession | null> {
  const { data, error } = await supabase
    .from('study_group_pomodoro_sessions')
    .select('*')
    .eq('group_id', groupId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data as StudyGroupPomodoroSession | null
}

export async function startStudyGroupPomodoroSession(
  groupId: string, userId: string, durationMinutes: number
): Promise<{ session: StudyGroupPomodoroSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('study_group_pomodoro_sessions')
    .insert({ group_id: groupId, started_by: userId, duration_minutes: durationMinutes })
    .select()
    .single()
  if (error) return { session: null, error: error.message }
  return { session: data as StudyGroupPomodoroSession, error: null }
}

export async function endStudyGroupPomodoroSession(sessionId: string): Promise<void> {
  await supabase
    .from('study_group_pomodoro_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export function isStudyGroupPomodoroActive(session: StudyGroupPomodoroSession | null): boolean {
  if (!session || session.ended_at) return false
  const endsAt = new Date(session.started_at).getTime() + session.duration_minutes * 60000
  return Date.now() < endsAt
}

export function studyGroupPomodoroRemainingSeconds(session: StudyGroupPomodoroSession): number {
  const endsAt = new Date(session.started_at).getTime() + session.duration_minutes * 60000
  return Math.max(0, Math.round((endsAt - Date.now()) / 1000))
}

// ── ONE-TIME ONBOARDING FLAGS (server-side, not localStorage — see
// migration 033 for why) ─────────────────────────────────────────────────

export async function getSeenMySpaceIntro(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_flags')
    .select('seen_myspace_intro')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.seen_myspace_intro ?? false
}

export async function markSeenMySpaceIntro(userId: string): Promise<void> {
  await supabase.from('user_flags').upsert({ user_id: userId, seen_myspace_intro: true })
}

// ── GROUP SCHEDULE (mirrors personal `schedule_entries`) ──────────────────

export interface GroupScheduleEntry {
  id: string
  group_id: string
  created_by: string
  day_of_week: number
  start_time: string
  module: string
  room: string | null
  created_at: string
}

export async function getGroupScheduleEntries(groupId: string): Promise<GroupScheduleEntry[]> {
  const { data, error } = await supabase
    .from('study_group_schedule_entries')
    .select('*')
    .eq('group_id', groupId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })
  if (error || !data) return []
  return data as GroupScheduleEntry[]
}

export async function createGroupScheduleEntry(
  groupId: string, createdBy: string, dayOfWeek: number, startTime: string, module: string, room: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('study_group_schedule_entries').insert({
    group_id: groupId, created_by: createdBy, day_of_week: dayOfWeek, start_time: startTime, module, room: room.trim() || null,
  })
  return { error: error ? error.message : null }
}

export async function deleteGroupScheduleEntry(id: string): Promise<void> {
  await supabase.from('study_group_schedule_entries').delete().eq('id', id)
}

// ── GROUP TIMETABLE (courses + prep notes — mirrors study_timetable_courses
// and study_prep_notes) ────────────────────────────────────────────────────

export interface GroupStudyCourse {
  id: string
  group_id: string
  created_by: string
  day_of_week: number
  course_name: string
  minutes: number
  prepped: boolean
  created_at: string
}

export async function getGroupStudyCourses(groupId: string): Promise<GroupStudyCourse[]> {
  const { data, error } = await supabase
    .from('study_group_timetable_courses')
    .select('*')
    .eq('group_id', groupId)
    .order('day_of_week', { ascending: true })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as GroupStudyCourse[]
}

export async function createGroupStudyCourse(
  groupId: string, createdBy: string, dayOfWeek: number, courseName: string, minutes: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('study_group_timetable_courses').insert({
    group_id: groupId, created_by: createdBy, day_of_week: dayOfWeek, course_name: courseName, minutes,
  })
  return { error: error ? error.message : null }
}

export async function deleteGroupStudyCourse(id: string): Promise<void> {
  await supabase.from('study_group_timetable_courses').delete().eq('id', id)
}

export interface GroupStudyPrepNote {
  id: string
  course_id: string
  group_id: string
  created_by: string
  focus_topic: string
  resource: string
  goal: string
  clarification_question: string | null
  clarified: boolean
  created_at: string
}

export async function getGroupStudyPrepNotes(groupId: string): Promise<GroupStudyPrepNote[]> {
  const { data, error } = await supabase
    .from('study_group_prep_notes')
    .select('*')
    .eq('group_id', groupId)
  if (error || !data) return []
  return data as GroupStudyPrepNote[]
}

export async function createGroupStudyPrepNote(
  groupId: string, createdBy: string, courseId: string, focusTopic: string, resource: string, goal: string, clarificationQuestion: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('study_group_prep_notes').insert({
    group_id: groupId, created_by: createdBy, course_id: courseId,
    focus_topic: focusTopic.trim(), resource: resource.trim(), goal: goal.trim(),
    clarification_question: clarificationQuestion.trim() || null,
  })
  if (error) return { error: error.message }
  await supabase.from('study_group_timetable_courses').update({ prepped: true }).eq('id', courseId)
  return { error: null }
}

export async function setGroupStudyPrepClarified(id: string, clarified: boolean): Promise<void> {
  await supabase.from('study_group_prep_notes').update({ clarified }).eq('id', id)
}


// Naming note: unrelated to the 'campus_partner' plan tier in PLAN_TIERS —
// see the migration comment. This is the referral/affiliate feature.

export interface Partner {
  user_id: string
  referral_code: string
  created_at: string
}

export interface ReferralEvent {
  id: string
  partner_id: string
  referred_user_id: string
  listing_id: string
  plan_tier: PlanKey
  amount: number
  created_at: string
  referred_user?: { full_name: string }
  listing?: { title: string }
}

// Whether the current user is a partner, and their code if so. Called once
// on login/session-restore (see AppContext) so the navbar check is free.
export async function getPartnerStatus(userId: string): Promise<Partner | null> {
  const { data } = await supabase.from('partners').select('*').eq('user_id', userId).maybeSingle()
  return data as Partner | null
}

export async function getReferralCount(partnerId: string): Promise<number> {
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
  return count ?? 0
}

export async function getReferralEvents(partnerId: string): Promise<ReferralEvent[]> {
  const { data, error } = await supabase
    .from('referral_events')
    .select('*, referred_user:profiles!referral_events_referred_user_id_fkey(full_name), listing:listings(title)')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as unknown as ReferralEvent[]
}

export function getEstimatedEarnings(events: ReferralEvent[]): number {
  return events.reduce((sum, e) => sum + Number(e.amount), 0)
}

// ADMIN ONLY below this line — RLS backs every one of these up independently.

export async function getAllPartnersAdmin(): Promise<(Partner & { profile: Profile | null; referredCount: number; totalEarnings: number })[]> {
  const [{ data: partners }, { data: referrals }, { data: events }] = await Promise.all([
    supabase.from('partners').select('*').order('created_at', { ascending: false }),
    supabase.from('referrals').select('partner_id'),
    supabase.from('referral_events').select('partner_id, amount'),
  ])
  if (!partners) return []

  const profiles = await Promise.all(partners.map(p => getUserById(p.user_id)))

  return partners.map((p, i) => ({
    ...(p as Partner),
    profile: profiles[i],
    referredCount: (referrals || []).filter(r => r.partner_id === p.user_id).length,
    totalEarnings: (events || []).filter(e => e.partner_id === p.user_id).reduce((s, e) => s + Number(e.amount), 0),
  }))
}

function generateReferralCode(fullName: string): string {
  const base = fullName.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'PARTNER'
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}-${suffix}`
}

export async function createPartner(userId: string, fullName: string): Promise<{ code: string | null; error: string | null }> {
  const code = generateReferralCode(fullName)
  const { error } = await supabase.from('partners').insert({ user_id: userId, referral_code: code })
  if (error) return { code: null, error: error.message }
  return { code, error: null }
}

export async function removePartner(userId: string): Promise<void> {
  await supabase.from('partners').delete().eq('user_id', userId)
}

export async function searchProfilesByName(query: string): Promise<Profile[]> {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(8)
  if (error || !data) return []
  return data as Profile[]
}

// ── SUGGESTION BOX (Entrance page, admin-only inbox) ─────────────────────

export interface Suggestion {
  id: string
  user_id: string | null
  message: string
  is_read: boolean
  created_at: string
  user?: { full_name: string; email: string } | null
}

export async function submitSuggestion(message: string, userId: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from('suggestions').insert({
    message: message.trim(), user_id: userId,
  })
  return { error: error ? error.message : null }
}

export async function getSuggestionsAdmin(): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*, user:profiles(full_name, email)')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as unknown as Suggestion[]
}

export async function markSuggestionRead(id: string): Promise<void> {
  await supabase.from('suggestions').update({ is_read: true }).eq('id', id)
}
