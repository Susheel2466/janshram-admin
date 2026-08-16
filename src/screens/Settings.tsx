import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Moon, Sun, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { Field } from '../components/detail';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { StatusBadge } from '../components/StatusBadge';
import type { PlatformSettings } from '../lib/types';

export function Settings() {
  const { admin } = useAuth();
  const { theme, toggle } = useTheme();

  // Load platform configuration from the backend. No auto-refresh here: the
  // response is copied into `form` below, so a background poll landing mid-edit
  // would silently discard whatever the admin had typed.
  const { data, loading } = useApi(() => adminApi.settings.get(), [], { refreshMs: 0 });
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  const setField = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      await adminApi.settings.update(form);
      toast.success('Configuration saved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Console preferences and platform configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Admin profile</CardTitle></CardHeader>
          <CardContent>
            <Field label="Name" value={admin?.name} />
            <Field label="Email" value={admin?.email} />
            <Field label="Role" value={<StatusBadge status="ADMIN" />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark mode</Label>
                <p className="text-xs text-muted-foreground">Switch the console theme</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggle}>
                {theme === 'dark' ? <><Sun className="size-4" /> Light</> : <><Moon className="size-4" /> Dark</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Platform configuration</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading || !form ? (
              <div className="sm:col-span-2 flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Platform commission (%)</Label>
                  <Input type="number" value={form.platformCommissionPercent}
                    onChange={(e) => setField('platformCommissionPercent', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Referral reward (₹)</Label>
                  <Input type="number" value={form.referralRewardRupees}
                    onChange={(e) => setField('referralRewardRupees', Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Support email</Label>
                  <Input type="email" value={form.supportEmail}
                    onChange={(e) => setField('supportEmail', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Support phone</Label>
                  <Input value={form.supportPhone}
                    onChange={(e) => setField('supportPhone', e.target.value)} />
                </div>
                <div className="flex items-center justify-between sm:col-span-2 pt-1">
                  <div>
                    <Label>Provider auto-approval</Label>
                    <p className="text-xs text-muted-foreground">New providers go live before manual verification</p>
                  </div>
                  <Switch checked={form.providerAutoApproval}
                    onCheckedChange={(v) => setField('providerAutoApproval', v)} />
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <div>
                    <Label>Maintenance mode</Label>
                    <p className="text-xs text-muted-foreground">Temporarily disable customer bookings</p>
                  </div>
                  <Switch checked={form.maintenanceMode}
                    onCheckedChange={(v) => setField('maintenanceMode', v)} />
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <div>
                    <Label>SMS alerts</Label>
                    <p className="text-xs text-muted-foreground">Text users on bookings, payments, bids & chat messages</p>
                  </div>
                  <Switch checked={form.smsBookingAlerts}
                    onCheckedChange={(v) => setField('smsBookingAlerts', v)} />
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <div>
                    <Label>WhatsApp alerts</Label>
                    <p className="text-xs text-muted-foreground">Send the same updates over WhatsApp</p>
                  </div>
                  <Switch checked={form.whatsappBookingAlerts}
                    onCheckedChange={(v) => setField('whatsappBookingAlerts', v)} />
                </div>
                <div className="sm:col-span-2">
                  <Button onClick={save} disabled={saving}>
                    {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : 'Save configuration'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
