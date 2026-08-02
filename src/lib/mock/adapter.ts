// Mock implementation of the AdminApi surface. Operates on the in-memory
// dataset in ./data with a small artificial latency so the UI exercises its
// loading states. Mutations persist for the session (module-level arrays).

import * as db from './data';
import type {
  User, ProviderProfile, Service, Booking, Tender, Wallet, WalletTransaction,
  Review, Coupon, Notification, Conversation, Category, DashboardStats,
  TimeseriesPoint, CategoryBreakdown, AuditLogEntry, Paginated, BookingStatus,
  AdminProfile, Address, Favorite, PaymentRecord, ReferralRow, PaymentStatus,
  TicketMessage, TicketStatus, TicketPriority, PlatformSettings,
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
      rows.sort((a, b) => b.rating - a.rating);
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
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
      return delay({ providers: rows });
    },
  },

  categories: {
    list: () => delay({ categories: [...db.categories] }),
    create: (data: { name: string; icon: string }) => {
      const cat: Category = { id: `c${Date.now()}`, name: data.name, icon: data.icon, serviceCount: 0 };
      db.categories.push(cat);
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
    list: (params: ListParams = {}) => {
      let rows = [...db.reviews];
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
    list: () => delay({ coupons: [...db.coupons] }),
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

  notifications: {
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
    list: (params: ListParams = {}) => {
      let rows = [...db.tickets];
      if (params.status) rows = rows.filter((t) => t.status === params.status);
      if (params.priority) rows = rows.filter((t) => t.priority === params.priority);
      if (params.category) rows = rows.filter((t) => t.category === params.category);
      if (params.q) {
        const q = norm(params.q as string);
        rows = rows.filter((t) => norm(t.subject).includes(q) || norm(t.requester?.name).includes(q));
      }
      rows.sort((a, b) => +new Date(b.lastReplyAt) - +new Date(a.lastReplyAt));
      return delay(paginate(rows, params.page, params.limit ?? 10));
    },
    get: (id: string) => delay({ ticket: db.tickets.find((t) => t.id === id)! }),
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
          t.assigneeId = patch.assigneeId;
          t.assignee = patch.assigneeId ? { id: 'admin1', name: 'Platform Admin' } : null;
        }
      }
      return delay({ ticket: t! });
    },
    reply: (id: string, body: string) => {
      const t = db.tickets.find((x) => x.id === id);
      const msg: TicketMessage = {
        id: `tm_${id}_${Date.now()}`,
        ticketId: id,
        senderId: 'admin1',
        fromAdmin: true,
        body,
        createdAt: new Date().toISOString(),
        sender: { id: 'admin1', name: 'Platform Admin', avatar: null },
      };
      if (t) {
        t.messages = [...(t.messages ?? []), msg];
        t.lastReplyAt = msg.createdAt;
        if (t.status === 'OPEN' || t.status === 'IN_PROGRESS') t.status = 'WAITING';
        if (!t.assigneeId) { t.assigneeId = 'admin1'; t.assignee = { id: 'admin1', name: 'Platform Admin' }; }
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
