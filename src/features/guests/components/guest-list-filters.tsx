import Link from "next/link";
import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  groupTypeLabels,
  groupTypeOptions,
  guestSortFieldLabels,
  guestSortFieldOptions,
  inviteStatusLabels,
  inviteStatusOptions,
  rsvpStatusLabels,
  rsvpStatusOptions,
  sideLabels,
  guestSideOptions,
  type GuestListSearchParams,
} from "@/features/guests/types";

type GuestListFiltersProps = {
  filters: GuestListSearchParams;
};

function SelectField({
  name,
  defaultValue,
  label,
  children,
}: {
  name: string;
  defaultValue?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}

export function GuestListFilters({ filters }: GuestListFiltersProps) {
  return (
    <Card className="border-white/80 bg-white/85">
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted/50">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Search and filter</p>
            <p className="text-sm text-muted-foreground">
              Narrow the guest list by side, group, or invitation progress.
            </p>
          </div>
        </div>

        <form action="/admin/guests" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
            <label className="space-y-2 lg:col-span-4">
              <span className="text-sm font-medium text-muted-foreground">
                Search guests
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  defaultValue={filters.q}
                  name="q"
                  placeholder="Search by name, household, relation, phone, or email"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              name="side"
              label="Side"
              defaultValue={filters.side}
            >
              <option value="">All sides</option>
              {guestSideOptions.map((side) => (
                <option key={side} value={side}>
                  {sideLabels[side]}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="groupType"
              label="Group type"
              defaultValue={filters.groupType}
            >
              <option value="">All groups</option>
              {groupTypeOptions.map((groupType) => (
                <option key={groupType} value={groupType}>
                  {groupTypeLabels[groupType]}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="inviteStatus"
              label="Invitation status"
              defaultValue={filters.inviteStatus}
            >
              <option value="">All invitation statuses</option>
              {inviteStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {inviteStatusLabels[status]}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="rsvpStatus"
              label="RSVP status"
              defaultValue={filters.rsvpStatus}
            >
              <option value="">All RSVP statuses</option>
              {rsvpStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {rsvpStatusLabels[status]}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
            <SelectField
              name="sortBy"
              label="Sort by"
              defaultValue={filters.sortBy}
            >
              {guestSortFieldOptions.map((sortField) => (
                <option key={sortField} value={sortField}>
                  {guestSortFieldLabels[sortField]}
                </option>
              ))}
            </SelectField>

            <SelectField
              name="sortDirection"
              label="Direction"
              defaultValue={filters.sortDirection}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </SelectField>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="page" value="1" />
              <Button className="w-full sm:flex-1" type="submit">
                Apply
              </Button>
              <Button asChild className="w-full sm:w-auto" variant="outline">
                <Link href="/admin/guests">Clear</Link>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
