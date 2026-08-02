import { useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { SearchInput, UserCell, fmtDateTime } from '../components/common';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../components/ui/utils';
import type { Conversation } from '../lib/types';

export function Conversations() {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useApi(() => adminApi.conversations.list({ q, limit: 50 }), [q]);
  const thread = useApi(
    () => (selectedId ? adminApi.conversations.get(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  const rows = list.data?.data ?? [];
  const conv = thread.data?.conversation;

  return (
    <div>
      <PageHeader title="Support Chats" description="Monitor conversations between customers and providers" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[480px]">
        <Card className="lg:col-span-1 flex flex-col overflow-hidden p-0">
          <div className="p-3 border-b">
            <SearchInput value={q} onChange={setQ} placeholder="Search participants…" />
          </div>
          <ScrollArea className="flex-1">
            {list.loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              rows.map((c: Conversation) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'w-full text-left px-3 py-3 border-b hover:bg-accent transition-colors',
                    selectedId === c.id && 'bg-accent',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{c.customer?.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">with {c.provider?.user?.name}</div>
                  {c.lastMessage && <div className="text-xs text-muted-foreground/80 truncate mt-0.5">{c.lastMessage.body}</div>}
                </button>
              ))
            )}
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-2 flex flex-col overflow-hidden p-0">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessagesSquare className="size-10 mb-2 opacity-40" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          ) : thread.loading || !conv ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3" />)}
            </div>
          ) : (
            <>
              <CardHeader className="border-b">
                <CardTitle className="text-base">
                  {conv.customer?.name} <span className="text-muted-foreground font-normal">↔ {conv.provider?.user?.name}</span>
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {conv.messages?.map((m) => {
                    const fromCustomer = m.senderId === conv.customerId;
                    return (
                      <div key={m.id} className={cn('flex', fromCustomer ? 'justify-start' : 'justify-end')}>
                        <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2', fromCustomer ? 'bg-muted' : 'bg-primary text-primary-foreground')}>
                          {(m.attachments?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-1.5 mb-1">
                              {m.attachments!.map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="attachment" className="rounded-lg max-h-40 object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                          {m.body && <p className="text-sm">{m.body}</p>}
                          <p className={cn('text-[10px] mt-1', fromCustomer ? 'text-muted-foreground' : 'text-primary-foreground/70')}>{fmtDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
