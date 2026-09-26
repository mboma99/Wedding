"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setLobolaInvitedAction } from "@/server/actions/days";
import type { LobolaGuest } from "@/server/days";

/**
 * Tick the guests invited to the lobola. Each tick saves straight away; if it
 * can't, the tick goes back and says why.
 */
export function LobolaGuests({ initialGuests }: { initialGuests: LobolaGuest[] }) {
  const [guests, setGuests] = useState(initialGuests);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [showInvitedOnly, setShowInvitedOnly] = useState(false);

  const invitedCount = guests.filter((guest) => guest.invited).length;
  const query = search.trim().toLowerCase();
  const visible = guests.filter(
    (guest) =>
      (!showInvitedOnly || guest.invited) &&
      (!query || guest.name.toLowerCase().includes(query) || (guest.household ?? "").toLowerCase().includes(query)),
  );

  const groups = new Map<string, LobolaGuest[]>();
  for (const guest of visible) {
    const key = guest.household ? `${guest.side}:${guest.household}` : `solo:${guest.id}`;
    groups.set(key, [...(groups.get(key) ?? []), guest]);
  }

  async function setInvited(ids: string[], invited: boolean) {
    const previous = guests;
    setGuests((current) => current.map((guest) => (ids.includes(guest.id) ? { ...guest, invited } : guest)));
    setBusy((current) => new Set([...current, ...ids]));
    const result = await setLobolaInvitedAction(ids, invited);
    setBusy((current) => new Set([...current].filter((id) => !ids.includes(id))));
    if (!result.success) {
      setGuests(previous);
      toast.error(result.message);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>Who&apos;s invited to the Rora</CardTitle>
          <span className="text-sm font-medium text-primary">
            {invitedCount} of {guests.length} guests
          </span>
        </div>
        <CardDescription>Everyone is invited to the celebration. Tick the guests who are also invited to the Rora.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Find a guest"
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or household"
              value={search}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={showInvitedOnly}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              onChange={(event) => setShowInvitedOnly(event.target.checked)}
              type="checkbox"
            />
            Only show invited
          </label>
        </div>

        <div className="max-h-[32rem] space-y-3 overflow-y-auto overscroll-contain pr-1">
          {[...groups.entries()].map(([key, members]) => {
            const household = members[0].household;
            const allInvited = members.every((guest) => guest.invited);
            return (
              <div className="rounded-xl border border-border/80" key={key}>
                {household && members.length > 1 ? (
                  <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-muted/40 px-3 py-2">
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {household}
                    </span>
                    <button
                      className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => void setInvited(members.map((guest) => guest.id), !allInvited)}
                      type="button"
                    >
                      {allInvited ? "Remove all" : "Invite all"}
                    </button>
                  </div>
                ) : null}
                <ul className="divide-y divide-border/60">
                  {members.map((guest) => (
                    <li key={guest.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                        <input
                          checked={guest.invited}
                          className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                          disabled={busy.has(guest.id)}
                          onChange={(event) => void setInvited([guest.id], event.target.checked)}
                          type="checkbox"
                        />
                        <span
                          aria-hidden
                          className={cn("h-2 w-2 shrink-0 rounded-full", guest.side === "LISA" ? "bg-lisa" : "bg-james")}
                        />
                        <span className="min-w-0 flex-1 truncate text-primary">{guest.name}</span>
                        {guest.invited ? <span className="shrink-0 text-xs font-medium text-emerald-700">Invited</span> : null}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!visible.length ? (
            <p className="px-1 text-sm text-muted-foreground">
              {query ? "No guests match that search." : "Nobody is invited to the Rora yet."}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
