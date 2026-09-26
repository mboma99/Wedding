import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FieldValue } from "firebase-admin/firestore";

import {
  GroupType,
  GuestSide,
  GuestType,
  InviteStatus,
  RsvpStatus,
  type GroupType as GroupTypeValue,
  type GuestSide as GuestSideValue,
  type GuestType as GuestTypeValue,
  type InviteStatus as InviteStatusValue,
  type RsvpStatus as RsvpStatusValue,
} from "@/domain/enums";
import { guestsCollection } from "@/server/db/firestore";

const DEFAULT_SOURCE = "data/guest-list.csv";

const COLUMNS = [
  "fullName",
  "groupType",
  "side",
  "relation",
  "guestType",
  "householdName",
  "phone",
  "email",
  "notes",
  "inviteStatus",
  "rsvpStatus",
] as const;

type Column = (typeof COLUMNS)[number];
type Row = Record<Column, string>;

/** Spreadsheet exports use display headings, so both spellings are accepted. */
const COLUMN_ALIASES: Record<string, Column> = {
  fullname: "fullName",
  name: "fullName",
  guesttype: "guestType",
  grouptype: "groupType",
  group: "groupType",
  side: "side",
  relation: "relation",
  householdname: "householdName",
  household: "householdName",
  phone: "phone",
  phonenumber: "phone",
  email: "email",
  emailaddress: "email",
  notes: "notes",
  invitestatus: "inviteStatus",
  rsvpstatus: "rsvpStatus",
};

function normalizeHeading(heading: string) {
  return heading.toLowerCase().replace(/[^a-z]/g, "");
}

const sideByLabel: Record<string, GuestSideValue> = {
  james: GuestSide.JAMES,
  lisa: GuestSide.LISA,
};

const groupTypeByLabel: Record<string, GroupTypeValue> = {
  family: GroupType.FAMILY,
  friend: GroupType.FRIEND,
  "family friend": GroupType.FAMILY_FRIEND,
  family_friend: GroupType.FAMILY_FRIEND,
  other: GroupType.OTHER,
};

// The UI labels ELDER as "Teenager", so that is where teens belong.
const guestTypeByLabel: Record<string, GuestTypeValue> = {
  adult: GuestType.ADULT,
  child: GuestType.CHILD,
  teen: GuestType.ELDER,
  teenager: GuestType.ELDER,
  elder: GuestType.ELDER,
};

const inviteStatusByLabel: Record<string, InviteStatusValue> = {
  "not sent": InviteStatus.NOT_SENT,
  not_sent: InviteStatus.NOT_SENT,
  sent: InviteStatus.SENT,
  delivered: InviteStatus.DELIVERED,
};

const rsvpStatusByLabel: Record<string, RsvpStatusValue> = {
  pending: RsvpStatus.PENDING,
  attending: RsvpStatus.ATTENDING,
  accepted: RsvpStatus.ATTENDING,
  declined: RsvpStatus.DECLINED,
};

const groupTypeRelationFallback: Record<GroupTypeValue, string> = {
  [GroupType.FAMILY]: "Family",
  [GroupType.FRIEND]: "Friend",
  [GroupType.FAMILY_FRIEND]: "Family friend",
  [GroupType.OTHER]: "Guest",
};

/** Minimal RFC 4180 parser so quoted CSV cells survive; tabs need no quoting. */
function parseDelimited(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (quoted) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entries) => entries.some((entry) => entry.trim()));
}

