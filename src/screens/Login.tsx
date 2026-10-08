import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { isMock } from '../lib/api';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';

/** Remembered between visits so a returning admin types one thing, not two. */
const REMEMBERED_EMAIL = 'janshram.admin.email';

/** What this console is for, in the four words an admin would use. */
const CAPABILITIES = [
  { Icon: Users, title: 'Manage Users', sub: '& Service Providers', tint: 'bg-blue-500' },
  { Icon: BarChart3, title: 'Monitor Payments', sub: '& Subscriptions', tint: 'bg-emerald-500' },
  { Icon: Briefcase, title: 'Bookings & Jobs', sub: 'Management', tint: 'bg-orange-500' },
  { Icon: Settings, title: 'Platform Settings', sub: '& Growth Tools', tint: 'bg-violet-500' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const remembered = typeof localStorage === 'undefined' ? null : localStorage.getItem(REMEMBERED_EMAIL);
  const [email, setEmail] = useState(isMock ? 'admin@janshram.in' : remembered ?? '');
  const [password, setPassword] = useState(isMock ? 'admin123' : '');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);

  const from = (location.state as { from?: string })?.from ?? '/';

  // Unticking it should forget them now, not at the next successful sign-in —
  // somebody turning it off on a shared machine means now.
  useEffect(() => {
    if (!remember) localStorage.removeItem(REMEMBERED_EMAIL);
  }, [remember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem(REMEMBERED_EMAIL, email);
      toast.success('Welcome back, Admin');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_minmax(0,1fr)]">
      {/* ── What this console is ──
          Hidden below lg: on a phone the form is the whole point, and a
          marketing panel above it is a screen of scrolling before the one
          field anybody came to fill in. */}
      <aside className="relative hidden lg:flex flex-col justify-center overflow-hidden px-12 py-10">
        {/* The soft blue wash and the shapes behind it, in CSS rather than an
            image — it scales to any window and costs nothing to load. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, #eff6ff 0%, #e0efff 45%, #dbeafe 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, #bfdbfe 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-20 -z-10 size-[26rem] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #93c5fd 0%, transparent 70%)' }}
        />

        <div>
          {/* The lockup in markup rather than the logo file: the artwork we
              have is a dark-background render, which would sit on this pale
              panel as a black rectangle. Drawn this way it is crisp at any
              size and works in both themes. */}
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <Users className="size-6 text-[#1e3a8a]" />
            </span>
            <span className="leading-none">
              <span className="block text-3xl font-extrabold tracking-tight">
                <span className="text-[#1e3a8a]">Jan</span>
                <span className="text-[#f97316]">shram</span>
              </span>
              <span className="mt-1 block text-[11px] font-medium text-[#1e3a8a]/70">
                India&rsquo;s AI-Powered Labour &amp; Service Marketplace
              </span>
            </span>
          </div>

          <h2 className="mt-10 max-w-[22ch] text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-slate-900">
            Manage the Workforce Marketplace with{' '}
            <span className="text-[#0A84FF]">Confidence</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600">
            Access powerful admin tools to manage users, services, bookings, payments, and grow the
            Janshram ecosystem.
          </p>

          <ul className="mt-8 grid max-w-lg grid-cols-2 gap-3">
            {CAPABILITIES.map(({ Icon, title, sub, tint }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur-sm"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tint}`}>
                  <Icon className="size-[18px] text-white" />
                </span>
                <span className="min-w-0 text-[13px] font-semibold leading-tight text-slate-800">
                  {title}
                  <span className="block font-medium text-slate-500">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* A photograph of the crew belongs under this, as in the design. We
            do not have the file, so the column is centred and stands without
            it rather than holding a void open for something that may never
            arrive. Drop an <img> in here and switch justify-center back to
            justify-between. */}
      </aside>

      {/* ── Signing in ── */}
      <main className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-5" style={{ background: 'var(--muted)' }}>
        <div className="w-full min-w-0 max-w-md rounded-3xl border bg-card px-5 py-8 shadow-xl shadow-black/5 sm:px-8 sm:py-10">
          <div className="text-center">
            <h1 className="text-[26px] font-bold tracking-tight">Janshram Admin</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Master console — manage the marketplace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@janshram.in"
                  required
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  aria-label="Remember me"
                />
                {/* Says what it does. It remembers the address, not the
                    session — nothing here can keep you signed in longer than
                    the token the server issues. */}
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowResetHelp((v) => !v)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* There is no self-service reset, so this says what actually has
                to happen instead of linking somewhere that cannot help. */}
            {showResetHelp && (
              <p className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                An admin password is reset on the server, not from here. Ask whoever runs the
                deployment to set a new one and sign in with that.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="size-4" /> Sign in
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <span className="text-[13px] leading-snug">
              <span className="block font-semibold">Secure Admin Access</span>
              <span className="block text-muted-foreground">
                Your data is protected with industry standard security.
              </span>
            </span>
          </div>

          {isMock && (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Demo build — any credentials work.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
