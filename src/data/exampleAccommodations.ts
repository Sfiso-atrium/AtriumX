import type { AccommodationListing } from '../services/dataService'

export type ExampleAccommodationListing = AccommodationListing & {
  is_example_listing: true
  chat_locked: true
}

type ExampleBase = Omit<ExampleAccommodationListing, 'address' | 'universities' | 'active_universities'>

const EXAMPLE_ACCOMMODATIONS: ExampleBase[] = [
  {
    id: 'example-campus-house',
    seller_id: null,
    guest_submission: false,
    title: 'Campus House',
    monthly_rent: 3900,
    description: 'Illustrative AtriumX residence profile with furnished rooms, Wi-Fi, laundry, security and dedicated study space. Real accommodation providers appear alongside examples as they join this university.',
    amenities: ['Wi-Fi', 'Laundry', 'Security', 'Study Area'],
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80',
    ],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-department-room-3112-large.mp4',
    building_count: 1,
    building_addresses: [],
    seller_website: null,
    room_pricing: [
      { room_type: 'single', self_funded: 3900, nsfas: 4100, bursary: 4200 },
      { room_type: 'shared_2', self_funded: 3100, nsfas: 3300, bursary: 3400 },
    ],
    plan_tier: 'accommodation_free',
    status: 'active',
    created_at: '2026-10-03T00:00:00.000Z',
    avg_rating: 0,
    total_reviews: 0,
    max_universities: 1,
    reach_paused: false,
    is_example_listing: true,
    chat_locked: true,
  },
  {
    id: 'example-student-lodge',
    seller_id: null,
    guest_submission: false,
    title: 'Student Lodge',
    monthly_rent: 4300,
    description: 'Illustrative AtriumX accommodation profile showing how rooms, facilities, prices and media can be presented to students near their university.',
    amenities: ['Wi-Fi', 'Furnished Rooms', 'Controlled Access', 'Common Room'],
    image_urls: [
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80',
      'https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
    ],
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-room-with-terrace-4029-large.mp4',
    building_count: 1,
    building_addresses: [],
    seller_website: null,
    room_pricing: [
      { room_type: 'single', self_funded: 4300, nsfas: 4500, bursary: 4600 },
      { room_type: 'shared_2', self_funded: 3400, nsfas: 3600, bursary: 3700 },
    ],
    plan_tier: 'accommodation_free',
    status: 'active',
    created_at: '2026-10-03T00:00:00.000Z',
    avg_rating: 0,
    total_reviews: 0,
    max_universities: 1,
    reach_paused: false,
    is_example_listing: true,
    chat_locked: true,
  },
  {
    id: 'example-urban-residence',
    seller_id: null,
    guest_submission: false,
    title: 'Urban Residence',
    monthly_rent: 4700,
    description: 'Illustrative AtriumX residence profile with modern shared spaces, furnished rooms, security and study-friendly facilities. It is shown so a new university marketplace never starts completely empty.',
    amenities: ['Wi-Fi', 'Security', 'Study Space', 'Communal Lounge'],
    image_urls: [
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=1200&q=80',
    ],
    video_url: null,
    building_count: 1,
    building_addresses: [],
    seller_website: null,
    room_pricing: [
      { room_type: 'single', self_funded: 4700, nsfas: 4900, bursary: 5000 },
      { room_type: 'shared_2', self_funded: 3700, nsfas: 3900, bursary: 4000 },
      { room_type: 'shared_3', self_funded: 3300, nsfas: 3500, bursary: 3600 },
    ],
    plan_tier: 'accommodation_free',
    status: 'active',
    created_at: '2026-10-03T00:00:00.000Z',
    avg_rating: 0,
    total_reviews: 0,
    max_universities: 1,
    reach_paused: false,
    is_example_listing: true,
    chat_locked: true,
  },
]

function hydrateExample(base: ExampleBase, university?: string | null): ExampleAccommodationListing {
  return {
    ...base,
    address: university ? `Near ${university}` : 'Near campus',
    universities: university ? [university] : [],
    active_universities: university ? [university] : [],
  }
}

export function getExampleAccommodationListings(university?: string | null): ExampleAccommodationListing[] {
  return EXAMPLE_ACCOMMODATIONS.map(item => hydrateExample(item, university))
}

export function getExampleAccommodationById(id: string, university?: string | null): ExampleAccommodationListing | null {
  const match = EXAMPLE_ACCOMMODATIONS.find(item => item.id === id)
  return match ? hydrateExample(match, university) : null
}

export function isExampleAccommodationListing(listing: AccommodationListing | null | undefined): listing is ExampleAccommodationListing {
  return Boolean(listing && (listing as ExampleAccommodationListing).is_example_listing)
}

export function isExampleAccommodationId(id: string | null | undefined): boolean {
  return Boolean(id && EXAMPLE_ACCOMMODATIONS.some(item => item.id === id))
}
