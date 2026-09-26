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
import { Card } from "@/components/ui/card";
import { DeleteGuestButton } from "@/features/guests/components/delete-guest-button";
import { ShareInvitationButton } from "@/features/guests/components/share-invitation-button";
import {
  InviteStatusBadge,
  RsvpStatusBadge,
} from "@/features/guests/components/guest-badges";
import { HouseholdGroupingToolbar } from "@/features/guests/components/household-grouping-toolbar";
import {
  groupTypeLabels,
  guestTypeLabels,
  inviteStatusLabels,
  type GuestListItem,
  type HouseholdOption,
} from "@/features/guests/types";
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
  // Most guests have no contact details yet; a dash keeps rows one line tall
  // instead of two "No email / No phone" placeholders.
  if (!email && !phone) {
    return <span className="text-sm text-muted-foreground/70">—</span>;
  }

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="break-all">{phone}</span>
        </div>
      ) : null}
      {email ? (
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="break-all">{email}</span>
        </div>
      ) : null}
    </div>
  );
}

function InvitationDetails({
  invitation,
}: Pick<GuestListItem, "invitation">) {
  if (!invitation) {
    return <span className="text-sm text-muted-foreground/70">—</span>;
  }

  return (
    <div className="space-y-1">
      <InviteStatusBadge status={invitation.inviteStatus} />
      {invitation.inviteKind === "HOUSEHOLD" ? (
        <p className="text-xs text-muted-foreground">
          {`Household · ${invitation.householdGuestCount} guests`}
        </p>
      ) : null}
      {invitation.plusOneAllowed ? (
        <p className="text-xs text-muted-foreground">Plus one</p>
      ) : null}
    </div>
  );
}

function GuestIdentity({ guest }: { guest: GuestListItem }) {
  const secondary = [guest.relation, guest.householdName].filter(Boolean).join(" · ");

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span
        aria-label={guest.side === "JAMES" ? "James side" : "Lisa side"}
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-sm",
          guest.side === "JAMES" ? "bg-james" : "bg-lisa",
        )}
        role="img"
      />
      <div className="min-w-0">
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline"
          href={`/admin/guests/${guest.id}/edit`}
        >
          {guest.fullName}
        </Link>
        {secondary ? (
          <p className="truncate text-sm text-muted-foreground">{secondary}</p>
        ) : null}
      </div>
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
    <div className="flex items-center justify-end gap-0.5">
      {guest.invitation ? (
        <ShareInvitationButton
          variant="ghost"
          guestName={guest.fullName}
          householdName={guest.householdName}
          iconOnly
          inviteCode={guest.invitation.inviteCode}
          inviteKind={guest.invitation.inviteKind}
          invitePath={`/rsvp/${guest.invitation.inviteToken}`}
        />
      ) : null}
      <Button asChild size="icon" variant="ghost">
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
        variant="ghost"
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
    <ul className="divide-y divide-border/70 md:hidden">
      {guests.map((guest) => (
        <li className="space-y-2.5 px-4 py-3.5" key={guest.id}>
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <SelectGuestCheckbox
                checked={selectedIds.has(guest.id)}
                label={`Select ${guest.fullName}`}
                onChange={() => onToggle(guest.id)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <GuestIdentity guest={guest} />
            </div>
            {guest.invitation ? (
              <RsvpStatusBadge status={guest.invitation.rsvpStatus} />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-xs text-muted-foreground">
            <span>
              {groupTypeLabels[guest.groupType]} · {guestTypeLabels[guest.guestType]}
            </span>
            {guest.invitation ? (
              <span>Invite {inviteStatusLabels[guest.invitation.inviteStatus].toLowerCase()}</span>
            ) : null}
            {guest.invitation?.inviteKind === "HOUSEHOLD" ? (
              <span>{`Household · ${guest.invitation.householdGuestCount}`}</span>
            ) : null}
            {guest.phone ? <span>{guest.phone}</span> : null}
          </div>

          <div className="-mr-2 flex justify-end">
            <GuestActions guest={guest} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyGuestTableState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
      <div className="space-y-3">
        <p className="text-lg font-semibold text-primary">No guests match these filters.</p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Try a different search, or remove a filter above.
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
      cell: ({ row }) => <GuestIdentity guest={row.original} />,
    },
    {
      accessorKey: "groupType",
      header: "Group",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="text-primary">{groupTypeLabels[row.original.groupType]}</p>
          <p className="text-muted-foreground">{guestTypeLabels[row.original.guestType]}</p>
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
          <span className="text-sm text-muted-foreground/70">—</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <GuestActions guest={row.original} />,
    },
  ];

  const table = useReactTable({
    data: guests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Card className="overflow-hidden">
        {guests.length === 0 ? (
          <EmptyGuestTableState />
        ) : (
          <>
            <MobileGuestCards
              guests={guests}
              onToggle={toggleGuest}
              selectedIds={selectedIds}
            />
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left">
                <thead className="border-b border-border/80 bg-muted/40">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-muted-foreground first:w-10 first:pr-0"
                          scope="col"
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
                <tbody className="divide-y divide-border/60">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      className={cn(
                        "align-top transition-colors hover:bg-muted/30",
                        selectedIds.has(row.original.id) && "bg-primary/[0.04]",
                      )}
                      key={row.id}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 first:w-10 first:pr-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
      {/* Outside the card so its sticky range spans the whole list. */}
      {selectedGuests.length ? (
        <HouseholdGroupingToolbar
          householdOptions={householdOptions}
          onClearSelection={() => setSelectedIds(new Set())}
          selectedGuests={selectedGuests}
        />
      ) : null}
    </>
  );
}
