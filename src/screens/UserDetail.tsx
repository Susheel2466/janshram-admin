import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { UserX, UserCheck, Wrench, MapPin, Heart, Pencil } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { BackLink, Field } from '../components/detail';
import { UserCell, Stars, fmtDate } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useApi(() => adminApi.users.get(id!), [id]);
  const u = data?.user;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', city: '', area: '' });

  const openEdit = () => {
    if (!u) return;
    setForm({ name: u.name ?? '', email: u.email ?? '', city: u.city ?? '', area: u.area ?? '' });
    setEditing(true);
  };
  const saveEdit = async () => {
    if (!u) return;
    // name/city/area are non-nullable on the backend — omit when blank; email is nullable.
    const patch: Record<string, unknown> = { email: form.email || null };
    if (form.name.trim()) patch.name = form.name.trim();
    if (form.city.trim()) patch.city = form.city.trim();
    if (form.area.trim()) patch.area = form.area.trim();
    await adminApi.users.update(u.id, patch as Parameters<typeof adminApi.users.update>[1]);
    toast.success('User updated');
    setEditing(false);
    refetch();
  };

  const toggleActive = async () => {
    if (!u) return;
    await adminApi.users.setActive(u.id, !u.isActive);
    toast.success(u.isActive ? 'User deactivated' : 'User reactivated');
    refetch();
  };

  if (loading || !u) {
    return (
      <div>
        <BackLink to="/users" label="Back to Users" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <BackLink to="/users" label="Back to Users" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <UserCell name={u.name} sub={<span className="flex items-center gap-2"><StatusBadge status={u.role} /><StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /></span>} avatar={u.avatar} />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEdit}><Pencil className="size-4" /> Edit</Button>
          <Button variant={u.isActive ? 'destructive' : 'default'} onClick={toggleActive}>
            {u.isActive ? <><UserX className="size-4" /> Deactivate</> : <><UserCheck className="size-4" /> Reactivate</>}
          </Button>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>Area</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent>
            <Field label="Phone" value={u.phone} />
            <Field label="Email" value={u.email} />
            <Field label="Role" value={<StatusBadge status={u.role} />} />
            <Field label="City" value={u.city} />
            <Field label="Area" value={u.area} />
            <Field label="Referral code" value={u.referralCode} />
            <Field label="Joined" value={fmtDate(u.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Activity & Wallet</CardTitle></CardHeader>
          <CardContent>
            <Field label="Total bookings" value={u.bookingsCount ?? '—'} />
            <Field label="Total spent" value={u.totalSpentPaise != null ? formatINR(u.totalSpentPaise) : '—'} />
            <Field label="Wallet balance" value={u.wallet ? formatINR(u.wallet.balance) : '—'} />
            <Field label="Booking alerts" value={u.notifyBookings ? 'On' : 'Off'} />
            <Field label="Promotions" value={u.notifyPromotions ? 'On' : 'Off'} />
            <Field label="Reminders" value={u.notifyReminders ? 'On' : 'Off'} />
            <Field label="Chat alerts" value={u.notifyChat ? 'On' : 'Off'} />
          </CardContent>
        </Card>
      </div>

      {u.providerProfile && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="size-4" /> Provider Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              <Field label="Business" value={u.providerProfile.businessName} />
              <Field label="Experience" value={`${u.providerProfile.experience} yrs`} />
              <Field label="Completed jobs" value={u.providerProfile.completedJobs} />
              <Field label="Rating" value={`★ ${u.providerProfile.rating.toFixed(1)} (${u.providerProfile.reviewCount})`} />
            </div>
            <div>
              <Field label="Verified" value={u.providerProfile.isVerified ? 'Yes' : 'No'} />
              <Field label="Available" value={u.providerProfile.isAvailable ? 'Yes' : 'No'} />
              <Field label="Starts at" value={`${formatINR(u.providerProfile.priceFrom)} ${u.providerProfile.pricePer}`} />
              <Field label="Manage" value={<Link to={`/providers/${u.providerProfile.id}`} className="text-primary hover:underline">Open provider →</Link>} />
            </div>
          </CardContent>
        </Card>
      )}

      {u.role === 'CUSTOMER' && <CustomerActivity userId={u.id} />}
    </div>
  );
}

// Saved addresses + favorited providers — customer-only, fetched lazily.
function CustomerActivity({ userId }: { userId: string }) {
  const addresses = useApi(() => adminApi.users.addresses(userId), [userId]);
  const favorites = useApi(() => adminApi.users.favorites(userId), [userId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="size-4" /> Saved Addresses</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {addresses.loading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : (addresses.data?.addresses.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No saved addresses.</p>
          ) : (
            addresses.data!.addresses.map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.label}</span>
                  {a.isDefault && <Badge variant="secondary" className="font-normal text-xs">Default</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{a.line}, {a.city}{a.pincode ? ` — ${a.pincode}` : ''}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Heart className="size-4" /> Favorite Providers</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {favorites.loading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : (favorites.data?.favorites.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No favorites yet.</p>
          ) : (
            favorites.data!.favorites.map((f) => (
              <Link
                key={f.id}
                to={f.provider ? `/providers/${f.provider.id}` : '#'}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 hover:bg-accent transition-colors"
              >
                <UserCell name={f.provider?.user?.name} sub={f.provider?.businessName} avatar={f.provider?.user?.avatar} />
                {f.provider && <Stars rating={f.provider.rating} />}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
