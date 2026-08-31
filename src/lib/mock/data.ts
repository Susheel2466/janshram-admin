// In-memory mock dataset for the admin panel. Lets the whole UI run standalone
// (no backend) with realistic, mutable data. The real API adapter mirrors this
// shape 1:1, so swapping USE_MOCK=false only changes the transport.

import type {
  User, Category, ProviderProfile, Service, Booking, Tender, Bid, Wallet,
  WalletTransaction, Review, Notification, Coupon, Conversation, ChatMessage,
  AuditLogEntry, BookingStatus, TenderStatus, PaymentMethod, PaymentStatus,
  Address, Favorite, SupportTicket, TicketMessage, TicketStatus, TicketPriority,
  TicketCategory, Payout, OtpLogEntry, Faq, LegalPage, MessageLog,
  AdminContractor, AdminSubscription, AdminSubscriptionPlan,
} from '../types';

const rupees = (r: number) => r * 100;

// Deterministic pseudo-random so seeded data is stable across reloads.
let seed = 20260726;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n: number) => new Date(2026, 6, 26 - n, 9 + Math.floor(rand() * 8), Math.floor(rand() * 60)).toISOString();

export const categories: Category[] = [
  { id: 'c1', name: 'Plumbing', icon: 'Wrench', serviceCount: 45 },
  { id: 'c2', name: 'Electrical', icon: 'Zap', serviceCount: 38 },
  { id: 'c3', name: 'Carpentry', icon: 'Hammer', serviceCount: 52 },
  { id: 'c4', name: 'Cleaning', icon: 'Sparkles', serviceCount: 67 },
  { id: 'c5', name: 'Painting', icon: 'Paintbrush', serviceCount: 41 },
  { id: 'c6', name: 'AC Repair', icon: 'Wind', serviceCount: 33 },
  { id: 'c7', name: 'Renovation', icon: 'Home', serviceCount: 29 },
];

const AVATAR_M = 'https://images.unsplash.com/photo-1615724320397-9d4db10ec2a5?w=200&h=200&fit=crop&auto=format';
const AVATAR_F = 'https://images.unsplash.com/photo-1489514354504-1653aa90e34e?w=200&h=200&fit=crop&auto=format';

const areas = ['Andheri West', 'Bandra West', 'Goregaon East', 'Kurla West', 'Thane West', 'Chembur', 'Powai', 'Malad West', 'Vikhroli', 'Navi Mumbai'];

interface ProviderSeed {
  name: string; cats: string[]; rating: number; reviews: number; exp: number; jobs: number;
  from: number; per: string; area: string; avail: boolean; verified: boolean; badge?: string; phone: string;
  specialties: string[]; bio: string; avatar: string;
}

const providerSeeds: ProviderSeed[] = [
  { name: 'Rajesh Kumar', cats: ['Plumbing'], rating: 4.8, reviews: 234, exp: 10, jobs: 847, from: 500, per: '/hr', area: 'Andheri West', avail: true, verified: true, badge: 'Top Rated', phone: '+91 98765 43210', specialties: ['Pipe Leak Fix', 'Bathroom Fitting', 'Drainage', 'Water Heater'], bio: 'Expert plumber with 10+ years. Licensed & insured.', avatar: AVATAR_M },
  { name: 'Amit Sharma', cats: ['Electrical'], rating: 4.9, reviews: 189, exp: 8, jobs: 620, from: 600, per: '/hr', area: 'Bandra West', avail: true, verified: true, badge: 'Verified Pro', phone: '+91 87654 32109', specialties: ['Wiring', 'MCB/Fuse Box', 'Fan & Light Install', 'CCTV'], bio: 'Certified electrician for residential & commercial work.', avatar: AVATAR_M },
  { name: 'Vikram Singh', cats: ['Carpentry'], rating: 4.7, reviews: 156, exp: 12, jobs: 510, from: 800, per: '/hr', area: 'Goregaon East', avail: true, verified: true, phone: '+91 76543 21098', specialties: ['Furniture', 'Door/Window Fix', 'Modular Kitchen', 'Wardrobe'], bio: 'Custom furniture and woodwork specialist.', avatar: AVATAR_M },
  { name: 'Priya Reddy', cats: ['Cleaning'], rating: 4.9, reviews: 312, exp: 5, jobs: 1200, from: 1200, per: '/visit', area: 'Kurla West', avail: false, verified: true, badge: 'Most Booked', phone: '+91 65432 10987', specialties: ['Deep Clean', 'Sofa Clean', 'Carpet Clean'], bio: 'Professional cleaning with eco-friendly products.', avatar: AVATAR_F },
  { name: 'Suresh Patel', cats: ['Painting'], rating: 4.6, reviews: 198, exp: 15, jobs: 730, from: 450, per: '/hr', area: 'Thane West', avail: true, verified: false, phone: '+91 54321 09876', specialties: ['Interior Paint', 'Exterior Paint', 'Texture', 'Waterproofing'], bio: 'Interior & exterior painting with premium materials.', avatar: AVATAR_M },
  { name: 'Arjun Mehta', cats: ['AC Repair', 'Electrical'], rating: 4.7, reviews: 120, exp: 7, jobs: 390, from: 700, per: '/visit', area: 'Chembur', avail: true, verified: true, phone: '+91 43210 98765', specialties: ['AC Service', 'AC Gas Refill', 'AC Installation'], bio: 'Expert AC repair & servicing for all brands.', avatar: AVATAR_M },
  { name: 'Deepak Nair', cats: ['Renovation', 'Carpentry', 'Painting'], rating: 4.8, reviews: 87, exp: 18, jobs: 284, from: 2500, per: '/day', area: 'Powai', avail: true, verified: true, badge: 'Premium', phone: '+91 32109 87654', specialties: ['Full Renovation', 'False Ceiling', 'Tiling'], bio: 'Full-service renovation contractor.', avatar: AVATAR_M },
  { name: 'Kavita Joshi', cats: ['Cleaning', 'Plumbing'], rating: 4.5, reviews: 90, exp: 3, jobs: 280, from: 999, per: '/visit', area: 'Malad West', avail: true, verified: false, phone: '+91 21098 76543', specialties: ['Home Cleaning', 'Kitchen Deep Clean'], bio: 'Affordable and thorough home cleaning.', avatar: AVATAR_F },
  { name: 'Santosh Yadav', cats: ['Plumbing', 'Renovation'], rating: 4.6, reviews: 143, exp: 9, jobs: 460, from: 550, per: '/hr', area: 'Vikhroli', avail: false, verified: true, phone: '+91 10987 65432', specialties: ['Overhead Tank', 'Bore Well', 'Pipeline'], bio: 'Senior plumber with tank & bore well expertise.', avatar: AVATAR_M },
  { name: 'Mohan Pillai', cats: ['Electrical'], rating: 4.4, reviews: 67, exp: 4, jobs: 210, from: 500, per: '/hr', area: 'Navi Mumbai', avail: true, verified: false, phone: '+91 09876 54321', specialties: ['Switches & Sockets', 'Earthing', 'LED Fitting'], bio: 'Electrical work for homes and shops.', avatar: AVATAR_M },
];

