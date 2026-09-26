"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  buildGuestListHref,
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
import { cn } from "@/lib/utils";

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
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select defaultValue={defaultValue ?? ""} name={name}>
        {children}
      </Select>
    </label>
  );
}

export function GuestListFilters({ filters }: GuestListFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Each chip links to the same list minus that one filter.
  const activeFilters: { key: string; label: string; href: string }[] = [];

  if (filters.q) {
    activeFilters.push({
      key: "q",
      label: `“${filters.q}”`,
      href: buildGuestListHref(filters, { q: "", page: 1 }),
    });
  }

  if (filters.side) {
    activeFilters.push({
      key: "side",
      label: sideLabels[filters.side],
      href: buildGuestListHref(filters, { side: undefined, page: 1 }),
    });
  }

  if (filters.groupType) {
    activeFilters.push({
      key: "groupType",
      label: groupTypeLabels[filters.groupType],
      href: buildGuestListHref(filters, { groupType: undefined, page: 1 }),
    });
  }

  if (filters.inviteStatus) {
    activeFilters.push({
      key: "inviteStatus",
      label: `Invite: ${inviteStatusLabels[filters.inviteStatus]}`,
      href: buildGuestListHref(filters, { inviteStatus: undefined, page: 1 }),
    });
  }

  if (filters.rsvpStatus) {
    activeFilters.push({
      key: "rsvpStatus",
      label: `RSVP: ${rsvpStatusLabels[filters.rsvpStatus]}`,
      href: buildGuestListHref(filters, { rsvpStatus: undefined, page: 1 }),
    });
  }

  const panelFilterCount = activeFilters.filter((filter) => filter.key !== "q").length;

  return (
    <form action="/admin/guests" className="space-y-3">
      <input type="hidden" name="page" value="1" />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <label className="sr-only" htmlFor="guest-search">
            Search guests
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="bg-white pl-10"
            defaultValue={filters.q}
            id="guest-search"
            name="q"
            placeholder="Search name, household, relation, phone or email"
          />
        </div>
        <Button
          aria-expanded={isExpanded}
          className={cn("h-11 shrink-0", isExpanded && "bg-muted")}
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
          variant="outline"
        >
          <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Filters</span>
          {panelFilterCount ? (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">
              {panelFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Kept mounted while hidden so the selects still submit with a search. */}
      <div
        className={cn(
          "animate-enter space-y-4 rounded-[var(--card-radius)] border border-border/80 bg-card p-4",
          !isExpanded && "hidden",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField defaultValue={filters.side} label="Side" name="side">
            <option value="">All sides</option>
            {guestSideOptions.map((side) => (
              <option key={side} value={side}>
                {sideLabels[side]}
              </option>
            ))}
          </SelectField>

          <SelectField defaultValue={filters.groupType} label="Group" name="groupType">
            <option value="">All groups</option>
            {groupTypeOptions.map((groupType) => (
              <option key={groupType} value={groupType}>
                {groupTypeLabels[groupType]}
              </option>
            ))}
          </SelectField>

          <SelectField
            defaultValue={filters.inviteStatus}
            label="Invitation"
            name="inviteStatus"
          >
            <option value="">Any invitation status</option>
            {inviteStatusOptions.map((status) => (
              <option key={status} value={status}>
                {inviteStatusLabels[status]}
              </option>
            ))}
          </SelectField>

          <SelectField defaultValue={filters.rsvpStatus} label="RSVP" name="rsvpStatus">
            <option value="">Any RSVP status</option>
            {rsvpStatusOptions.map((status) => (
              <option key={status} value={status}>
                {rsvpStatusLabels[status]}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end lg:grid-cols-[1fr_1fr_2fr]">
          <SelectField defaultValue={filters.sortBy} label="Sort by" name="sortBy">
            {guestSortFieldOptions.map((sortField) => (
              <option key={sortField} value={sortField}>
                {guestSortFieldLabels[sortField]}
              </option>
            ))}
          </SelectField>

          <SelectField
            defaultValue={filters.sortDirection}
            label="Order"
            name="sortDirection"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </SelectField>

          <div className="flex gap-2 sm:justify-end">
            <Button asChild className="flex-1 sm:flex-none" variant="ghost">
              <Link href="/admin/guests">Reset</Link>
            </Button>
            <Button className="flex-1 sm:flex-none" type="submit">
              Apply filters
            </Button>
          </div>
        </div>
      </div>

      {activeFilters.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Link
              aria-label={`Remove filter ${filter.label}`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/30"
              href={filter.href}
              key={filter.key}
            >
              {filter.label}
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
          {activeFilters.length > 1 ? (
            <Link
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              href="/admin/guests"
            >
              Clear all
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
