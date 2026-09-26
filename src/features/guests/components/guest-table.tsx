"use client";

import Link from "next/link";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ExternalLink, Mail, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteGuestButton } from "@/features/guests/components/delete-guest-button";
import { ShareInvitationButton } from "@/features/guests/components/share-invitation-button";
import {
  GroupTypeBadge,
  GuestTypeBadge,
  InviteStatusBadge,
  RsvpStatusBadge,
  SideBadge,
} from "@/features/guests/components/guest-badges";
import { HouseholdGroupingToolbar } from "@/features/guests/components/household-grouping-toolbar";
import type { GuestListItem, HouseholdOption } from "@/features/guests/types";
import { cn } from "@/lib/utils";

type GuestTableProps = {
  guests: GuestListItem[];
};

type SelectionProps = {
  selectedIds: Set<string>;
  onToggle: (guestId: string) => void;
};

function SelectGuestCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      aria-label={label}
      checked={checked}
      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
      onChange={onChange}
      type="checkbox"
    />
  );
}

function ContactDetails({
  email,
  phone,
}: Pick<GuestListItem, "email" | "phone">) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 shrink-0 text-primary" />
        <span className="break-all">{email ?? "No email"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 shrink-0 text-primary" />
        <span className="break-all">{phone ?? "No phone"}</span>
      </div>
    </div>
  );
}

function InvitationDetails({
  invitation,
}: Pick<GuestListItem, "invitation">) {
  if (!invitation) {
    return <div className="text-sm text-muted-foreground">No invitation</div>;
  }

  return (
    <div className="space-y-3">
      <InviteStatusBadge status={invitation.inviteStatus} />
      {invitation.inviteKind === "HOUSEHOLD" ? (
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {`Household invite · ${invitation.householdGuestCount} guests`}
        </div>
      ) : null}
      {invitation.plusOneAllowed ? (
        <div className="text-xs text-muted-foreground">Plus one enabled</div>
      ) : null}
    </div>
  );
}

