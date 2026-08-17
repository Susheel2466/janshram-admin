// Real backend implementation of the AdminApi surface. Talks to the guarded
// /admin/* routes on janshram-backend. Structurally identical to mockAdapter so
// api.ts can swap between them behind VITE_USE_MOCK.

import { http } from './client';
import type { AdminApi } from '../mock/adapter';
import type {
  User, ProviderProfile, Service, Booking, Bid, Tender, Wallet, WalletTransaction,
  Review, Coupon, Notification, Conversation, Category, DashboardStats,
  TimeseriesPoint, CategoryBreakdown, AuditLogEntry, Paginated, BookingStatus,
  TenderStatus, AdminProfile, Address, Favorite, PaymentRecord, ReferralRow,
  SupportTicket, TicketMessage, TicketStats, TicketStatus, TicketPriority, TicketAssignee,
  PlatformSettings, ReferralTotals, Payout, OtpLogEntry, Faq, LegalPage, ChatMessage, UploadSignature,
  MessageLog, MessageLogSummary, KycCheck, KycStatus, KycVerifierInfo,
} from '../types';
import type { UploadFolder } from '../upload';

// Only forward defined values as query params.
type Params = Record<string, unknown>;
const clean = (p: Params = {}): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number | boolean;
  }
  return out;
};

