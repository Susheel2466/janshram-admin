// Mock implementation of the AdminApi surface. Operates on the in-memory
// dataset in ./data with a small artificial latency so the UI exercises its
// loading states. Mutations persist for the session (module-level arrays).

import * as db from './data';
import type { UploadFolder } from '../upload';
import type {
  User, ProviderProfile, Service, Booking, Tender, Wallet, WalletTransaction,
  Review, Coupon, Notification, Conversation, Category, DashboardStats,
  TimeseriesPoint, CategoryBreakdown, AuditLogEntry, Paginated, BookingStatus,
  AdminProfile, Address, Favorite, PaymentRecord, ReferralRow, PaymentStatus,
  TicketMessage, TicketStatus, TicketPriority, TicketAssignee, PlatformSettings, Faq, FaqAudience, PresignResult,
  LegalPage, SupportTicket, TicketCategory, ChatMessage,
} from '../types';

const delay = <T>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

interface ListParams {
  page?: number;
  limit?: number;
  q?: string;
  [key: string]: unknown;
}

function paginate<T>(rows: T[], page = 1, limit = 10): Paginated<T> {
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    pagination: { page, limit, total: rows.length },
  };
}

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase();

// The mock session's support staff. db.users holds only customers and
// providers, so ticket assignment resolves against this list instead. The first
// entry is "you" — the admin the mock session is logged in as.
const MOCK_ADMINS: TicketAssignee[] = [
  { id: 'admin1', name: 'Platform Admin', email: 'admin@janshram.in', avatar: null },
  { id: 'admin2', name: 'Priya Support', email: 'priya@janshram.in', avatar: null },
];

// ── Dashboard ──
function dashboardStats(): DashboardStats {
  const customers = db.users.filter((u) => u.role === 'CUSTOMER');
  const provs = db.providers;
  const completed = db.bookings.filter((b) => b.status === 'COMPLETED');
  const gross = completed.reduce((sum, b) => sum + b.amount, 0);
  const thisMonth = completed
    .filter((b) => new Date(b.completedAt!).getMonth() === 6)
    .reduce((sum, b) => sum + b.amount, 0);
  const walletFloat = db.wallets.reduce((sum, w) => sum + w.balance, 0);
  const ratings = db.reviews.filter((r) => !r.hidden);
  return {
    users: {
      total: db.users.length,
      customers: customers.length,
      providers: provs.length,
      newThisWeek: db.users.filter((u) => Date.now() - new Date(u.createdAt).getTime() < 7 * 864e5).length,
    },
    providers: {
      total: provs.length,
      verified: provs.filter((p) => p.isVerified).length,
      pendingVerification: provs.filter((p) => !p.isVerified).length,
      available: provs.filter((p) => p.isAvailable).length,
    },
    bookings: {
      total: db.bookings.length,
      pending: db.bookings.filter((b) => b.status === 'PENDING').length,
      inProgress: db.bookings.filter((b) => b.status === 'IN_PROGRESS').length,
      completed: completed.length,
      cancelled: db.bookings.filter((b) => b.status === 'CANCELLED').length,
    },
    tenders: {
      open: db.tenders.filter((t) => t.status === 'OPEN').length,
      awarded: db.tenders.filter((t) => t.status === 'AWARDED').length,
      total: db.tenders.length,
    },
    revenue: { grossPaise: gross, thisMonthPaise: thisMonth, walletFloatPaise: walletFloat },
    reviews: {
      total: ratings.length,
      avgRating: ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0,
      flagged: db.reviews.filter((r) => r.hidden || r.rating <= 2).length,
    },
  };
}

function timeseries(): TimeseriesPoint[] {
  const days = 14;
  const points: TimeseriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(2026, 6, 26 - i);
    const label = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const dayBookings = db.bookings.filter((b) => {
      const d = new Date(b.createdAt);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
    });
    const signups = db.users.filter((u) => {
      const d = new Date(u.createdAt);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
    }).length;
    points.push({
      label,
      bookings: dayBookings.length,
      revenuePaise: dayBookings.reduce((s, b) => s + (b.status !== 'CANCELLED' ? b.amount : 0), 0),
      signups,
    });
  }
  return points;
}

function categoryBreakdown(): CategoryBreakdown[] {
  return db.categories.map((c) => {
    const catBookings = db.bookings.filter((b) => b.service?.category?.id === c.id);
    return {
      category: c.name,
      bookings: catBookings.length,
      revenuePaise: catBookings.reduce((s, b) => s + b.amount, 0),
    };
  });
}

// ── The adapter object ──
// The real backend refuses deletes that would destroy financial or dispute
// history, and rejects duplicate identities. Mirroring those rules here keeps
// mock mode honest — otherwise the demo teaches behaviour the API won't allow.
function refuse(message: string): never {
  throw new Error(message);
}

