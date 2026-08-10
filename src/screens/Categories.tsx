import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { CategoryIcon, IconPicker, IconUpload, isCustomIcon } from '../components/CategoryIcon';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { Category } from '../lib/types';

export function Categories() {
  const { data, loading, refetch } = useApi(() => adminApi.categories.list(), []);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('wrench');
  const [iconTab, setIconTab] = useState<'library' | 'custom'>('library');

  const openCreate = () => {
    setEditing(null); setName(''); setIcon('wrench'); setIconTab('library'); setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c); setName(c.name); setIcon(c.icon ?? 'wrench');
    setIconTab(isCustomIcon(c.icon) ? 'custom' : 'library');
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (editing) {
      await adminApi.categories.update(editing.id, { name, icon });
      toast.success('Category updated');
    } else {
      await adminApi.categories.create({ name, icon });
      toast.success('Category created');
    }
    setOpen(false);
    refetch();
  };

  const remove = async () => {
    if (!toDelete) return;
    await adminApi.categories.remove(toDelete.id);
    toast.success('Category deleted');
    setToDelete(null);
    refetch();
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Service categories shown across the app"
        actions={<Button onClick={openCreate}><Plus className="size-4" /> New category</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : data?.categories.map((c) => (
              <Card key={c.id} className="p-5 group">
                <div className="flex items-start justify-between">
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <CategoryIcon icon={c.icon} className="size-5" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setToDelete(c)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 font-medium">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.serviceCount} services</div>
              </Card>
            ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pest Control" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Icon</Label>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                    <CategoryIcon icon={icon} className="size-3.5" />
                  </span>
                  {isCustomIcon(icon) ? 'custom image' : icon}
                </span>
              </div>
              <Tabs value={iconTab} onValueChange={(v) => setIconTab(v as 'library' | 'custom')}>
                <TabsList className="w-full">
                  <TabsTrigger value="library" className="flex-1">Icon library</TabsTrigger>
                  <TabsTrigger value="custom" className="flex-1">Custom image</TabsTrigger>
                </TabsList>
                <TabsContent value="library" className="mt-3">
                  <IconPicker value={isCustomIcon(icon) ? '' : icon} onChange={setIcon} />
                  {isCustomIcon(icon) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      A custom image is set — picking a library icon here replaces it.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="custom" className="mt-3">
                  <IconUpload value={icon} onChange={setIcon} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the category. Services in it must be reassigned. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
