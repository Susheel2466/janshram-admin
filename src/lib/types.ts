// Domain types for the JanShram admin panel.
// Mirrors janshram-backend (Prisma) + janshram-frontend API contract, extended
// with admin-only shapes (dashboard aggregates, audit log, richer coupon).
// Money fields are integer paise; render with formatINR / paiseToRupees.

export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: Role;
  avatar: string | null;
  city: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  referralCode: string | null;
  isActive: boolean;
  notifyBookings: boolean;
  notifyPromotions: boolean;
  notifyReminders: boolean;
  notifyChat: boolean;
  createdAt: string;
  updatedAt: string;
  wallet?: Wallet;
  providerProfile?: ProviderProfile | null;
  // Admin aggregates attached by the list endpoint.
  bookingsCount?: number;
  totalSpentPaise?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  serviceCount: number;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  bio: string | null;
  experience: number;
  completedJobs: number;
  priceFrom: number; // paise
  pricePer: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isVerified: boolean;
  badge: string | null;
  specialties: string[];
  businessName: string | null;
  businessType: string | null;
  // KYC / verification — collected at provider onboarding, reviewed by admin.
  aadhaar: string | null;
  pan: string | null;
  gstin: string | null;
  documents: string[]; // uploaded document URLs (Aadhaar/PAN/certs)
  lat: number | null;
  lng: number | null;
  city: string | null;
  area: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'avatar' | 'phone' | 'email' | 'isActive'>;
  categories?: Category[];
  services?: Service[];
  bookings?: Booking[];
  reviews?: Review[];
  // Admin aggregates.
  totalEarnedPaise?: number;
  activeBookings?: number;
}

export interface Service {
  id: string;
  title: string;
  description: string | null;
  price: number; // paise
  priceUnit: string;
  image: string | null;
  rating: number;
  reviewCount: number;
  createdAt: string;
  categoryId: string;
  category?: Category;
  providerId: string;
  provider?: ProviderProfile;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'UPI' | 'CARD' | 'WALLET' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Booking {
  id: string;
  status: BookingStatus;
  scheduledAt: string;
  address: string | null;
  notes: string | null;
  photos: string[];
  amount: number; // paise
  discount: number; // paise
  couponCode: string | null;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  cancelledAt: string | null;
  cancelReason: string | null;
  completedAt: string | null;
  createdAt: string;
  customerId: string;
  providerId: string;
  serviceId: string | null;
  service?: Service | null;
  provider?: ProviderProfile;
  customer?: Pick<User, 'id' | 'name' | 'avatar' | 'phone'>;
  review?: Review | null;
}

export type TenderStatus = 'OPEN' | 'AWARDED' | 'CLOSED' | 'CANCELLED';
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface Bid {
  id: string;
  amount: number; // paise
  message: string | null;
  timeline: string | null;
  status: BidStatus;
  createdAt: string;
  tenderId: string;
  providerId: string;
  provider?: ProviderProfile;
}

export interface Tender {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number; // paise
  budgetMax: number; // paise
  timeline: string | null;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  city: string | null;
  area: string | null;
  attachments: string[];
  status: TenderStatus;
  createdAt: string;
  customerId: string;
  customer?: Pick<User, 'id' | 'name' | 'avatar' | 'phone'>;
  bids?: Bid[];
  _count?: { bids: number };
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number; // paise
  balanceAfter: number; // paise
  description: string | null;
  createdAt: string;
  walletId?: string;
  // Admin: which user this wallet belongs to (attached by list endpoint).
  user?: Pick<User, 'id' | 'name' | 'phone'>;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number; // paise
  transactions?: WalletTransaction[];
  user?: Pick<User, 'id' | 'name' | 'phone' | 'avatar'>;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorId: string;
  providerId: string;
  bookingId: string | null;
  hidden?: boolean; // admin moderation flag
  author?: Pick<User, 'id' | 'name' | 'avatar'>;
  provider?: Pick<ProviderProfile, 'id' | 'user'>;
}

export type NotificationType = 'BOOKING' | 'TENDER' | 'BID' | 'WALLET' | 'CHAT' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
  userId?: string;
  user?: Pick<User, 'id' | 'name'>;
}

// One outbound SMS / WhatsApp attempt. SKIPPED rows explain why nothing was
// sent (channel off, user opted out, no number, dev mode).
export type MessageChannel = 'SMS' | 'WHATSAPP';
export type MessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface MessageLog {
  id: string;
  channel: MessageChannel;
  status: MessageStatus;
  to: string;
  event: string;
  refId: string | null;
  body: string;
  error: string | null;
  userId: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'phone' | 'role'> | null;
}

export interface MessageLogSummary {
  sent: number;
  failed: number;
  skipped: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number; // paise if FLAT, percent if PERCENT
  maxDiscount: number | null; // paise
  minOrder: number; // paise
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  redemptions?: number; // admin aggregate
}

// Who a help-centre entry is shown to in the customer/provider apps.
export type FaqAudience = 'ALL' | 'CUSTOMER' | 'PROVIDER';

export interface Faq {
  id: string;
  question: string;
  answer: string;
  audience: FaqAudience;
  order: number; // ascending display position
  isActive: boolean; // unpublished entries stay hidden from the apps
  createdAt: string;
  updatedAt: string;
}

