"use client";

import Link from "next/link";
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
import type { GuestListItem } from "@/features/guests/types";
import { formatInviteCode } from "@/lib/rsvp";
import { cn } from "@/lib/utils";

type GuestTableProps = {
  guests: GuestListItem[];
};

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
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {invitation.inviteKind === "HOUSEHOLD"
          ? `Household invite · ${invitation.householdGuestCount} guests`
          : "Individual invite"}
      </div>
      {invitation.plusOneAllowed ? (
        <div className="text-xs text-muted-foreground">Plus one enabled</div>
      ) : null}
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        RSVP code {formatInviteCode(invitation.inviteCode)}
      </div>
    </div>
  );
}

function GuestActions({
  guest,
  fullWidth = false,
}: {
  guest: GuestListItem;
  fullWidth?: boolean;
}) {
  const buttonClassName = fullWidth ? "w-full justify-center" : undefined;

  return (
    <div className="flex flex-col gap-2">
      {guest.invitation ? (
        <ShareInvitationButton
          className={buttonClassName}
          guestName={guest.fullName}
          householdName={guest.householdName}
          inviteCode={guest.invitation.inviteCode}
          inviteKind={guest.invitation.inviteKind}
          invitePath={`/rsvp/${guest.invitation.inviteToken}`}
          size="sm"
        />
      ) : null}
      <Button asChild className={buttonClassName} size="sm" variant="outline">
        <Link href={`/admin/guests/${guest.id}/edit`}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Link>
      </Button>
      <DeleteGuestButton
        className={buttonClassName}
        guestId={guest.id}
        guestName={guest.fullName}
        label="Delete"
        size="sm"
      />
      {guest.invitation ? (
        <Button asChild className={buttonClassName} size="sm" variant="ghost">
          <Link
            href={`/rsvp/${guest.invitation.inviteToken}`}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {guest.invitation.inviteKind === "HOUSEHOLD"
              ? "Household RSVP"
              : "RSVP link"}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function MobileGuestCards({ guests }: GuestTableProps) {
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
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-primary">{guest.fullName}</p>
              <p className="text-sm text-muted-foreground">{guest.relation}</p>
              {guest.householdName ? (
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {guest.householdName}
                </p>
              ) : null}
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
            <GuestActions fullWidth guest={guest} />
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

export function GuestTable({ guests }: GuestTableProps) {
  const columns: ColumnDef<GuestListItem>[] = [
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
            <MobileGuestCards guests={guests} />
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
