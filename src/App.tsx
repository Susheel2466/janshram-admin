import { lazy, Suspense, ComponentType } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RequireAuth, RedirectIfAuthed } from './components/RouteGuards';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './screens/Login';
import { OfflineBanner } from './components/OfflineBanner';

// Lazy-load routed screens so each becomes its own chunk. Recharts (Dashboard)
// and the heavier CRUD screens no longer weigh down the initial bundle.
// Screens use named exports, so map the named export onto `default`.
const named =
  <M extends Record<string, ComponentType<unknown>>>(loader: () => Promise<M>, key: keyof M) =>
    lazy(() => loader().then((m) => ({ default: m[key] })));

const Dashboard = named(() => import('./screens/Dashboard'), 'Dashboard');
const Users = named(() => import('./screens/Users'), 'Users');
const UserDetail = named(() => import('./screens/UserDetail'), 'UserDetail');
const Providers = named(() => import('./screens/Providers'), 'Providers');
const ProviderDetail = named(() => import('./screens/ProviderDetail'), 'ProviderDetail');
const Verifications = named(() => import('./screens/Verifications'), 'Verifications');
const Categories = named(() => import('./screens/Categories'), 'Categories');
const Services = named(() => import('./screens/Services'), 'Services');
const Bookings = named(() => import('./screens/Bookings'), 'Bookings');
const BookingDetail = named(() => import('./screens/BookingDetail'), 'BookingDetail');
const Tenders = named(() => import('./screens/Tenders'), 'Tenders');
const TenderDetail = named(() => import('./screens/TenderDetail'), 'TenderDetail');
const Reviews = named(() => import('./screens/Reviews'), 'Reviews');
const Wallets = named(() => import('./screens/Wallets'), 'Wallets');
const Payments = named(() => import('./screens/Payments'), 'Payments');
const Referrals = named(() => import('./screens/Referrals'), 'Referrals');
const Payouts = named(() => import('./screens/Payouts'), 'Payouts');
const Coupons = named(() => import('./screens/Coupons'), 'Coupons');
const Notifications = named(() => import('./screens/Notifications'), 'Notifications');
const Messages = named(() => import('./screens/Messages'), 'Messages');
const Conversations = named(() => import('./screens/Conversations'), 'Conversations');
const Tickets = named(() => import('./screens/Tickets'), 'Tickets');
const Faqs = named(() => import('./screens/Faqs'), 'Faqs');
const LegalPages = named(() => import('./screens/LegalPages'), 'LegalPages');
const Settings = named(() => import('./screens/Settings'), 'Settings');
const AuditLog = named(() => import('./screens/AuditLog'), 'AuditLog');
const LoginAudit = named(() => import('./screens/LoginAudit'), 'LoginAudit');
const NotFound = named(() => import('./screens/NotFound'), 'NotFound');

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Above every route, including login. */}
          <OfflineBanner />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />

              <Route
                element={
                  <RequireAuth>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/users/:id" element={<UserDetail />} />
                <Route path="/providers" element={<Providers />} />
                <Route path="/providers/:id" element={<ProviderDetail />} />
                <Route path="/verifications" element={<Verifications />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/services" element={<Services />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route path="/tenders" element={<Tenders />} />
                <Route path="/tenders/:id" element={<TenderDetail />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/wallets" element={<Wallets />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/payouts" element={<Payouts />} />
                <Route path="/coupons" element={<Coupons />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/conversations" element={<Conversations />} />
              <Route path="/tickets" element={<Tickets />} />
                <Route path="/faqs" element={<Faqs />} />
                <Route path="/legal" element={<LegalPages />} />
                <Route path="/settings" element={<Settings />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/login-audit" element={<LoginAudit />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