export const httpAdapter: AdminApi = {
  auth: {
    login: (email, password) => http.post<{ token: string; admin: AdminProfile }>('/admin/auth/login', { email, password }),
    me: () => http.get<{ admin: AdminProfile }>('/admin/auth/me'),
  },

  dashboard: {
    stats: () => http.get<{ stats: DashboardStats }>('/admin/dashboard/stats'),
    timeseries: () => http.get<{ points: TimeseriesPoint[] }>('/admin/dashboard/timeseries'),
    categoryBreakdown: () => http.get<{ breakdown: CategoryBreakdown[] }>('/admin/dashboard/category-breakdown'),
    recentBookings: () => http.get<{ bookings: Booking[] }>('/admin/dashboard/recent-bookings'),
    auditLog: () => http.get<{ entries: AuditLogEntry[] }>('/admin/dashboard/audit-log'),
  },

  users: {
    create: (data) => http.post<{ user: User }>('/admin/users', data),
    remove: (id) => http.del<{ ok: true }>(`/admin/users/${id}`),
    list: (params) => http.get<Paginated<User>>('/admin/users', clean(params)),
    get: (id) => http.get<{ user: User }>(`/admin/users/${id}`),
    setActive: (id, isActive) => http.patch<{ user: User }>(`/admin/users/${id}/active`, { isActive }),
    update: (id, patch) => http.patch<{ user: User }>(`/admin/users/${id}`, patch),
    addresses: (userId) => http.get<{ addresses: Address[] }>(`/admin/users/${userId}/addresses`),
    favorites: (userId) => http.get<{ favorites: Favorite[] }>(`/admin/users/${userId}/favorites`),
  },

  providers: {
    update: (id, patch) => http.patch<{ provider: ProviderProfile }>(`/admin/providers/${id}`, patch),
    remove: (id) => http.del<{ ok: true }>(`/admin/providers/${id}`),
    list: (params) => http.get<Paginated<ProviderProfile>>('/admin/providers', clean(params)),
    get: (id) => http.get<{ provider: ProviderProfile }>(`/admin/providers/${id}`),
    setVerified: (id, isVerified, note) => http.patch<{ provider: ProviderProfile }>(`/admin/providers/${id}/verified`, { isVerified, note }),
    setAvailable: (id, isAvailable) => http.patch<{ provider: ProviderProfile }>(`/admin/providers/${id}/available`, { isAvailable }),
    setBadge: (id, badge) => http.patch<{ provider: ProviderProfile }>(`/admin/providers/${id}/badge`, { badge }),
    pendingKyc: () => http.get<{ providers: ProviderProfile[] }>('/admin/providers/pending-kyc'),
    kycChecks: (id) => http.get<{ checks: KycCheck[]; verifier: KycVerifierInfo }>(`/admin/providers/${id}/kyc`),
    runKycCheck: (id, document) =>
      http.post<{ result: { status: KycStatus; verifier: string; registeredName?: string | null; nameMatch?: number | null; detail?: string | null; autoApproved?: boolean } }>(
        `/admin/providers/${id}/kyc/verify`,
        { document },
      ),
  },

  categories: {
    list: () => http.get<{ categories: Category[] }>('/admin/categories'),
    create: (data) => http.post<{ category: Category }>('/admin/categories', data),
    update: (id, data) => http.patch<{ category: Category }>(`/admin/categories/${id}`, data),
    remove: (id) => http.del<{ ok: true }>(`/admin/categories/${id}`),
    reorder: (ids) => http.post<{ ok: true }>('/admin/categories/reorder', { ids }),
  },

  faqs: {
    list: () => http.get<{ faqs: Faq[] }>('/admin/faqs'),
    create: (data) => http.post<{ faq: Faq }>('/admin/faqs', data),
    update: (id, data) => http.patch<{ faq: Faq }>(`/admin/faqs/${id}`, data),
    remove: (id) => http.del<{ ok: true }>(`/admin/faqs/${id}`),
    reorder: (ids) => http.post<{ ok: true }>('/admin/faqs/reorder', { ids }),
  },

  legal: {
    list: () => http.get<{ pages: LegalPage[] }>('/admin/legal'),
    create: (data) => http.post<{ page: LegalPage }>('/admin/legal', data),
    update: (id, data) => http.patch<{ page: LegalPage }>(`/admin/legal/${id}`, data),
    remove: (id) => http.del<{ ok: true }>(`/admin/legal/${id}`),
    reorder: (ids) => http.post<{ ok: true }>('/admin/legal/reorder', { ids }),
  },

  services: {
    list: (params) => http.get<Paginated<Service>>('/admin/services', clean(params)),
    create: (data) => http.post<{ service: Service }>('/admin/services', data),
    update: (id, data) => http.patch<{ service: Service }>(`/admin/services/${id}`, data),
    remove: (id) => http.del<{ ok: true }>(`/admin/services/${id}`),
  },

  bookings: {
    create: (data) => http.post<{ booking: Booking }>('/admin/bookings', data),
    update: (id, patch) => http.patch<{ booking: Booking }>(`/admin/bookings/${id}`, patch),
    remove: (id) => http.del<{ ok: true }>(`/admin/bookings/${id}`),
    list: (params) => http.get<Paginated<Booking>>('/admin/bookings', clean(params)),
    get: (id) => http.get<{ booking: Booking }>(`/admin/bookings/${id}`),
    setStatus: (id, status: BookingStatus) => http.patch<{ booking: Booking }>(`/admin/bookings/${id}/status`, { status }),
    refund: (id) => http.post<{ booking: Booking }>(`/admin/bookings/${id}/refund`),
  },

  tenders: {
    update: (id, patch) => http.patch<{ tender: Tender }>(`/admin/tenders/${id}`, patch),
    remove: (id) => http.del<{ ok: true }>(`/admin/tenders/${id}`),
    list: (params) => http.get<Paginated<Tender>>('/admin/tenders', clean(params)),
    get: (id) => http.get<{ tender: Tender }>(`/admin/tenders/${id}`),
    setStatus: (id, status: TenderStatus) => http.patch<{ tender: Tender }>(`/admin/tenders/${id}/status`, { status }),
    acceptBid: (tenderId, bidId) =>
      http.post<{ tender: Tender; bid: Bid; booking: Booking }>(`/admin/tenders/${tenderId}/bids/${bidId}/accept`),
  },

  reviews: {
    update: (id, patch) => http.patch<{ review: Review }>(`/admin/reviews/${id}`, patch),
    list: (params) => http.get<Paginated<Review>>('/admin/reviews', clean(params)),
    setHidden: (id, hidden) => http.patch<{ review: Review }>(`/admin/reviews/${id}/hidden`, { hidden }),
    remove: (id) => http.del<{ ok: true }>(`/admin/reviews/${id}`),
  },

  wallets: {
    list: (params) => http.get<Paginated<Wallet>>('/admin/wallets', clean(params)),
    transactions: (params) => http.get<Paginated<WalletTransaction>>('/admin/wallets/transactions', clean(params)),
    adjust: (userId, deltaPaise, description) => http.post<{ wallet: Wallet }>(`/admin/wallets/${userId}/adjust`, { deltaPaise, description }),
  },

  coupons: {
    list: () => http.get<{ coupons: Coupon[] }>('/admin/coupons'),
    create: (data) => http.post<{ coupon: Coupon }>('/admin/coupons', data),
    update: (id, patch) => http.patch<{ coupon: Coupon }>(`/admin/coupons/${id}`, patch),
    remove: (id) => http.del<{ ok: true }>(`/admin/coupons/${id}`),
  },

  messages: {
    list: (params) =>
      http.get<Paginated<MessageLog> & { summary: MessageLogSummary; retentionDays: number }>(
        '/admin/messages',
        clean(params),
      ),
  },

  notifications: {
    remove: (id) => http.del<{ ok: true }>(`/admin/notifications/${id}`),
    history: () => http.get<{ notifications: Notification[] }>('/admin/notifications/history'),
    broadcast: (data) => http.post<{ sentTo: string; count: number }>('/admin/notifications/broadcast', data),
  },

  conversations: {
    remove: (id) => http.del<{ ok: true }>(`/admin/conversations/${id}`),
    list: (params) => http.get<Paginated<Conversation>>('/admin/conversations', clean(params)),
    get: (id) => http.get<{ conversation: Conversation }>(`/admin/conversations/${id}`),
    reply: (id, body) => http.post<{ message: ChatMessage }>(`/admin/conversations/${id}/messages`, { body }),
  },

  payments: {
    list: (params) => http.get<Paginated<PaymentRecord>>('/admin/payments', clean(params)),
    stats: () => http.get<{ stats: { collectedPaise: number; refundedPaise: number; pendingPaise: number; failedCount: number } }>('/admin/payments/stats'),
    refund: (bookingId) => http.post<{ ok: true }>(`/admin/payments/${bookingId}/refund`),
  },

  referrals: {
    list: (params) => http.get<Paginated<ReferralRow> & { totals: ReferralTotals }>('/admin/referrals', clean(params)),
  },

  settings: {
    get: () => http.get<{ settings: PlatformSettings }>('/admin/settings'),
    update: (patch) => http.patch<{ settings: PlatformSettings }>('/admin/settings', patch),
  },

  tickets: {
    create: (data) => http.post<{ ticket: SupportTicket }>('/admin/tickets', data),
    remove: (id) => http.del<{ ok: true }>(`/admin/tickets/${id}`),
    stats: () => http.get<{ stats: TicketStats }>('/admin/tickets/stats'),
    assignees: () => http.get<{ assignees: TicketAssignee[] }>('/admin/tickets/assignees'),
    list: (params) => http.get<Paginated<SupportTicket>>('/admin/tickets', clean(params)),
    get: (id) => http.get<{ ticket: SupportTicket }>(`/admin/tickets/${id}`),
    update: (id, patch: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null }) =>
      http.patch<{ ticket: SupportTicket }>(`/admin/tickets/${id}`, patch),
    reply: (id, body: string, attachments?: string[]) =>
      http.post<{ message: TicketMessage }>(`/admin/tickets/${id}/messages`, { body, attachments }),
  },

  audit: {
    list: (params) => http.get<Paginated<AuditLogEntry>>('/admin/audit', clean(params)),
  },

  payouts: {
    list: (params) => http.get<Paginated<Payout> & { pending: { count: number; amountPaise: number } }>('/admin/payouts', clean(params)),
    update: (id, status: 'PAID' | 'REJECTED', note?: string) =>
      http.patch<{ payout: Payout }>(`/admin/payouts/${id}`, { status, note }),
  },

  otpLogs: {
    list: (params) => http.get<Paginated<OtpLogEntry>>('/admin/otp-logs', clean(params)),
  },

  // Not an /admin/* route — the shared uploads endpoint, which accepts any
  // authenticated caller. The admin JWT is a normal user token, so it works.
  uploads: {
    sign: (folder: UploadFolder, filename: string, contentType: string) =>
      http.post<UploadSignature>('/uploads/sign', { folder, filename, contentType }),
  },

  exportCsv: (entity: string) => http.getText(`/admin/export/${entity}`),
};