/** Icon-only so a row stays one line tall; each button keeps a title tooltip. */
function GuestActions({ guest }: { guest: GuestListItem }) {
  const rsvpLabel =
    guest.invitation?.inviteKind === "HOUSEHOLD"
      ? "Open household RSVP page"
      : "Open RSVP page";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {guest.invitation ? (
        <ShareInvitationButton
          guestName={guest.fullName}
          householdName={guest.householdName}
          iconOnly
          inviteCode={guest.invitation.inviteCode}
          inviteKind={guest.invitation.inviteKind}
          invitePath={`/rsvp/${guest.invitation.inviteToken}`}
        />
      ) : null}
      <Button asChild size="icon" variant="outline">
        <Link
          aria-label={`Edit ${guest.fullName}`}
          href={`/admin/guests/${guest.id}/edit`}
          title={`Edit ${guest.fullName}`}
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      {guest.invitation ? (
        <Button asChild size="icon" variant="ghost">
          <Link
            aria-label={rsvpLabel}
            href={`/rsvp/${guest.invitation.inviteToken}`}
            rel="noreferrer"
            target="_blank"
            title={rsvpLabel}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      <DeleteGuestButton
        guestId={guest.id}
        guestName={guest.fullName}
        iconOnly
        label="Delete"
      />
    </div>
  );
}

function MobileGuestCards({
  guests,
  selectedIds,
  onToggle,
}: GuestTableProps & SelectionProps) {
  return (
    <div className="grid gap-4 md:hidden">
      {guests.map((guest) => (
        <div
          key={guest.id}
          className={cn(
            "rounded-[1.5rem] border p-4",
            guest.side === "JAMES"
              ? "border-james/15 bg-james/5"
              : "border-lisa/15 bg-lisa/5",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <SelectGuestCheckbox
                checked={selectedIds.has(guest.id)}
                label={`Select ${guest.fullName}`}
                onChange={() => onToggle(guest.id)}
              />
              <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-primary">{guest.fullName}</p>
              <p className="text-sm text-muted-foreground">{guest.relation}</p>
              {guest.householdName ? (
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {guest.householdName}
                </p>
              ) : null}
              </div>
            </div>
            <SideBadge side={guest.side} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <GroupTypeBadge groupType={guest.groupType} />
            <GuestTypeBadge guestType={guest.guestType} />
            {guest.invitation ? (
              <>
                <InviteStatusBadge status={guest.invitation.inviteStatus} />
                <RsvpStatusBadge status={guest.invitation.rsvpStatus} />
              </>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Contact
              </p>
              <ContactDetails email={guest.email} phone={guest.phone} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Invitation
              </p>
              <InvitationDetails invitation={guest.invitation} />
            </div>
          </div>

          <div className="mt-4">
            <GuestActions guest={guest} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyGuestTableState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-muted/25 px-6 text-center">
      <div className="space-y-3">
        <p className="text-lg font-semibold text-primary">No guests match these filters.</p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Adjust the search, clear one or more filters, or reseed the database to
          repopulate the guest list.
        </p>
      </div>
    </div>
  );
}

export function GuestTable({
  guests,
  householdOptions,
}: GuestTableProps & { householdOptions: HouseholdOption[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleGuest(guestId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }

      return next;
    });
  }

  // Selection only covers the guests on screen, so select-all is page-wide.
  const pageIds = guests.map((guest) => guest.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((guestId) => selectedIds.has(guestId));

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allOnPageSelected) {
        for (const guestId of pageIds) {
          next.delete(guestId);
        }
      } else {
        for (const guestId of pageIds) {
          next.add(guestId);
        }
      }

      return next;
    });
  }

  const selectedGuests = guests.filter((guest) => selectedIds.has(guest.id));

  const columns: ColumnDef<GuestListItem>[] = [
    {
      id: "select",
      header: () => (
        <SelectGuestCheckbox
          checked={allOnPageSelected}
          label="Select every guest on this page"
          onChange={togglePage}
        />
      ),
      cell: ({ row }) => (
        <SelectGuestCheckbox
          checked={selectedIds.has(row.original.id)}
          label={`Select ${row.original.fullName}`}
          onChange={() => toggleGuest(row.original.id)}
        />
      ),
    },
    {
      accessorKey: "fullName",
      header: "Guest",
      cell: ({ row }) => {
        const guest = row.original;

        return (
          <div
            className={cn(
              "rounded-[1.25rem] border px-4 py-3",
              guest.side === "JAMES"
                ? "border-james/15 bg-james/5"
                : "border-lisa/15 bg-lisa/5",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-primary">{guest.fullName}</p>
                <p className="text-sm text-muted-foreground">{guest.relation}</p>
                {guest.householdName ? (
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {guest.householdName}
                  </p>
                ) : null}
              </div>
              <SideBadge side={guest.side} />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "groupType",
      header: "Group",
      cell: ({ row }) => (
        <div className="space-y-3">
          <GroupTypeBadge groupType={row.original.groupType} />
          <GuestTypeBadge guestType={row.original.guestType} />
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <ContactDetails
          email={row.original.email}
          phone={row.original.phone}
        />
      ),
    },
    {
      accessorKey: "invitation",
      header: "Invitation",
      cell: ({ row }) => (
        <InvitationDetails invitation={row.original.invitation} />
      ),
    },
    {
      id: "rsvpStatus",
      header: "RSVP",
      cell: ({ row }) =>
        row.original.invitation ? (
          <RsvpStatusBadge status={row.original.invitation.rsvpStatus} />
        ) : (
          <div className="text-sm text-muted-foreground">No RSVP yet</div>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <GuestActions guest={row.original} />,
    },
  ];

  const table = useReactTable({
    data: guests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="border-white/80 bg-white/85">
      <CardHeader>
        <CardTitle>Guest directory</CardTitle>
        <CardDescription>
          Searchable and filterable guest records for the traditional wedding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {guests.length === 0 ? (
          <EmptyGuestTableState />
        ) : (
          <>
            <MobileGuestCards
              guests={guests}
              onToggle={toggleGuest}
              selectedIds={selectedIds}
            />
            <div className="hidden overflow-x-auto rounded-[1.5rem] border border-border/80 md:block">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-muted/35">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-5 py-4 text-sm font-semibold text-primary"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border/70 bg-white/75">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedGuests.length ? (
              <div className="mt-4">
                <HouseholdGroupingToolbar
                  householdOptions={householdOptions}
                  onClearSelection={() => setSelectedIds(new Set())}
                  selectedGuests={selectedGuests}
                />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