export const mockAdapter = {
  auth: {
    login: (email: string, _password: string) => {
      const admin: AdminProfile = {
        id: 'admin1',
        name: 'Platform Admin',
        email,
        role: 'ADMIN',
        avatar: null,
      };
      return delay({ token: 'mock-admin-token', admin });
    },
    me: () =>
      delay<{ admin: AdminProfile }>({
        admin: { id: 'admin1', name: 'Platform Admin', email: 'admin@janshram.in', role: 'ADMIN', avatar: null },
      }),
  },

  dashboard: {
    stats: () => delay({ stats: dashboardStats() }),
    timeseries: () => delay({ points: timeseries() }),
    categoryBreakdown: () => delay({ breakdown: categoryBreakdown() }),
    recentBookings: () => delay({ bookings: [...db.bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6) }),
    auditLog: () => delay<{ entries: AuditLogEntry[] }>({ entries: db.auditLog }),
  },

  users: {
    create: (data: {
      phone: string; name?: string; email?: string;
      role?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'; city?: string; area?: string; password?: string;
    }) => {
      // Seeded mock phones are display-formatted ("+91 98765 43210") while the
      // form submits bare digits, so compare on digits only — otherwise this
      // check silently never matches.
      const digits = (v: string) => v.replace(/\D/g, '').slice(-10);
      if (db.users.some((u) => digits(u.phone) === digits(data.phone))) {
        refuse('This mobile number is already registered');
      }
      if (data.email && db.users.some((u) => u.email?.toLowerCase() === data.email!.toLowerCase())) {
        refuse('This email is already registered with another account');
      }
      const now = new Date().toISOString();
      const user: User = {
        id: `u${Date.now()}`,
        phone: data.phone,
        name: data.name ?? null,
        email: data.email ?? null,
        role: data.role ?? 'CUSTOMER',
        avatar: null,
        city: data.city ?? null,
        area: data.area ?? null,
        lat: null,
        lng: null,
        referralCode: `SEVA${data.phone.slice(-6)}`,
        isActive: true,
        notifyBookings: true,
        notifyPromotions: true,
        notifyReminders: true,
        notifyChat: true,
        createdAt: now,
        updatedAt: now,
      };
      db.users.unshift(user);
      return delay({ user });
    },
    remove: (id: string) => {
      const bookings = db.bookings.filter((b) => b.customerId === id).length;
      const reviews = db.reviews.filter((r) => r.authorId === id).length;
      const blockers = [bookings && `${bookings} booking(s)`, reviews && `${reviews} review(s)`].filter(Boolean);
      if (blockers.length) {
        refuse(`This account has ${blockers.join(', ')} attached. Deactivate it instead so that history is kept.`);
      }
      const i = db.users.findIndex((x) => x.id === id);
      if (i >= 0) db.users.splice(i, 1);
      return delay({ ok: true as const });
    },
    list: (params: ListParams = {}) => {
      let rows = [...db.users];
      if (params.role) rows = rows.filter((u) => u.role === params.role);
      if (params.status === 'active') rows = rows.filter((u) => u.isActive);
      if (params.status === 'inactive') rows = rows.filter((u) => !u.isActive);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((u) => norm(u.name).includes(q) || norm(u.phone).includes(q) || norm(u.email).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    get: (id: string) => delay({ user: db.users.find((u) => u.id === id)! }),
    setActive: (id: string, isActive: boolean) => {
      const u = db.users.find((x) => x.id === id);
      if (u) u.isActive = isActive;
      return delay({ user: u! });
    },
    update: (id: string, patch: Partial<User>) => {
      const u = db.users.find((x) => x.id === id);
      if (u) Object.assign(u, patch);
      return delay({ user: u! });
    },
    addresses: (userId: string) => delay<{ addresses: Address[] }>({ addresses: db.addressesByUser[userId] ?? [] }),
    favorites: (userId: string) => delay<{ favorites: Favorite[] }>({ favorites: db.favoritesByUser[userId] ?? [] }),
  },

  providers: {
    update: (id: string, patch: Partial<ProviderProfile> & { priceFromRupees?: number }) => {
      const p = db.providers.find((x) => x.id === id);
      if (p) {
        const { priceFromRupees, ...rest } = patch;
        Object.assign(p, rest);
        if (priceFromRupees !== undefined) p.priceFrom = Math.round(priceFromRupees * 100);
      }
      return delay({ provider: p! });
    },
    remove: (id: string) => {
      const jobs = db.bookings.filter((b) => b.providerId === id).length;
      const reviews = db.reviews.filter((r) => r.providerId === id).length;
      const blockers = [jobs && `${jobs} booking(s)`, reviews && `${reviews} review(s)`].filter(Boolean);
      if (blockers.length) {
        refuse(`This provider has ${blockers.join(' and ')} on record. Mark them unavailable or deactivate the account instead.`);
      }
      const i = db.providers.findIndex((x) => x.id === id);
      if (i >= 0) db.providers.splice(i, 1);
      return delay({ ok: true as const });
    },
    list: (params: ListParams = {}) => {
      let rows = [...db.providers];
      if (params.verified === 'yes') rows = rows.filter((p) => p.isVerified);
      if (params.verified === 'no') rows = rows.filter((p) => !p.isVerified);
      if (params.available === 'yes') rows = rows.filter((p) => p.isAvailable);
      if (params.category) rows = rows.filter((p) => p.categories?.some((c) => c.name === params.category));
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((p) => norm(p.user?.name).includes(q) || norm(p.businessName).includes(q) || norm(p.area).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    get: (id: string) => {
      const p = db.providers.find((x) => x.id === id)!;
      // Attach recent bookings + reviews for the admin drill-down.
      const bookings = p ? db.bookings.filter((b) => b.providerId === id).slice(0, 10) : [];
      const reviews = p ? db.reviews.filter((r) => r.providerId === id).slice(0, 10) : [];
      const provider: ProviderProfile = p ? { ...p, bookings, reviews } : p;
      return delay({ provider });
    },
    setVerified: (id: string, isVerified: boolean) => {
      const p = db.providers.find((x) => x.id === id);
      if (p) p.isVerified = isVerified;
      return delay({ provider: p! });
    },
    setAvailable: (id: string, isAvailable: boolean) => {
      const p = db.providers.find((x) => x.id === id);
      if (p) p.isAvailable = isAvailable;
      return delay({ provider: p! });
    },
    setBadge: (id: string, badge: string | null) => {
      const p = db.providers.find((x) => x.id === id);
      if (p) p.badge = badge;
      return delay({ provider: p! });
    },
    // Onboarding approval queue: unverified providers, oldest first.
    pendingKyc: () => {
      const rows = db.providers
        .filter((p) => !p.isVerified)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay({ providers: rows });
    },
  },

  categories: {
    list: () => delay({ categories: [...db.categories] }),
    create: (data: { name: string; icon: string }) => {
      const cat: Category = { id: `c${Date.now()}`, name: data.name, icon: data.icon, serviceCount: 0 };
      db.categories.unshift(cat);
      return delay({ category: cat });
    },
    update: (id: string, data: Partial<Category>) => {
      const c = db.categories.find((x) => x.id === id);
      if (c) Object.assign(c, data);
      return delay({ category: c! });
    },
    remove: (id: string) => {
      const i = db.categories.findIndex((x) => x.id === id);
      if (i >= 0) db.categories.splice(i, 1);
      return delay({ ok: true as const });
    },
  },

  services: {
    list: (params: ListParams = {}) => {
      let rows = [...db.services];
      if (params.category) rows = rows.filter((s) => s.category?.name === params.category);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((s) => norm(s.title).includes(q) || norm(s.provider?.user?.name).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    create: (data: { title: string; description?: string | null; priceRupees: number; priceUnit?: string; image?: string | null; categoryId: string; providerId: string }) => {
      const category = db.categories.find((c) => c.id === data.categoryId);
      const provider = db.providers.find((p) => p.id === data.providerId);
      const svc: Service = {
        id: `s${Date.now()}`,
        title: data.title,
        description: data.description ?? null,
        price: Math.round(data.priceRupees * 100),
        priceUnit: data.priceUnit ?? '/hour',
        image: data.image ?? null,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
        categoryId: data.categoryId,
        category,
        providerId: data.providerId,
        provider,
      };
      db.services.unshift(svc);
      if (category) category.serviceCount += 1;
      return delay({ service: svc });
    },
    update: (id: string, data: Partial<{ title: string; description: string | null; priceRupees: number; priceUnit: string; image: string | null; categoryId: string }>) => {
      const s = db.services.find((x) => x.id === id);
      if (s) {
        const { priceRupees, categoryId, ...rest } = data;
        Object.assign(s, rest);
        if (priceRupees !== undefined) s.price = Math.round(priceRupees * 100);
        if (categoryId) { s.categoryId = categoryId; s.category = db.categories.find((c) => c.id === categoryId); }
      }
      return delay({ service: s! });
    },
    remove: (id: string) => {
      const i = db.services.findIndex((x) => x.id === id);
      if (i >= 0) db.services.splice(i, 1);
      return delay({ ok: true as const });
    },
  },

  bookings: {
    create: (data: {
      customerId: string; providerId: string; serviceId?: string; scheduledAt: string;
      address?: string; notes?: string; amountRupees?: number; couponCode?: string;
      paymentMethod?: Booking['paymentMethod']; status?: BookingStatus; paymentStatus?: PaymentStatus;
    }) => {
      const customer = db.users.find((u) => u.id === data.customerId);
      const booking: Booking = {
        id: `b${Date.now()}`,
        status: data.status ?? 'PENDING',
        scheduledAt: data.scheduledAt,
        address: data.address ?? null,
        notes: data.notes ?? null,
        photos: [],
        // Blank amount means "use the standard price", which the backend derives
        // from the shared quote helper. Approximate it here so mock mode doesn't
        // show a ₹0 booking: service (or provider base) price + platform fee.
        amount:
          data.amountRupees !== undefined
            ? Math.round(data.amountRupees * 100)
            : (db.services.find((x) => x.id === data.serviceId)?.price ??
               db.providers.find((x) => x.id === data.providerId)?.priceFrom ??
               0) + 3000,
        discount: 0,
        couponCode: data.couponCode ?? null,
        paymentMethod: data.paymentMethod ?? null,
        paymentStatus: data.paymentStatus ?? 'PENDING',
        cancelledAt: null,
        cancelReason: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        customerId: data.customerId,
        providerId: data.providerId,
        serviceId: data.serviceId ?? null,
        service: db.services.find((x) => x.id === data.serviceId) ?? null,
        provider: db.providers.find((x) => x.id === data.providerId),
        customer: customer && { id: customer.id, name: customer.name, avatar: customer.avatar, phone: customer.phone },
      };
      db.bookings.unshift(booking);
      return delay({ booking });
    },
    update: (id: string, patch: Partial<Booking> & { amountRupees?: number }) => {
      const b = db.bookings.find((x) => x.id === id);
      if (b) {
        const { amountRupees, ...rest } = patch;
        Object.assign(b, rest);
        if (amountRupees !== undefined) b.amount = Math.round(amountRupees * 100);
      }
      return delay({ booking: b! });
    },
    remove: (id: string) => {
      const b = db.bookings.find((x) => x.id === id);
      if (b?.paymentStatus === 'PAID') refuse('This booking has been paid. Refund it first, then delete.');
      const i = db.bookings.findIndex((x) => x.id === id);
      if (i >= 0) db.bookings.splice(i, 1);
      return delay({ ok: true as const });
    },
    list: (params: ListParams = {}) => {
      let rows = [...db.bookings];
      if (params.status) rows = rows.filter((b) => b.status === params.status);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((b) => norm(b.customer?.name).includes(q) || norm(b.provider?.user?.name).includes(q) || b.id.includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    get: (id: string) => delay({ booking: db.bookings.find((b) => b.id === id)! }),
    setStatus: (id: string, status: BookingStatus) => {
      const b = db.bookings.find((x) => x.id === id);
      if (b) {
        b.status = status;
        if (status === 'COMPLETED') b.completedAt = new Date().toISOString();
        if (status === 'CANCELLED') b.cancelledAt = new Date().toISOString();
      }
      return delay({ booking: b! });
    },
    refund: (id: string) => {
      const b = db.bookings.find((x) => x.id === id);
      if (b) b.paymentStatus = 'REFUNDED';
      return delay({ booking: b! });
    },
  },

  tenders: {
    update: (id: string, patch: Partial<Tender> & { budgetMinRupees?: number; budgetMaxRupees?: number }) => {
      const t = db.tenders.find((x) => x.id === id);
      if (t) {
        const { budgetMinRupees, budgetMaxRupees, ...rest } = patch;
        Object.assign(t, rest);
        if (budgetMinRupees !== undefined) t.budgetMin = Math.round(budgetMinRupees * 100);
        if (budgetMaxRupees !== undefined) t.budgetMax = Math.round(budgetMaxRupees * 100);
      }
      return delay({ tender: t! });
    },
    remove: (id: string) => {
      const i = db.tenders.findIndex((x) => x.id === id);
      if (i >= 0) db.tenders.splice(i, 1);
      return delay({ ok: true as const });
    },
    list: (params: ListParams = {}) => {
      let rows = [...db.tenders];
      if (params.status) rows = rows.filter((t) => t.status === params.status);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((t) => norm(t.title).includes(q) || norm(t.customer?.name).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    get: (id: string) => delay({ tender: db.tenders.find((t) => t.id === id)! }),
    setStatus: (id: string, status: Tender['status']) => {
      const t = db.tenders.find((x) => x.id === id);
      if (t) t.status = status;
      return delay({ tender: t! });
    },
  },

  reviews: {
    update: (id: string, patch: { rating?: number; comment?: string | null }) => {
      const r = db.reviews.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
      return delay({ review: r! });
    },
    list: (params: ListParams = {}) => {
      let rows = [...db.reviews];
      if (params.providerId) rows = rows.filter((r) => r.providerId === params.providerId);
      if (params.flagged === 'yes') rows = rows.filter((r) => r.hidden || r.rating <= 2);
      if (params.rating) rows = rows.filter((r) => r.rating === Number(params.rating));
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((r) => norm(r.comment).includes(q) || norm(r.author?.name).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    setHidden: (id: string, hidden: boolean) => {
      const r = db.reviews.find((x) => x.id === id);
      if (r) r.hidden = hidden;
      return delay({ review: r! });
    },
    remove: (id: string) => {
      const i = db.reviews.findIndex((x) => x.id === id);
      if (i >= 0) db.reviews.splice(i, 1);
      return delay({ ok: true as const });
    },
  },

  wallets: {
    list: (params: ListParams = {}) => {
      let rows = [...db.wallets];
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((w) => norm(w.user?.name).includes(q) || norm(w.user?.phone).includes(q));
      }
      rows.sort((a, b) => b.balance - a.balance);
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    transactions: (params: ListParams = {}) => {
      let rows = [...db.walletTransactions];
      if (params.type) rows = rows.filter((t) => t.type === params.type);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((t) => norm(t.user?.name).includes(q) || norm(t.description).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 12));
    },
    adjust: (userId: string, deltaPaise: number, description: string) => {
      const w = db.wallets.find((x) => x.userId === userId);
      if (w) {
        w.balance = Math.max(0, w.balance + deltaPaise);
        const txn: WalletTransaction = {
          id: `wt_adj_${Date.now()}`,
          type: deltaPaise >= 0 ? 'CREDIT' : 'DEBIT',
          amount: Math.abs(deltaPaise),
          balanceAfter: w.balance,
          description: `Admin adjustment: ${description}`,
          createdAt: new Date().toISOString(),
          walletId: w.id,
          user: w.user,
        };
        w.transactions!.unshift(txn);
        db.walletTransactions.unshift(txn);
      }
      return delay({ wallet: w! });
    },
  },

  coupons: {
    list: () => delay({ coupons: [...db.coupons].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) }),
    create: (data: Omit<Coupon, 'id' | 'createdAt' | 'redemptions'>) => {
      const coupon: Coupon = { ...data, id: `cp${Date.now()}`, createdAt: new Date().toISOString(), redemptions: 0 };
      db.coupons.unshift(coupon);
      return delay({ coupon });
    },
    update: (id: string, patch: Partial<Coupon>) => {
      const c = db.coupons.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
      return delay({ coupon: c! });
    },
    remove: (id: string) => {
      const i = db.coupons.findIndex((x) => x.id === id);
      if (i >= 0) db.coupons.splice(i, 1);
      return delay({ ok: true as const });
    },
  },

  faqs: {
    list: () => delay({ faqs: [...db.faqs].sort((a, b) => a.order - b.order) }),
    create: (data: { question: string; answer: string; audience: FaqAudience; isActive: boolean }) => {
      // New entries land at the bottom, matching the backend.
      const order = db.faqs.reduce((max, f) => Math.max(max, f.order), 0) + 1;
      const now = new Date().toISOString();
      const faq: Faq = { ...data, id: `f${Date.now()}`, order, createdAt: now, updatedAt: now };
      db.faqs.push(faq);
      return delay({ faq });
    },
    update: (id: string, patch: Partial<Faq>) => {
      const f = db.faqs.find((x) => x.id === id);
      if (f) Object.assign(f, patch, { updatedAt: new Date().toISOString() });
      return delay({ faq: f! });
    },
    remove: (id: string) => {
      const i = db.faqs.findIndex((x) => x.id === id);
      if (i >= 0) db.faqs.splice(i, 1);
      return delay({ ok: true as const });
    },
    reorder: (ids: string[]) => {
      ids.forEach((id, i) => {
        const f = db.faqs.find((x) => x.id === id);
        if (f) f.order = i + 1;
      });
      return delay({ ok: true as const });
    },
  },

  legal: {
    list: () => delay({ pages: [...db.legalPages].sort((a, b) => a.order - b.order) }),
    create: (data: { slug: string; title: string; content: string; isActive: boolean }) => {
      // New pages land at the bottom, matching the backend.
      const order = db.legalPages.reduce((max, p) => Math.max(max, p.order), 0) + 1;
      const now = new Date().toISOString();
      const page: LegalPage = { ...data, id: `lp${Date.now()}`, order, createdAt: now, updatedAt: now };
      db.legalPages.push(page);
      return delay({ page });
    },
    update: (id: string, patch: Partial<LegalPage>) => {
      const p = db.legalPages.find((x) => x.id === id);
      if (p) Object.assign(p, patch, { updatedAt: new Date().toISOString() });
      return delay({ page: p! });
    },
    remove: (id: string) => {
      const i = db.legalPages.findIndex((x) => x.id === id);
      if (i >= 0) db.legalPages.splice(i, 1);
      return delay({ ok: true as const });
    },
    reorder: (ids: string[]) => {
      ids.forEach((id, i) => {
        const p = db.legalPages.find((x) => x.id === id);
        if (p) p.order = i + 1;
      });
      return delay({ ok: true as const });
    },
  },

  // Outbound SMS/WhatsApp delivery log. The mock session has no real sends, so
  // this returns a small illustrative set rather than an empty table.
  messages: {
    list: (params: ListParams = {}) => {
      let rows = [...db.messageLogs];
      if (params.channel) rows = rows.filter((m) => m.channel === params.channel);
      if (params.status) rows = rows.filter((m) => m.status === params.status);
      if (params.userId) rows = rows.filter((m) => m.userId === params.userId);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter(
          (m) => norm(m.to).includes(q) || norm(m.event).includes(q) || norm(m.body).includes(q),
        );
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const summary = {
        sent: db.messageLogs.filter((m) => m.status === 'SENT').length,
        failed: db.messageLogs.filter((m) => m.status === 'FAILED').length,
        skipped: db.messageLogs.filter((m) => m.status === 'SKIPPED').length,
      };
      return delay({ ...paginate(rows, params.page, params.limit ?? 20), summary, retentionDays: 90 });
    },
  },

  notifications: {
    remove: (id: string) => {
      const i = db.notifications.findIndex((x) => x.id === id);
      if (i >= 0) db.notifications.splice(i, 1);
      return delay({ ok: true as const });
    },
    history: () => delay({ notifications: [...db.notifications] }),
    broadcast: (data: { title: string; body: string; audience: string }) => {
      const n: Notification = {
        id: `n${Date.now()}`,
        type: 'SYSTEM',
        title: data.title,
        body: data.body,
        read: false,
        createdAt: new Date().toISOString(),
      };
      db.notifications.unshift(n);
      return delay({ sentTo: data.audience, count: db.users.length });
    },
  },

  conversations: {
    remove: (id: string) => {
      const i = db.conversations.findIndex((x) => x.id === id);
      if (i >= 0) db.conversations.splice(i, 1);
      return delay({ ok: true as const });
    },
    list: (params: ListParams = {}) => {
      let rows = [...db.conversations];
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((c) => norm(c.customer?.name).includes(q) || norm(c.provider?.user?.name).includes(q));
      }
      rows.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    get: (id: string) => delay({ conversation: db.conversations.find((c) => c.id === id)! }),
    reply: (id: string, body: string) => {
      const convo = db.conversations.find((c) => c.id === id);
      const message: ChatMessage = {
        id: `m${Date.now()}`,
        conversationId: id,
        senderId: 'admin1',
        body,
        attachments: [],
        createdAt: new Date().toISOString(),
        fromSupport: true,
      };
      convo?.messages?.push(message);
      if (convo) convo.updatedAt = message.createdAt;
      return delay({ message });
    },
  },

  // Gateway payments + refunds, derived from bookings that carry a payment.
  payments: {
    list: (params: ListParams = {}) => {
      let rows: PaymentRecord[] = db.bookings
        .filter((b) => b.paymentStatus !== 'PENDING' || b.paymentMethod != null)
        .map((b) => ({
          id: b.id,
          bookingId: b.id,
          amount: b.amount,
          method: b.paymentMethod,
          status: b.paymentStatus,
          couponCode: b.couponCode,
          discount: b.discount,
          createdAt: b.createdAt,
          refundedAt: b.paymentStatus === 'REFUNDED' ? b.cancelledAt : null,
          customer: b.customer,
          provider: b.provider ? { id: b.provider.id, user: b.provider.user } : undefined,
          serviceTitle: b.service?.title ?? null,
        }));
      if (params.status) rows = rows.filter((p) => p.status === params.status);
      if (params.method) rows = rows.filter((p) => p.method === params.method);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((p) => norm(p.customer?.name).includes(q) || p.bookingId.includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 12));
    },
    stats: () => {
      const rows = db.bookings;
      const sum = (s: PaymentStatus) => rows.filter((b) => b.paymentStatus === s).reduce((a, b) => a + b.amount, 0);
      return delay({
        stats: {
          collectedPaise: sum('PAID'),
          refundedPaise: sum('REFUNDED'),
          pendingPaise: rows.filter((b) => b.paymentStatus === 'PENDING').reduce((a, b) => a + b.amount, 0),
          failedCount: rows.filter((b) => b.paymentStatus === 'FAILED').length,
        },
      });
    },
    refund: (bookingId: string) => {
      const b = db.bookings.find((x) => x.id === bookingId);
      if (b) b.paymentStatus = 'REFUNDED';
      return delay({ ok: true as const });
    },
  },

  // Support tickets — triage queue + thread.
  tickets: {
    create: (data: {
      requesterId: string; subject: string; message: string;
      category?: TicketCategory; priority?: TicketPriority; bookingId?: string;
      attachments?: string[]; assignToMe?: boolean;
    }) => {
      const requester = db.users.find((u) => u.id === data.requesterId);
      const now = new Date().toISOString();
      // One id, reused below — two Date.now() calls can straddle a millisecond
      // and leave the opening message pointing at a ticket that doesn't exist.
      const id = `t${Date.now()}`;
      const me = MOCK_ADMINS[0];
      const ticket: SupportTicket = {
        id,
        subject: data.subject,
        category: data.category ?? 'OTHER',
        status: data.assignToMe ? 'IN_PROGRESS' : 'OPEN',
        priority: data.priority ?? 'MEDIUM',
        requesterId: data.requesterId,
        requester: requester && {
          id: requester.id, name: requester.name, avatar: requester.avatar,
          phone: requester.phone, email: requester.email, role: requester.role,
        },
        // assignToMe claims it for the logged-in admin, same as the backend.
        assigneeId: data.assignToMe ? me.id : null,
        assignee: data.assignToMe ? { id: me.id, name: me.name } : null,
        bookingId: data.bookingId ?? null,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
        closedAt: null,
        lastReplyAt: now,
        messages: [{
          id: `tm${id}`,
          ticketId: id,
          senderId: me.id,
          fromAdmin: true,
          body: data.message,
          attachments: data.attachments ?? [],
          createdAt: now,
          sender: { id: me.id, name: me.name, avatar: me.avatar },
        }],
        _count: { messages: 1 },
      };
      db.tickets.unshift(ticket);
      return delay({ ticket });
    },
    remove: (id: string) => {
      const i = db.tickets.findIndex((x) => x.id === id);
      if (i >= 0) db.tickets.splice(i, 1);
      return delay({ ok: true as const });
    },
    stats: () => {
      const active = db.tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
      return delay({
        stats: {
          open: db.tickets.filter((t) => t.status === 'OPEN').length,
          inProgress: db.tickets.filter((t) => t.status === 'IN_PROGRESS').length,
          waiting: db.tickets.filter((t) => t.status === 'WAITING').length,
          resolved: db.tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
          urgent: active.filter((t) => t.priority === 'URGENT').length,
        },
      });
    },
    // Active admins available to own a ticket. The mock has no ADMIN rows in
    // db.users, so this mirrors the fixed staff list the mock session uses.
    assignees: () => delay({ assignees: MOCK_ADMINS.map((a) => ({ ...a })) }),
    list: (params: ListParams = {}) => {
      let rows = [...db.tickets];
      if (params.status) rows = rows.filter((t) => t.status === params.status);
      if (params.priority) rows = rows.filter((t) => t.priority === params.priority);
      if (params.category) rows = rows.filter((t) => t.category === params.category);
      if (params.assigneeId) {
        rows = params.assigneeId === 'unassigned'
          ? rows.filter((t) => !t.assigneeId)
          : rows.filter((t) => t.assigneeId === params.assigneeId);
      }
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((t) => norm(t.subject).includes(q) || norm(t.requester?.name).includes(q));
      }
      rows.sort((a, b) => +new Date(b.lastReplyAt) - +new Date(a.lastReplyAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    // Rejects on a missing ticket rather than resolving `{ ticket: undefined }`.
    // The thread polls this; handing back undefined would blank a thread the
    // admin is reading into a permanent skeleton instead of leaving it alone.
    get: (id: string) => {
      const ticket = db.tickets.find((t) => t.id === id);
      return ticket ? delay({ ticket }) : Promise.reject(new Error('Ticket not found'));
    },
    update: (id: string, patch: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null }) => {
      const t = db.tickets.find((x) => x.id === id);
      if (t) {
        if (patch.status) {
          t.status = patch.status;
          if (patch.status === 'RESOLVED') t.resolvedAt = new Date().toISOString();
          if (patch.status === 'CLOSED') t.closedAt = new Date().toISOString();
        }
        if (patch.priority) t.priority = patch.priority;
        if (patch.assigneeId !== undefined) {
          const staff = MOCK_ADMINS.find((a) => a.id === patch.assigneeId);
          t.assigneeId = staff ? staff.id : null;
          t.assignee = staff ? { id: staff.id, name: staff.name } : null;
        }
      }
      return delay({ ticket: t! });
    },
    reply: (id: string, body: string, attachments?: string[]) => {
      const t = db.tickets.find((x) => x.id === id);
      const me = MOCK_ADMINS[0];
      const msg: TicketMessage = {
        id: `tm_${id}_${Date.now()}`,
        ticketId: id,
        senderId: me.id,
        fromAdmin: true,
        body,
        attachments: attachments ?? [],
        createdAt: new Date().toISOString(),
        sender: { id: me.id, name: me.name, avatar: me.avatar },
      };
      if (t) {
        t.messages = [...(t.messages ?? []), msg];
        t.lastReplyAt = msg.createdAt;
        if (t.status === 'OPEN' || t.status === 'IN_PROGRESS') t.status = 'WAITING';
        // Replying claims an untriaged ticket, same as the real backend.
        if (!t.assigneeId) { t.assigneeId = me.id; t.assignee = { id: me.id, name: me.name }; }
        t._count = { messages: t.messages.length };
      }
      return delay({ message: msg });
    },
  },

  // Referral program: one row per referrer with invitees + ₹100/referral payout.
  referrals: {
    list: (params: ListParams = {}) => {
      // Build referrer→referred map from seeded referredById links (none by
      // default), plus synthesize plausible chains so the screen has data.
      const referrers = db.users.filter((u) => u.role === 'CUSTOMER' && (u.bookingsCount ?? 0) > 0);
      let rows: ReferralRow[] = referrers.map((u, i) => {
        const referredCount = (i * 7) % 5; // deterministic 0..4
        const referred = db.users.filter((x) => x.role === 'CUSTOMER' && x.id !== u.id).slice(i, i + referredCount);
        return {
          id: u.id,
          name: u.name,
          phone: u.phone,
          avatar: u.avatar,
          referralCode: u.referralCode,
          referredCount,
          earningsPaise: referredCount * 100 * 100,
          referredUsers: referred.map((r) => ({ id: r.id, name: r.name, phone: r.phone, createdAt: r.createdAt })),
        };
      });
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((r) => norm(r.name).includes(q) || norm(r.referralCode).includes(q) || norm(r.phone).includes(q));
      }
      rows.sort((a, b) => b.referredCount - a.referredCount);
      const totals = {
        activeReferrers: rows.length,
        totalReferred: rows.reduce((s, r) => s + r.referredCount, 0),
        totalPayoutPaise: rows.reduce((s, r) => s + r.earningsPaise, 0),
      };
      return delay({ ...paginate(rows, params.page, params.limit ?? 10), totals });
    },
  },

  settings: {
    get: () =>
      delay({
        settings: {
          platformCommissionPercent: 15,
          referralRewardRupees: 100,
          supportEmail: 'support@janshram.in',
          supportPhone: '+91 1800 000 000',
          providerAutoApproval: false,
          maintenanceMode: false,
          smsBookingAlerts: true,
          whatsappBookingAlerts: true,
        },
      }),
    update: (patch: Partial<PlatformSettings>) =>
      delay({
        settings: {
          platformCommissionPercent: 15,
          referralRewardRupees: 100,
          supportEmail: 'support@janshram.in',
          supportPhone: '+91 1800 000 000',
          providerAutoApproval: false,
          maintenanceMode: false,
          smsBookingAlerts: true,
          whatsappBookingAlerts: true,
          ...patch,
        },
      }),
  },

  audit: {
    list: (params: ListParams = {}) => {
      let rows = [...db.auditLog];
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((e) => norm(e.action).includes(q) || norm(e.target).includes(q) || norm(e.actor).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 20));
    },
  },

  otpLogs: {
    list: (params: ListParams = {}) => {
      let rows = [...db.otpLogs];
      if (params.status) rows = rows.filter((o) => (params.status === 'consumed' ? o.consumed : params.status === 'expired' ? o.expired : !o.consumed && !o.expired));
      if (params.q) rows = rows.filter((o) => o.phone.includes(params.q as string));
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return delay(paginate(rows, params.page, params.limit ?? 20));
    },
  },

  // Nothing is stored in mock mode. Returning a data-less object URL would
  // break on reload, so we hand back a stable placeholder image instead —
  // enough for the attachment UI to render and round-trip.
  uploads: {
    presign: (folder: UploadFolder, filename: string, _contentType: string) =>
      delay<PresignResult>({
        uploadUrl: null,
        publicUrl: `https://placehold.co/400x300?text=${encodeURIComponent(filename.slice(0, 20))}`,
        key: `${folder}/mock-${filename}`,
        mock: true,
      }),
  },

  // Client-side CSV from the in-memory dataset (mirrors the backend export).
  exportCsv: (entity: string) => {
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const build = (headers: string[], rows: unknown[][]) => [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const rupees = (p: number) => (p / 100).toFixed(2);
    let csv = '';
    if (entity === 'users') csv = build(['ID', 'Name', 'Phone', 'Email', 'Role', 'City', 'Active'], db.users.map((u) => [u.id, u.name, u.phone, u.email, u.role, u.city, u.isActive ? 'yes' : 'no']));
    else if (entity === 'providers') csv = build(['ID', 'Name', 'Business', 'Verified', 'Rating', 'Jobs'], db.providers.map((p) => [p.id, p.user?.name, p.businessName, p.isVerified ? 'yes' : 'no', p.rating, p.completedJobs]));
    else if (entity === 'bookings') csv = build(['ID', 'Customer', 'Provider', 'Amount', 'Status', 'Payment'], db.bookings.map((b) => [b.id, b.customer?.name, b.provider?.user?.name, rupees(b.amount), b.status, b.paymentStatus]));
    else if (entity === 'payments') csv = build(['Booking', 'Customer', 'Amount', 'Method', 'Status'], db.bookings.map((b) => [b.id, b.customer?.name, rupees(b.amount), b.paymentMethod, b.paymentStatus]));
    else if (entity === 'payouts') csv = build(['ID', 'Provider', 'Amount', 'UPI', 'Status'], db.payouts.map((p) => [p.id, p.provider?.name, rupees(p.amount), p.upiId, p.status]));
    return delay(csv);
  },

  payouts: {
    list: (params: ListParams = {}) => {
      let rows = [...db.payouts];
      if (params.status) rows = rows.filter((p) => p.status === params.status);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((p) => norm(p.provider?.name).includes(q) || norm(p.provider?.phone).includes(q));
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const requested = db.payouts.filter((p) => p.status === 'REQUESTED');
      const pending = { count: requested.length, amountPaise: requested.reduce((s, p) => s + p.amount, 0) };
      const paged = paginate(rows, params.page, params.limit ?? 10);
      return delay({ ...paged, pending });
    },
    update: (id: string, status: 'PAID' | 'REJECTED', note?: string) => {
      const p = db.payouts.find((x) => x.id === id);
      if (p) { p.status = status; p.note = note ?? null; p.processedAt = new Date().toISOString(); }
      return delay({ payout: p! });
    },
  },
};

export type AdminApi = typeof mockAdapter;