// Legal / policy document (Terms, Privacy, Refund, …). The customer and
// provider apps read these at /legal/:slug — the "Quick Links" on their Help &
// Support screen — so `slug` is a live link target, not just an identifier.
export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string; // markdown-lite: ## headings, - bullets, blank-line paragraphs
  order: number; // ascending display position
  isActive: boolean; // unpublished pages stay hidden from the apps
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments?: string[];
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  /** Sent by an admin from this console rather than by a participant. */
  fromSupport?: boolean;
}

export interface Conversation {
  id: string;
  providerId: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  provider?: ProviderProfile;
  customer?: Pick<User, 'id' | 'name' | 'avatar'>;
  messages?: ChatMessage[];
  lastMessage?: ChatMessage | null;
  messageCount?: number;
  // Either participant can block the thread; nobody can send while it is set.
  blockedById?: string | null;
  blockedAt?: string | null;
}

// ── Admin-only ──

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
  avatar: string | null;
}

export interface DashboardStats {
  users: { total: number; customers: number; providers: number; newThisWeek: number };
  providers: { total: number; verified: number; pendingVerification: number; available: number };
  bookings: { total: number; pending: number; inProgress: number; completed: number; cancelled: number };
  tenders: { open: number; awarded: number; total: number };
  revenue: { grossPaise: number; thisMonthPaise: number; walletFloatPaise: number };
  reviews: { total: number; avgRating: number; flagged: number };
  support?: { openTickets: number };
}

export interface TimeseriesPoint {
  label: string; // e.g. "Jul 20"
  bookings: number;
  revenuePaise: number;
  signups: number;
}

export interface CategoryBreakdown {
  category: string;
  bookings: number;
  revenuePaise: number;
}

export interface AuditLogEntry {
  id: string;
  actor: string; // admin name
  action: string; // "Verified provider", "Refunded booking", …
  target: string; // entity label
  createdAt: string;
}

// OTP / login attempt record (code hash never exposed).
export interface OtpLogEntry {
  id: string;
  phone: string;
  consumed: boolean;
  expired: boolean;
  expiresAt: string;
  createdAt: string;
  userName: string | null;
  userRole: string | null;
}

export type ExportEntity = 'users' | 'providers' | 'bookings' | 'payments' | 'payouts';

// A provider's request to withdraw wallet earnings.
export interface Payout {
  id: string;
  amount: number; // paise
  upiId: string | null;
  status: 'REQUESTED' | 'PAID' | 'REJECTED';
  note: string | null;
  createdAt: string;
  processedAt: string | null;
  provider?: Pick<User, 'id' | 'name' | 'phone' | 'avatar'>;
}

// A customer's saved service address.
export interface Address {
  id: string;
  label: string; // "Home", "Office", …
  line: string;
  city: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: string;
}

// A customer→provider favorite relationship.
export interface Favorite {
  id: string;
  createdAt: string;
  provider?: ProviderProfile;
}

// Gateway payment record, derived from paid/refunded bookings (UPI/Card/etc.).
export interface PaymentRecord {
  id: string; // booking id
  bookingId: string;
  amount: number; // paise
  method: PaymentMethod | null;
  status: PaymentStatus;
  couponCode: string | null;
  discount: number; // paise
  createdAt: string;
  refundedAt: string | null;
  customer?: Pick<User, 'id' | 'name' | 'phone' | 'avatar'>;
  provider?: Pick<ProviderProfile, 'id' | 'user'>;
  serviceTitle?: string | null;
}

// Referral tracking: one row per referrer with their invitees + payout.
export interface ReferralRow {
  id: string; // referrer user id
  name: string | null;
  phone: string;
  avatar: string | null;
  referralCode: string | null;
  referredCount: number;
  earningsPaise: number; // ₹100 per successful referral
  referredUsers?: Pick<User, 'id' | 'name' | 'phone' | 'createdAt'>[];
}

// ── Support tickets ──

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'BOOKING' | 'PAYMENT' | 'REFUND' | 'PROVIDER' | 'ACCOUNT' | 'TECHNICAL' | 'OTHER';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  fromAdmin: boolean;
  body: string;
  attachments?: string[];
  createdAt: string;
  sender?: Pick<User, 'id' | 'name' | 'avatar'>;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeId: string | null;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  lastReplyAt: string;
  requester?: Pick<User, 'id' | 'name' | 'avatar' | 'phone' | 'email' | 'role'>;
  assignee?: Pick<User, 'id' | 'name'> | null;
  booking?: { id: string; amount: number; status: string } | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
}

// Parameters for a direct browser upload to Cloudinary. The backend only signs
// the request — the file goes browser → Cloudinary, never through our server.
// `publicUrl` is the dev-mode placeholder; a real upload returns its own URL.
export interface UploadSignature {
  uploadUrl: string | null;
  params: Record<string, string>;
  /** Dev-mode placeholder only; null for real uploads (use Cloudinary's secure_url). */
  publicUrl: string | null;
  key: string;
  mock: boolean;
}

// An admin who can own a ticket — the options in the "assign to" picker.
export interface TicketAssignee {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  urgent: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface PlatformSettings {
  platformCommissionPercent: number;
  referralRewardRupees: number;
  supportEmail: string;
  supportPhone: string;
  providerAutoApproval: boolean;
  maintenanceMode: boolean;
  // Outbound booking alert channels (in-app notifications are always on).
  smsBookingAlerts: boolean;
  whatsappBookingAlerts: boolean;
}

export interface ReferralTotals {
  activeReferrers: number;
  totalReferred: number;
  totalPayoutPaise: number;
}