function readRows(sourcePath: string): Row[] {
  const content = readFileSync(sourcePath, "utf8");
  const firstLine = content.split("\n", 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(content, delimiter);

  // A spreadsheet export carries a title block above the real header, so the
  // header is the first row that names a full-name column.
  const headerIndex = rows.findIndex((entries) =>
    entries.some((entry) => COLUMN_ALIASES[normalizeHeading(entry)] === "fullName"),
  );

  if (headerIndex === -1) {
    throw new Error(
      `${sourcePath} has no header row with a "Full Name" column.`,
    );
  }

  const columnByIndex = rows[headerIndex].map(
    (heading) => COLUMN_ALIASES[normalizeHeading(heading)],
  );

  return rows.slice(headerIndex + 1).map((entries) => {
    const row = Object.fromEntries(COLUMNS.map((column) => [column, ""])) as Row;

    columnByIndex.forEach((column, index) => {
      if (column) {
        row[column] = (entries[index] ?? "").trim();
      }
    });

    return row;
  });
}

type ParsedGuest = {
  importKey: string;
  docId: string;
  fullName: string;
  side: GuestSideValue;
  groupType: GroupTypeValue;
  guestType: GuestTypeValue;
  relation: string;
  householdName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  inviteStatus: InviteStatusValue;
  rsvpStatus: RsvpStatusValue;
  warnings: string[];
};

function lookup<T>(map: Record<string, T>, value: string) {
  return map[value.trim().toLowerCase().replace(/\s+/g, " ")];
}

/**
 * These guests have no email, so identity is (side, group type, name) plus an
 * occurrence number for genuine same-name duplicates. The id is derived from it
 * so re-importing updates the same documents instead of adding copies.
 */
function buildDocId(importKey: string) {
  return `imp_${createHash("sha1").update(importKey).digest("hex").slice(0, 20)}`;
}

function parseGuests(rows: Row[]): ParsedGuest[] {
  const seen = new Map<string, number>();

  // A nameless row is spreadsheet padding or a totals line, not a guest.
  return rows.filter((row) => row.fullName.trim()).map((row, index) => {
    const warnings: string[] = [];
    const fullName = row.fullName.replace(/\s+/g, " ").trim();

    const side = lookup(sideByLabel, row.side);
    const groupType = lookup(groupTypeByLabel, row.groupType);

    if (!side) {
      throw new Error(`Row ${index + 2} (${fullName}) has an unknown side: "${row.side}".`);
    }

    if (!groupType) {
      throw new Error(
        `Row ${index + 2} (${fullName}) has an unknown group type: "${row.groupType}".`,
      );
    }

    let guestType = lookup(guestTypeByLabel, row.guestType);

    if (!guestType) {
      if (row.guestType) {
        throw new Error(
          `Row ${index + 2} (${fullName}) has an unknown guest type: "${row.guestType}".`,
        );
      }

      guestType = GuestType.ADULT;
      warnings.push("no guest type given, defaulted to Adult");
    }

    let relation = row.relation;

    if (!relation) {
      // The admin form requires a relation, so a blank one gets a valid default.
      relation = groupTypeRelationFallback[groupType];
      warnings.push(`no relation given, defaulted to "${relation}"`);
    }

    const identity = `${side}|${groupType}|${fullName.toLowerCase()}`;
    const occurrence = seen.get(identity) ?? 0;
    seen.set(identity, occurrence + 1);

    if (occurrence > 0) {
      warnings.push(`duplicate of an earlier row with the same name and group`);
    }

    const importKey = `${identity}|${occurrence}`;

    const inviteStatus =
      lookup(inviteStatusByLabel, row.inviteStatus) ?? InviteStatus.NOT_SENT;
    const rsvpStatus = lookup(rsvpStatusByLabel, row.rsvpStatus) ?? RsvpStatus.PENDING;

    if (row.inviteStatus && !lookup(inviteStatusByLabel, row.inviteStatus)) {
      warnings.push(`unknown invite status "${row.inviteStatus}", used Not sent`);
    }

    if (row.rsvpStatus && !lookup(rsvpStatusByLabel, row.rsvpStatus)) {
      warnings.push(`unknown RSVP status "${row.rsvpStatus}", used Pending`);
    }

    return {
      importKey,
      docId: buildDocId(importKey),
      fullName,
      side,
      groupType,
      guestType,
      relation,
      householdName: row.householdName || null,
      phone: row.phone || null,
      email: row.email ? row.email.toLowerCase() : null,
      notes: row.notes || null,
      inviteStatus,
      rsvpStatus,
      warnings,
    };
  });
}

async function main() {
  const sourcePath = resolve(process.argv[2] ?? DEFAULT_SOURCE);
  const guests = parseGuests(readRows(sourcePath));
  const collection = guestsCollection();

  const created: string[] = [];
  const householdUpdated: string[] = [];
  const skipped: string[] = [];

  for (const guest of guests) {
    const guestRef = collection.doc(guest.docId);
    const existing = await guestRef.get();

    if (existing.exists) {
      const currentHousehold = existing.get("householdName") ?? null;

      // Re-importing only ever fills in a household. Everything else on an
      // existing guest — invitation state, RSVP replies, admin edits — is left
      // alone, so collating households later is safe to run repeatedly.
      if (guest.householdName && guest.householdName !== currentHousehold) {
        await guestRef.update({
          householdName: guest.householdName,
          updatedAt: FieldValue.serverTimestamp(),
        });
        householdUpdated.push(`${guest.fullName} -> ${guest.householdName}`);
      } else {
        skipped.push(guest.fullName);
      }

      continue;
    }

    await guestRef.set({
      fullName: guest.fullName,
      side: guest.side,
      groupType: guest.groupType,
      relation: guest.relation,
      guestType: guest.guestType,
      householdName: guest.householdName,
      notes: guest.notes,
      phone: guest.phone,
      email: guest.email,
      importKey: guest.importKey,
      invitation: {
        inviteStatus: guest.inviteStatus,
        rsvpStatus: guest.rsvpStatus,
        plusOneAllowed: false,
        plusOneName: null,
        dietaryRequirements: [],
        inviteToken: randomUUID(),
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    created.push(guest.fullName);
  }

  console.log(`Source: ${sourcePath}`);
  console.log(`Rows read: ${guests.length}`);
  console.log(`Created: ${created.length}`);
  console.log(`Household filled in: ${householdUpdated.length}`);
  console.log(`Unchanged: ${skipped.length}`);

  for (const entry of householdUpdated) {
    console.log(`  household: ${entry}`);
  }

  const warned = guests.filter((guest) => guest.warnings.length);

  if (warned.length) {
    console.log(`\nReview these ${warned.length} rows:`);
    for (const guest of warned) {
      console.log(`  ${guest.fullName} (${guest.side}) - ${guest.warnings.join("; ")}`);
    }
  }
}

main().catch((error) => {
  console.error("Import failed", error);
  process.exitCode = 1;
});
