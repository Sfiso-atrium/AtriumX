// src/data/mockListings.ts
export interface MockListing {
  id: string
  title: string
  description: string
  price: number
  category: string
  imageUrl: string | null
  sellerName: string
  sellerInitials: string
  sellerColor: string
  residence: string
  createdAt: string
  expiresAt: string
  contactCount: number
}

export const MOCK_LISTINGS: MockListing[] = [
  {
    id: '1',
    title: 'Engineering Mathematics 3 Textbook',
    description: 'Kreyszig 10th edition. No writing inside, spine intact. Passing the module so selling.',
    price: 350,
    category: 'textbooks',
    imageUrl: 'https://picsum.photos/seed/book1/400/300',
    sellerName: 'Sipho M',
    sellerInitials: 'SM',
    sellerColor: '#1A5F7A',
    residence: 'Dalrymple House',
    createdAt: '2025-06-01T20:00:00Z',
    expiresAt: '2025-06-08T20:00:00Z',
    contactCount: 4,
  },
  {
    id: '2',
    title: 'Samsung Galaxy A14 Charger',
    description: 'Original charger, barely used. 25W fast charge. Perfect condition.',
    price: 120,
    category: 'electronics',
    imageUrl: 'https://picsum.photos/seed/charger1/400/300',
    sellerName: 'Lerato K',
    sellerInitials: 'LK',
    sellerColor: '#9B59B6',
    residence: 'Jubilee Hall',
    createdAt: '2025-06-02T10:00:00Z',
    expiresAt: '2025-06-09T10:00:00Z',
    contactCount: 7,
  },
  {
    id: '3',
    title: 'Laundry Service — Same Day',
    description: 'Wash, dry and fold. Drop off by 9am, collect by 6pm. R80 per load.',
    price: 80,
    category: 'services',
    imageUrl: null,
    sellerName: 'Amara D',
    sellerInitials: 'AD',
    sellerColor: '#E74C3C',
    residence: 'International House',
    createdAt: '2025-06-03T08:00:00Z',
    expiresAt: '2025-06-10T08:00:00Z',
    contactCount: 12,
  },
  {
    id: '4',
    title: 'Accounting 101 Past Papers 2019-2024',
    description: 'Full set of past papers with memos. Printed and bound. Game changer for exams.',
    price: 60,
    category: 'textbooks',
    imageUrl: 'https://picsum.photos/seed/papers1/400/300',
    sellerName: 'Thabo N',
    sellerInitials: 'TN',
    sellerColor: '#2ECC71',
    residence: 'Knockando Hall',
    createdAt: '2025-06-04T14:00:00Z',
    expiresAt: '2025-06-11T14:00:00Z',
    contactCount: 9,
  },
  {
    id: '5',
    title: 'Late Night Vetkoek — Order by 10pm',
    description: 'Fresh vetkoek with mince or cheese. Delivered to your room. Minimum 2 pieces.',
    price: 15,
    category: 'food',
    imageUrl: 'https://picsum.photos/seed/food1/400/300',
    sellerName: 'Nomsa P',
    sellerInitials: 'NP',
    sellerColor: '#F39C12',
    residence: 'Alan Paton Hall',
    createdAt: '2025-06-05T18:00:00Z',
    expiresAt: '2025-06-12T18:00:00Z',
    contactCount: 23,
  },
  {
    id: '6',
    title: 'Maths Tutoring — First Year',
    description: 'Third year engineering student. Calculus, linear algebra, stats. R100 per hour.',
    price: 100,
    category: 'services',
    imageUrl: null,
    sellerName: 'Kagiso R',
    sellerInitials: 'KR',
    sellerColor: '#3498DB',
    residence: 'Dalrymple House',
    createdAt: '2025-06-05T09:00:00Z',
    expiresAt: '2025-06-12T09:00:00Z',
    contactCount: 5,
  },
]

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'textbooks', label: 'Textbooks' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'food', label: 'Food' },
  { id: 'services', label: 'Services' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'Other' },
]
