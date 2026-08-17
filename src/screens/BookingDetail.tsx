import { useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { adminApi, formatINR } from '../lib/api';
import { useApi } from '../lib/useApi';
import { BackLink, Field } from '../components/detail';
import { UserCell, PhoneLink, fmtDateTime } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { FilterSelect } from '../components/FilterSelect';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { BookingStatus } from '../lib/types';

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, refetch } = useApi(() => adminApi.bookings.get(id!), [id]);
  const b = data?.booking;
  const [refunding, setRefunding] = useState(false);

  const changeStatus = async (status: string) => {
    await adminApi.bookings.setStatus(id!, status as BookingStatus);
    toast.success(`Status set to ${status.toLowerCase().replace('_', ' ')}`);
    refetch();
  };
  const refund = async () => {
    await adminApi.bookings.refund(id!);
    toast.success('Booking refunded');
    setRefunding(false);
    refetch();
  };

  if (loading || !b) {
    return (
      <div>
        <BackLink to="/bookings" label="Back to Bookings" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <BackLink to="/bookings" label="Back to Bookings" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-medium">{b.service?.title ?? 'Custom booking'}</h1>
          <p className="text-sm text-muted-foreground font-mono">#{b.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            value={b.status}
            onChange={changeStatus}
            options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
            className="w-[160px] bg-background"
          />
          {b.paymentStatus === 'PAID' && (
            <Button variant="outline" onClick={() => setRefunding(true)}>
              <RotateCcw className="size-4" /> Refund
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Booking</CardTitle></CardHeader>
          <CardContent>
            <Field label="Status" value={<StatusBadge status={b.status} />} />
            <Field label="Scheduled" value={fmtDateTime(b.scheduledAt)} />
            <Field label="Address" value={b.address} />
            {b.landmark && <Field label="Landmark" value={b.landmark} />}
            {b.pincode && <Field label="PIN code" value={b.pincode} />}
            {/* Who the worker asks for on arrival — the number support rings
                first when a job goes wrong. */}
            {b.contactPhone && (
              <Field
                label="Contact at location"
                value={
                  <span className="flex items-center justify-end gap-2">
                    {b.contactName ?? '—'}
                    <PhoneLink phone={b.contactPhone} />
                  </span>
                }
              />
            )}
            <Field label="Notes" value={b.notes} />
            <Field label="Created" value={fmtDateTime(b.createdAt)} />
            {b.completedAt && <Field label="Completed" value={fmtDateTime(b.completedAt)} />}
            {b.cancelledAt && <Field label="Cancelled" value={fmtDateTime(b.cancelledAt)} />}
            {b.cancelReason && <Field label="Cancel reason" value={b.cancelReason} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
          <CardContent>
            <Field label="Amount" value={<span className="text-base font-semibold">{formatINR(b.amount)}</span>} />
            {b.discount > 0 && <Field label="Discount" value={`− ${formatINR(b.discount)}`} />}
            {b.couponCode && <Field label="Coupon" value={b.couponCode} />}
            <Field label="Method" value={b.paymentMethod ?? '—'} />
            <Field label="Payment status" value={<StatusBadge status={b.paymentStatus} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent>
            <UserCell name={b.customer?.name} sub={<PhoneLink phone={b.customer?.phone} />} avatar={b.customer?.avatar} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Provider</CardTitle></CardHeader>
          <CardContent>
            <UserCell name={b.provider?.user?.name} sub={b.provider?.businessName} avatar={b.provider?.user?.avatar} />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={refunding} onOpenChange={setRefunding}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund {formatINR(b.amount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              The amount will be credited back to the customer’s wallet and payment marked as refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={refund}>Confirm refund</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