const catByName = (n: string) => categories.find((c) => c.name === n)!;

export const users: User[] = [];
export const providers: ProviderProfile[] = [];
export const wallets: Wallet[] = [];

// Build provider users + profiles.
providerSeeds.forEach((s, i) => {
  const userId = `u_p${i + 1}`;
  const providerId = `p${i + 1}`;
  const user: User = {
    id: userId,
    phone: s.phone,
    name: s.name,
    email: `${s.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    role: 'PROVIDER',
    avatar: s.avatar,
    city: 'Mumbai',
    area: s.area,
    lat: 19 + rand() * 0.2,
    lng: 72.8 + rand() * 0.2,
    referralCode: `SEVA${1000 + i}`,
    isActive: true,
    notifyBookings: true, notifyPromotions: false, notifyReminders: true, notifyChat: true,
    createdAt: daysAgo(120 - i * 8),
    updatedAt: daysAgo(i),
  };
  const profile: ProviderProfile = {
    id: providerId,
    userId,
    bio: s.bio,
    experience: s.exp,
    completedJobs: s.jobs,
    priceFrom: rupees(s.from),
    pricePer: s.per,
    rating: s.rating,
    reviewCount: s.reviews,
    isAvailable: s.avail,
    isVerified: s.verified,
    badge: s.badge ?? null,
    specialties: s.specialties,
    businessName: `${s.name.split(' ')[0]} Services`,
    businessType: pick(['Individual', 'Registered Firm', 'Sole Proprietor']),
    aadhaar: `${2000 + i}-${3000 + i}-${4000 + i}`,
    pan: `ABCPK${1000 + i}Z`,
    gstin: s.verified && rand() > 0.5 ? `27ABCPK${1000 + i}Z1Z5` : null,
    // Verified providers have reviewed docs; unverified ones have docs pending review.
    documents: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop&auto=format',
    ],
    lat: user.lat, lng: user.lng, city: 'Mumbai', area: s.area,
    createdAt: user.createdAt,
    user: { id: userId, name: s.name, avatar: s.avatar, phone: s.phone, email: user.email, isActive: user.isActive },
    categories: s.cats.map(catByName),
    totalEarnedPaise: rupees(s.jobs * (s.from + Math.floor(rand() * 400))),
    activeBookings: Math.floor(rand() * 5),
  };
  user.providerProfile = profile;
  providers.push(profile);
  users.push(user);
});

// Build customer users.
const customerNames = ['Anjali Gupta', 'Rohan Desai', 'Sneha Iyer', 'Karan Malhotra', 'Pooja Shah', 'Vivek Rao', 'Meera Nambiar', 'Aditya Verma', 'Divya Menon', 'Nikhil Bose', 'Shreya Kapoor', 'Manish Agarwal', 'Ritu Chauhan', 'Sanjay Dubey', 'Farah Khan', 'Gaurav Sethi', ' Isha Pandey', 'Tarun Bhatt', 'Lakshmi Nair', 'Varun Saxena'];
customerNames.forEach((name, i) => {
  const id = `u_c${i + 1}`;
  users.push({
    id,
    phone: `+91 9${(800000000 + i * 111111).toString().slice(0, 9)}`,
    name: name.trim(),
    email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
    role: 'CUSTOMER',
    avatar: i % 2 === 0 ? AVATAR_F : AVATAR_M,
    city: 'Mumbai',
    area: pick(areas),
    lat: 19 + rand() * 0.2, lng: 72.8 + rand() * 0.2,
    referralCode: `SEVA${2000 + i}`,
    isActive: rand() > 0.08,
    notifyBookings: true, notifyPromotions: rand() > 0.5, notifyReminders: true, notifyChat: true,
    createdAt: daysAgo(100 - i * 4),
    updatedAt: daysAgo(i),
    bookingsCount: Math.floor(rand() * 15),
    totalSpentPaise: rupees(Math.floor(rand() * 40000)),
  });
});

// Wallets for everyone.
users.forEach((u) => {
  const balance = rupees(Math.floor(rand() * 5000));
  wallets.push({
    id: `w_${u.id}`,
    userId: u.id,
    balance,
    user: { id: u.id, name: u.name, phone: u.phone, avatar: u.avatar },
    transactions: [],
  });
});

// Services (one+ per provider).
export const services: Service[] = [];
const serviceTitles: Record<string, string[]> = {
  Plumbing: ['Professional Plumbing Service', 'Emergency Leak Repair'],
  Electrical: ['Electrical Installation & Repair', 'Wiring & Safety Check'],
  Carpentry: ['Custom Carpentry Work', 'Modular Kitchen Fitting'],
  Cleaning: ['Deep Home Cleaning Service', 'Sofa & Carpet Cleaning'],
  Painting: ['Interior & Exterior Painting', 'Waterproofing & Texture'],
  'AC Repair': ['AC Repair & Servicing', 'AC Installation'],
  Renovation: ['Complete Home Renovation', 'False Ceiling & Tiling'],
};
const SERVICE_IMG = 'https://images.unsplash.com/photo-1581578949510-fa7315c4c350?w=600&h=400&fit=crop&auto=format';
let sIdx = 1;
providers.forEach((p) => {
  p.categories!.forEach((cat) => {
    const titles = serviceTitles[cat.name] ?? ['General Service'];
    const title = pick(titles);
    services.push({
      id: `s${sIdx++}`,
      title,
      description: `${title} by ${p.user!.name}. Reliable and professional.`,
      price: p.priceFrom,
      priceUnit: p.pricePer === '/hr' ? '/hour' : p.pricePer,
      image: SERVICE_IMG,
      rating: p.rating,
      reviewCount: Math.floor(p.reviewCount / (p.categories!.length || 1)),
      createdAt: p.createdAt,
      categoryId: cat.id,
      category: cat,
      providerId: p.id,
      provider: p,
    });
  });
});

// Bookings.
export const bookings: Booking[] = [];
const statuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
const payMethods: PaymentMethod[] = ['UPI', 'CARD', 'WALLET', 'CASH'];
const customers = users.filter((u) => u.role === 'CUSTOMER');
for (let i = 0; i < 60; i++) {
  const svc = pick(services);
  const cust = pick(customers);
  const status = pick(statuses);
  const paid: PaymentStatus = status === 'CANCELLED' ? (rand() > 0.5 ? 'REFUNDED' : 'FAILED') : status === 'PENDING' ? 'PENDING' : 'PAID';
  const created = daysAgo(Math.floor(rand() * 45));
  bookings.push({
    id: `b${i + 1}`,
    ref: 100000 + i,
    status,
    scheduledAt: daysAgo(Math.floor(rand() * 30) - 5),
    address: `${Math.floor(rand() * 300)}, ${pick(areas)}, Mumbai`,
    notes: rand() > 0.6 ? 'Please call before arriving.' : null,
    photos: [],
    amount: svc.price,
    discount: rand() > 0.7 ? rupees(100) : 0,
    couponCode: rand() > 0.7 ? 'FIRST100' : null,
    paymentMethod: pick(payMethods),
    paymentStatus: paid,
    cancelledAt: status === 'CANCELLED' ? created : null,
    cancelReason: status === 'CANCELLED' ? pick(['Customer unavailable', 'Provider cancelled', 'Rescheduled']) : null,
    completedAt: status === 'COMPLETED' ? created : null,
    createdAt: created,
    customerId: cust.id,
    providerId: svc.providerId,
    serviceId: svc.id,
    service: svc,
    provider: svc.provider,
    customer: { id: cust.id, name: cust.name, avatar: cust.avatar, phone: cust.phone },
  });
}

// Tenders + bids.
export const tenders: Tender[] = [];
export const bids: Bid[] = [];
const tenderTitles = ['3BHK Full Interior Renovation', 'Office Electrical Rewiring', 'Terrace Waterproofing', 'Modular Kitchen Setup', 'Bungalow Exterior Painting', 'Bathroom Remodel (2 units)', 'Commercial AC Installation', 'Society Plumbing Overhaul'];
const tenderStatuses: TenderStatus[] = ['OPEN', 'OPEN', 'OPEN', 'AWARDED', 'CLOSED', 'CANCELLED'];
tenderTitles.forEach((title, i) => {
  const cust = pick(customers);
  const status = tenderStatuses[i % tenderStatuses.length];
  const min = rupees(20000 + Math.floor(rand() * 30000));
  const t: Tender = {
    id: `t${i + 1}`,
    title,
    description: `Looking for an experienced professional for: ${title}. Serious bidders only, must provide references.`,
    category: pick(categories).name,
    budgetMin: min,
    budgetMax: min + rupees(20000 + Math.floor(rand() * 40000)),
    timeline: pick(['1 week', '2 weeks', '1 month', 'Flexible']),
    urgency: pick(['LOW', 'MEDIUM', 'HIGH'] as const),
    city: 'Mumbai', area: pick(areas),
    attachments: [],
    status,
    createdAt: daysAgo(Math.floor(rand() * 40)),
    customerId: cust.id,
    customer: { id: cust.id, name: cust.name, avatar: cust.avatar, phone: cust.phone },
    bids: [],
    _count: { bids: 0 },
  };
  const nBids = 1 + Math.floor(rand() * 4);
  for (let b = 0; b < nBids; b++) {
    const prov = pick(providers);
    const bid: Bid = {
      id: `bid_${t.id}_${b}`,
      amount: t.budgetMin + Math.floor(rand() * (t.budgetMax - t.budgetMin)),
      message: 'I can complete this on time with quality materials.',
      timeline: pick(['1 week', '2 weeks', '10 days']),
      status: status === 'AWARDED' && b === 0 ? 'ACCEPTED' : 'PENDING',
      createdAt: t.createdAt,
      tenderId: t.id,
      providerId: prov.id,
      provider: prov,
    };
    bids.push(bid);
    t.bids!.push(bid);
  }
  t._count = { bids: t.bids!.length };
  tenders.push(t);
});

// Wallet transactions.
export const walletTransactions: WalletTransaction[] = [];
wallets.forEach((w) => {
  const owner = users.find((u) => u.id === w.userId)!;
  let running = 0;
  const n = Math.floor(rand() * 6);
  for (let i = 0; i < n; i++) {
    const isCredit = rand() > 0.4;
    const amount = rupees(100 + Math.floor(rand() * 2000));
    running += isCredit ? amount : -amount;
    if (running < 0) running = amount;
    const txn: WalletTransaction = {
      id: `wt_${w.id}_${i}`,
      type: isCredit ? 'CREDIT' : 'DEBIT',
      amount,
      balanceAfter: running,
      description: isCredit ? pick(['Wallet top-up', 'Refund', 'Referral bonus']) : pick(['Booking payment', 'Service charge']),
      createdAt: daysAgo(Math.floor(rand() * 40)),
      walletId: w.id,
      user: { id: owner.id, name: owner.name, phone: owner.phone },
    };
    walletTransactions.push(txn);
    w.transactions!.push(txn);
  }
  w.balance = running;
});

// Reviews.
export const reviews: Review[] = [];
const reviewComments = ['Excellent work, very professional!', 'On time and clean. Recommended.', 'Good service but slightly expensive.', 'Fixed the issue quickly. Thanks!', 'Average experience.', 'Outstanding, will book again.', 'Rude behaviour, not satisfied.', 'Great value for money.'];
bookings.filter((b) => b.status === 'COMPLETED').forEach((b, i) => {
  if (rand() > 0.3) {
    const r: Review = {
      id: `r${i + 1}`,
      rating: 3 + Math.floor(rand() * 3),
      comment: pick(reviewComments),
      createdAt: b.completedAt!,
      authorId: b.customerId,
      providerId: b.providerId,
      bookingId: b.id,
      hidden: rand() > 0.9,
      author: b.customer,
      provider: { id: b.providerId, user: b.provider?.user },
    };
    reviews.push(r);
    b.review = r;
  }
});

// Coupons.
export const coupons: Coupon[] = [
  { id: 'cp1', code: 'FIRST100', description: '₹100 off your first booking', discountType: 'FLAT', discountValue: rupees(100), maxDiscount: null, minOrder: rupees(500), active: true, expiresAt: daysAgo(-60), createdAt: daysAgo(90), redemptions: 342 },
  { id: 'cp2', code: 'MONSOON20', description: '20% off, up to ₹300', discountType: 'PERCENT', discountValue: 20, maxDiscount: rupees(300), minOrder: rupees(800), active: true, expiresAt: daysAgo(-30), createdAt: daysAgo(20), redemptions: 128 },
  { id: 'cp3', code: 'CLEAN50', description: '₹50 off cleaning services', discountType: 'FLAT', discountValue: rupees(50), maxDiscount: null, minOrder: rupees(400), active: false, expiresAt: daysAgo(10), createdAt: daysAgo(70), redemptions: 89 },
  { id: 'cp4', code: 'WELCOME15', description: '15% off for new users', discountType: 'PERCENT', discountValue: 15, maxDiscount: rupees(250), minOrder: rupees(600), active: true, expiresAt: null, createdAt: daysAgo(45), redemptions: 210 },
];

// Help-centre FAQs. Seeded as ALL (shown to both apps) plus a couple of
// role-scoped entries so the audience filter is visible in the console.
export const faqs: Faq[] = [
  { id: 'f1', question: 'How do I book a service?', answer: 'Browse services, select a provider, choose date & time, and proceed to payment. You will receive a confirmation once the booking is complete.', audience: 'ALL', order: 1, isActive: true, createdAt: daysAgo(60), updatedAt: daysAgo(60) },
  { id: 'f2', question: 'Can I cancel or reschedule a booking?', answer: 'Yes, you can cancel or reschedule up to 2 hours before the scheduled time. Go to My Bookings and select the booking you want to modify.', audience: 'CUSTOMER', order: 2, isActive: true, createdAt: daysAgo(60), updatedAt: daysAgo(30) },
  { id: 'f3', question: 'What payment methods are accepted?', answer: 'We accept UPI, Credit/Debit Cards, Wallet, and Cash on Service. All online payments are 100% secure.', audience: 'ALL', order: 3, isActive: true, createdAt: daysAgo(55), updatedAt: daysAgo(55) },
  { id: 'f4', question: 'How do I add money to my wallet?', answer: 'Go to Wallet section from your profile, click "Add Money", enter amount and complete payment using your preferred method.', audience: 'ALL', order: 4, isActive: true, createdAt: daysAgo(50), updatedAt: daysAgo(50) },
  { id: 'f5', question: 'Are service providers verified?', answer: 'Yes, all service providers undergo background verification and skill assessment before being listed on our platform.', audience: 'CUSTOMER', order: 5, isActive: true, createdAt: daysAgo(45), updatedAt: daysAgo(45) },
  { id: 'f6', question: 'How do I raise a complaint?', answer: 'You can raise a complaint through the Help & Support section or contact our customer care directly. We aim to resolve all issues within 24 hours.', audience: 'ALL', order: 6, isActive: true, createdAt: daysAgo(40), updatedAt: daysAgo(40) },
  { id: 'f7', question: 'How do I get my provider profile verified?', answer: 'Upload your ID and address proof from Profile → Verification. Our team reviews submissions within 48 hours and you will be notified once approved.', audience: 'PROVIDER', order: 7, isActive: true, createdAt: daysAgo(35), updatedAt: daysAgo(35) },
  { id: 'f8', question: 'How do I withdraw my earnings?', answer: 'Open Earnings → Withdraw, choose an amount and confirm. Payouts are processed to your registered bank account.', audience: 'PROVIDER', order: 8, isActive: false, createdAt: daysAgo(30), updatedAt: daysAgo(5) },
];

// Legal documents behind the apps' Help & Support "Quick Links". Content here
// is abridged — the real copy lives in the database and is edited in the
// console; these exist so mock mode renders a realistic screen.
export const legalPages: LegalPage[] = [
  {
    id: 'lp1',
    slug: 'terms',
    title: 'Terms & Conditions',
    content: `## Acceptance of terms\nBy creating a JanShram account or booking a service through the platform, you agree to these terms.\n\n## Our role\nJanShram is a marketplace that connects customers with independent service providers.\n\n## Bookings and payments\n- Prices shown at checkout include the service charge, platform fee and applicable GST.\n- A booking can be cancelled or rescheduled as described in the Refund Policy.`,
    order: 1,
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(14),
  },
  {
    id: 'lp2',
    slug: 'privacy',
    title: 'Privacy Policy',
    content: `## What we collect\n- Account details: name, phone number, email and profile photo.\n- Location, when you share it, so we can show nearby providers.\n\n## How we use it\nTo operate the service, keep the platform safe, and send booking updates.\n\n## Your choices\nYou can edit your profile, control notification preferences, and request account deletion from Settings.`,
    order: 2,
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(14),
  },
  {
    id: 'lp3',
    slug: 'refund',
    title: 'Refund Policy',
    content: `## Cancellations\n- Cancel more than 2 hours before the slot: full refund.\n- Cancel within 2 hours: the platform fee may be retained.\n\n## Refund timelines\nOnline payments are returned to the original payment method within 5–7 working days.`,
    order: 3,
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(40),
  },
  {
    id: 'lp4',
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    content: `## Respect comes first\nCustomers and providers are expected to communicate politely.\n\n## Honest listings and reviews\nReviews must reflect a real, completed booking.\n\n## Reporting\nUse Help & Support to report anything that breaks these guidelines.`,
    order: 4,
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(60),
  },
];

// Notifications (broadcast history / recent per-user).
export const notifications: Notification[] = [
  { id: 'n1', type: 'SYSTEM', title: 'Monsoon Sale Live!', body: 'Flat 20% off on all cleaning services this week.', read: false, createdAt: daysAgo(1) },
  { id: 'n2', type: 'SYSTEM', title: 'App Update', body: 'New in-app chat is now available.', read: true, createdAt: daysAgo(5) },
  { id: 'n3', type: 'SYSTEM', title: 'Refer & Earn', body: 'Invite friends and earn ₹100 wallet credit.', read: true, createdAt: daysAgo(12) },
];

// Conversations (support view).
export const conversations: Conversation[] = [];
for (let i = 0; i < 8; i++) {
  const cust = pick(customers);
  const prov = pick(providers);
  const msgs: ChatMessage[] = [];
  const nMsg = 2 + Math.floor(rand() * 5);
  for (let m = 0; m < nMsg; m++) {
    msgs.push({
      id: `cm_${i}_${m}`,
      conversationId: `conv${i + 1}`,
      senderId: m % 2 === 0 ? cust.id : prov.userId,
      body: pick(['Hi, are you available tomorrow?', 'Yes, what time works for you?', 'Around 10 AM.', 'Sure, confirmed.', 'What is the estimated cost?', 'Depends on the work, I will assess on site.']),
      createdAt: daysAgo(Math.floor(rand() * 10)),
    });
  }
  conversations.push({
    id: `conv${i + 1}`,
    providerId: prov.id,
    customerId: cust.id,
    createdAt: daysAgo(15),
    updatedAt: msgs[msgs.length - 1].createdAt,
    provider: prov,
    customer: { id: cust.id, name: cust.name, avatar: cust.avatar },
    messages: msgs,
    lastMessage: msgs[msgs.length - 1],
    messageCount: msgs.length,
  });
}

// Audit log.
export const auditLog: AuditLogEntry[] = [
  { id: 'a1', actor: 'Admin', action: 'Verified provider', target: 'Amit Sharma', createdAt: daysAgo(0) },
  { id: 'a2', actor: 'Admin', action: 'Refunded booking', target: '#b12 — ₹1,200', createdAt: daysAgo(0) },
  { id: 'a3', actor: 'Admin', action: 'Deactivated user', target: 'Farah Khan', createdAt: daysAgo(1) },
  { id: 'a4', actor: 'Admin', action: 'Created coupon', target: 'MONSOON20', createdAt: daysAgo(1) },
  { id: 'a5', actor: 'Admin', action: 'Hid review', target: '#r7 (1★)', createdAt: daysAgo(2) },
  { id: 'a6', actor: 'Admin', action: 'Added category', target: 'Renovation', createdAt: daysAgo(3) },
];

// Saved addresses, keyed by customer user id.
export const addressesByUser: Record<string, Address[]> = {};
customers.forEach((c, i) => {
  const n = 1 + Math.floor(rand() * 2);
  addressesByUser[c.id] = Array.from({ length: n }, (_, k) => ({
    id: `addr_${c.id}_${k}`,
    label: k === 0 ? 'Home' : pick(['Office', 'Other']),
    line: `${Math.floor(rand() * 300)}, ${pick(['Sunrise Apts', 'Green Residency', 'Palm Court', 'Lake View'])}, ${c.area}`,
    city: 'Mumbai',
    pincode: `4000${(10 + i) % 90}`,
    lat: c.lat, lng: c.lng,
    isDefault: k === 0,
    createdAt: daysAgo(80 - i),
  }));
});

// Favorites, keyed by customer user id.
export const favoritesByUser: Record<string, Favorite[]> = {};
customers.forEach((c) => {
  const n = Math.floor(rand() * 4);
  const picked = new Set<string>();
  favoritesByUser[c.id] = Array.from({ length: n }, (_, k) => {
    let prov = pick(providers);
    let guard = 0;
    while (picked.has(prov.id) && guard++ < 5) prov = pick(providers);
    picked.add(prov.id);
    return { id: `fav_${c.id}_${k}`, createdAt: daysAgo(Math.floor(rand() * 60)), provider: prov };
  });
});

// Support tickets.
export const tickets: SupportTicket[] = [];
const ticketSeeds: {
  subject: string; category: TicketCategory; priority: TicketPriority; status: TicketStatus; msgs: [string, boolean][];
}[] = [
  { subject: 'Refund not received for cancelled booking', category: 'REFUND', priority: 'HIGH', status: 'OPEN', msgs: [['I cancelled my plumbing booking 3 days ago but the ₹500 refund has not reached my wallet yet.', false]] },
  { subject: 'Provider did not show up', category: 'BOOKING', priority: 'URGENT', status: 'IN_PROGRESS', msgs: [['The electrician confirmed for 10 AM never arrived and is not answering calls.', false], ['Sorry to hear that — we are contacting the provider now and will arrange a replacement.', true]] },
  { subject: 'How do I change my registered mobile number?', category: 'ACCOUNT', priority: 'LOW', status: 'WAITING', msgs: [['I got a new SIM and want to update my number on the app.', false], ['You can update it under Profile → Edit Profile. Could you confirm your current registered number?', true]] },
  { subject: 'App crashes on payment screen', category: 'TECHNICAL', priority: 'MEDIUM', status: 'RESOLVED', msgs: [['Every time I try to pay via UPI the app closes itself.', false], ['This was a known issue fixed in the latest update — please update the app.', true], ['Working now, thanks!', false]] },
  { subject: 'Provider was rude and left early', category: 'PROVIDER', priority: 'HIGH', status: 'OPEN', msgs: [['The cleaner left after 30 minutes and was very rude when I asked about it.', false]] },
  { subject: 'Charged twice for one booking', category: 'PAYMENT', priority: 'URGENT', status: 'IN_PROGRESS', msgs: [['My card was charged ₹1,200 twice for the same AC service booking.', false], ['We have located the duplicate charge and initiated a reversal — it will reflect in 5-7 days.', true]] },
  { subject: 'Cannot apply coupon code', category: 'OTHER', priority: 'LOW', status: 'CLOSED', msgs: [['MONSOON20 says invalid at checkout.', false], ['That coupon expired on 30 June. FIRST100 is still active.', true]] },
];
ticketSeeds.forEach((t, i) => {
  const cust = customers[i % customers.length];
  const admin = { id: 'admin1', name: 'Platform Admin', avatar: null };
  const baseDay = 10 - i;
  const messages: TicketMessage[] = t.msgs.map((m, k) => ({
    id: `tm_${i}_${k}`,
    ticketId: `tk${i + 1}`,
    senderId: m[1] ? admin.id : cust.id,
    fromAdmin: m[1],
    body: m[0],
    createdAt: daysAgo(baseDay - k * 0.2),
    sender: m[1] ? admin : { id: cust.id, name: cust.name, avatar: cust.avatar },
  }));
  const last = messages[messages.length - 1];
  tickets.push({
    id: `tk${i + 1}`,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    requesterId: cust.id,
    assigneeId: t.msgs.some((m) => m[1]) ? admin.id : null,
    bookingId: null,
    createdAt: daysAgo(baseDay),
    updatedAt: last.createdAt,
    resolvedAt: t.status === 'RESOLVED' || t.status === 'CLOSED' ? last.createdAt : null,
    closedAt: t.status === 'CLOSED' ? last.createdAt : null,
    lastReplyAt: last.createdAt,
    requester: { id: cust.id, name: cust.name, avatar: cust.avatar, phone: cust.phone, email: cust.email, role: 'CUSTOMER' },
    assignee: t.msgs.some((m) => m[1]) ? { id: admin.id, name: admin.name } : null,
    booking: null,
    messages,
    _count: { messages: messages.length },
  });
});

// Provider payouts (withdrawal requests).
export const payouts: Payout[] = providers.slice(0, 5).map((p, i) => {
  const status = (['REQUESTED', 'REQUESTED', 'PAID', 'REJECTED', 'REQUESTED'] as const)[i];
  return {
    id: `po${i + 1}`,
    amount: rupees(2000 + i * 1500),
    upiId: `${(p.user?.name ?? 'provider').split(' ')[0].toLowerCase()}@upi`,
    status,
    note: null,
    createdAt: daysAgo(i + 1),
    processedAt: status === 'REQUESTED' ? null : daysAgo(i),
    provider: { id: p.userId, name: p.user?.name ?? null, phone: p.user?.phone ?? '', avatar: p.user?.avatar ?? null },
  };
});

// OTP / login attempt logs.
export const otpLogs: OtpLogEntry[] = users.slice(0, 14).map((u, i) => {
  const consumed = i % 3 !== 0;
  const expired = !consumed && i % 2 === 0;
  return {
    id: `otp${i + 1}`,
    phone: (u.phone || '').replace(/\D/g, '').slice(-10),
    consumed,
    expired,
    expiresAt: daysAgo(-0.007 * i),
    createdAt: daysAgo(i * 0.5),
    userName: u.name,
    userRole: u.role,
  };
});

// Outbound SMS / WhatsApp delivery log. Mirrors what the backend records for
// every alert: the sends, the failures, and the skips with their reason.
export const messageLogs: MessageLog[] = users.slice(0, 9).flatMap((u, i) => {
  const event = (
    ['booking.confirmed', 'booking.created.provider', 'chat.message', 'payment.received.customer', 'booking.reminder.customer'] as const
  )[i % 5];
  const body = {
    'booking.confirmed': 'Booking #4F9A2C confirmed. Aman will arrive on 12 Aug 2026, 4:00 pm for Deep Cleaning.',
    'booking.created.provider': 'New booking #7B1D0E: Pipe Repair for Priya Sharma on 13 Aug 2026, 11:00 am. Amount ₹850.',
    'chat.message': 'Priya Sharma sent you a message on JanShram: "Are you free on Monday?". Open the app to reply.',
    'payment.received.customer': 'Payment of ₹1,200 received for booking #22C8A1. Thank you — JanShram.',
    'booking.reminder.customer': 'Reminder: Aman is due on 12 Aug 2026, 4:00 pm for Deep Cleaning, booking #4F9A2C.',
  }[event];
  // Two rows per alert — one per channel — with the odd failure and skip.
  const failed = i === 2;
  const skipped = i === 5;
  return (['SMS', 'WHATSAPP'] as const).map((channel, c) => ({
    id: `ml${i}${c}`,
    channel,
    status: failed ? ('FAILED' as const) : skipped ? ('SKIPPED' as const) : ('SENT' as const),
    to: (u.phone || '').replace(/\D/g, '').slice(-10),
    event,
    refId: `bk${i}`,
    body,
    error: failed
      ? 'HTTP 400: invalid recipient number'
      : skipped
        ? 'User opted out (notifyBookings)'
        : null,
    userId: u.id,
    createdAt: daysAgo(i * 0.3),
    user: { id: u.id, name: u.name, phone: u.phone, role: u.role },
  }));
});

// ── Contractors & subscriptions ─────────────────────────────────────────────
//
// Seeded like the rest so the console runs standalone. The mix is chosen to
// exercise the states the screens actually branch on rather than to look busy:
// one verified firm on a paid plan, one waiting with documents in, one on trial
// with nothing submitted, and one suspended.

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const subscriptionPlans: AdminSubscriptionPlan[] = [
  { id: 'plan_weekly', code: 'weekly', name: 'Weekly Plan', priceRupees: 99, durationDays: 7, isActive: true, order: 1 },
  { id: 'plan_monthly', code: 'monthly', name: 'Monthly Plan', priceRupees: 299, durationDays: 30, isActive: true, order: 2 },
];

const contractorSeeds = [
  {
    id: 'c1', firm: 'Sharma Construction', type: 'Proprietorship', name: 'Rajesh Sharma',
    phone: '+91 98765 43210', city: 'Gaya', area: 'Tilouthu', verified: true, projects: 4,
    pan: 'ABCPZ1234K', aadhaar: 'XXXXXXXX4521', gstin: '10ABCPZ1234K1Z5',
    sub: { status: 'ACTIVE' as const, plan: 'Monthly Plan', expires: days(22) },
  },
  {
    // Waiting, with documents in — the queue's whole purpose.
    id: 'c2', firm: 'Verma Builders', type: 'Partnership', name: 'Anil Verma',
    phone: '+91 91234 56780', city: 'Patna', area: 'Kankarbagh', verified: false, projects: 1,
    pan: 'AAFCV5678M', aadhaar: 'XXXXXXXX9087', gstin: null,
    sub: { status: 'TRIAL' as const, plan: null, expires: days(3) },
  },
  {
    // On trial, nothing submitted: should NOT appear in the queue.
    id: 'c3', firm: null, type: null, name: 'Suresh Yadav',
    phone: '+91 99887 76655', city: 'Ranchi', area: null, verified: false, projects: 0,
    pan: null, aadhaar: null, gstin: null,
    sub: { status: 'TRIAL' as const, plan: null, expires: days(6) },
  },
  {
    id: 'c4', firm: 'Khan Contractors', type: 'Private Limited', name: 'Imran Khan',
    phone: '+91 90000 11122', city: 'Mumbai', area: 'Kurla', verified: false, projects: 2,
    pan: 'AAECK9012P', aadhaar: null, gstin: null,
    sub: { status: 'SUSPENDED' as const, plan: 'Weekly Plan', expires: days(-4) },
  },
];

export const contractors: AdminContractor[] = contractorSeeds.map((c, i) => ({
  id: c.id,
  firmName: c.firm,
  firmType: c.type,
  experience: [12, 6, 0, 9][i],
  city: c.city,
  area: c.area,
  isVerified: c.verified,
  verifiedAt: c.verified ? days(-40) : null,
  verificationNote: c.id === 'c4' ? 'GSTIN did not match the firm name.' : null,
  kycStatus: c.pan ? (c.verified ? 'VERIFIED' : 'UNAVAILABLE') : null,
  kycCheckedAt: c.pan ? days(-2) : null,
  pan: c.pan,
  aadhaar: c.aadhaar,
  gstin: c.gstin,
  documents: [],
  createdAt: days(-60 + i * 12),
  projectCount: c.projects,
  categories: [{ name: 'Masonry' }, { name: 'Electrical' }].slice(0, i % 2 === 0 ? 2 : 1),
  user: {
    id: `u_c${i + 1}`,
    name: c.name,
    phone: c.phone,
    email: null,
    isActive: true,
    subscription: {
      status: c.sub.status,
      expiresAt: c.sub.expires,
      startedAt: days(-30),
      autoRenew: false,
      plan: c.sub.plan ? { name: c.sub.plan } : null,
    },
  },
  kycChecks: [],
  projects: Array.from({ length: c.projects }, (_, n) => ({
    id: `${c.id}_p${n + 1}`,
    name: ['Sharma Residence G+2', 'Kankarbagh Shops', 'Kurla Godown', 'Boundary Wall'][n % 4],
    status: n === 0 ? 'ACTIVE' : 'COMPLETED',
    createdAt: days(-20 - n * 10),
  })),
}));

export const subscriptions: AdminSubscription[] = contractors.map((c, i) => {
  const sub = c.user.subscription!;
  const remaining = Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86_400_000);
  return {
    id: `sub${i + 1}`,
    userId: c.user.id,
    status: sub.status,
    startedAt: sub.startedAt!,
    expiresAt: sub.expiresAt,
    daysRemaining: Math.max(0, remaining),
    autoRenew: false,
    priceRupees: sub.plan ? (sub.plan.name === 'Monthly Plan' ? 299 : 99) : null,
    suspendNote: sub.status === 'SUSPENDED' ? 'Documents pending review.' : null,
    plan: sub.plan ? { code: sub.plan.name === 'Monthly Plan' ? 'monthly' : 'weekly', name: sub.plan.name } : null,
    user: { id: c.user.id, name: c.user.name, phone: c.user.phone },
  };
});
