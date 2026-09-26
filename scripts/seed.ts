import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  GroupType,
  GuestSide,
  GuestType,
  InviteStatus,
  RsvpStatus,
} from "@/domain/enums";
import { guestsCollection } from "@/server/db/firestore";

type SeedGuest = {
  fullName: string;
  side: GuestSide;
  groupType: GroupType;
  relation: string;
  guestType: GuestType;
  householdName?: string;
  notes?: string;
  phone?: string;
  email: string;
  invitation: {
    inviteStatus: InviteStatus;
    rsvpStatus: RsvpStatus;
    plusOneAllowed: boolean;
    plusOneName?: string;
    dietaryRequirements: string[];
  };
};

const guests: SeedGuest[] = [
  {
    fullName: "Mrs. Grace Mboma",
    side: GuestSide.JAMES,
    groupType: GroupType.FAMILY,
    relation: "Aunt",
    guestType: GuestType.ELDER,
    householdName: "Mboma Family",
    notes: "Prefers front-row family seating.",
    phone: "+233240000001",
    email: "grace.mboma@example.com",
    invitation: {
      inviteStatus: InviteStatus.DELIVERED,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: false,
      dietaryRequirements: ["Low sugar"],
    },
  },
  {
    fullName: "Mr. Daniel Kyei",
    side: GuestSide.JAMES,
    groupType: GroupType.FRIEND,
    relation: "University friend",
    guestType: GuestType.ADULT,
    householdName: "Kyei Household",
    phone: "+233240000002",
    email: "daniel.kyei@example.com",
    invitation: {
      inviteStatus: InviteStatus.SENT,
      rsvpStatus: RsvpStatus.PENDING,
      plusOneAllowed: true,
      dietaryRequirements: [],
    },
  },
  {
    fullName: "Ms. Adwoa Owusu",
    side: GuestSide.JAMES,
    groupType: GroupType.FRIEND,
    relation: "Former colleague",
    guestType: GuestType.ADULT,
    householdName: "Owusu Household",
    phone: "+233240000003",
    email: "adwoa.owusu@example.com",
    invitation: {
      inviteStatus: InviteStatus.DELIVERED,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: true,
      plusOneName: "Kwesi Owusu",
      dietaryRequirements: ["Vegetarian"],
    },
  },
  {
    fullName: "Mrs. Esi Kyei",
    side: GuestSide.JAMES,
    groupType: GroupType.FAMILY_FRIEND,
    relation: "Spouse of Daniel Kyei",
    guestType: GuestType.ADULT,
    householdName: "Kyei Household",
    phone: "+233240000013",
    email: "esi.kyei@example.com",
    invitation: {
      inviteStatus: InviteStatus.SENT,
      rsvpStatus: RsvpStatus.PENDING,
      plusOneAllowed: false,
      dietaryRequirements: ["No peanuts"],
    },
  },
  {
    fullName: "Master Kojo Bediako",
    side: GuestSide.JAMES,
    groupType: GroupType.FAMILY,
    relation: "Nephew",
    guestType: GuestType.CHILD,
    householdName: "Bediako Family",
    notes: "Needs child meal.",
    phone: "+233240000004",
    email: "kojo.bediako@example.com",
    invitation: {
      inviteStatus: InviteStatus.SENT,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: false,
      dietaryRequirements: ["Child meal"],
    },
  },
  {
    fullName: "Mrs. Abena Asante",
    side: GuestSide.LISA,
    groupType: GroupType.FAMILY,
    relation: "Mother's cousin",
    guestType: GuestType.ELDER,
    householdName: "Asante Family",
    notes: "Call ahead before sending printed invite.",
    phone: "+233240000005",
    email: "abena.asante@example.com",
    invitation: {
      inviteStatus: InviteStatus.DELIVERED,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: false,
      dietaryRequirements: ["No shellfish"],
    },
  },
  {
    fullName: "Ms. Efua Mensah",
    side: GuestSide.LISA,
    groupType: GroupType.FRIEND,
    relation: "Childhood friend",
    guestType: GuestType.ADULT,
    householdName: "Mensah Household",
    phone: "+233240000006",
    email: "efua.mensah@example.com",
    invitation: {
      inviteStatus: InviteStatus.DELIVERED,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: true,
      plusOneName: "Yaw Mensah",
      dietaryRequirements: ["Gluten free"],
    },
  },
  {
    fullName: "Mr. Kofi Ansah",
    side: GuestSide.LISA,
    groupType: GroupType.FAMILY_FRIEND,
    relation: "Choir leader",
    guestType: GuestType.ADULT,
    householdName: "Ansah Household",
    phone: "+233240000007",
    email: "kofi.ansah@example.com",
    invitation: {
      inviteStatus: InviteStatus.SENT,
      rsvpStatus: RsvpStatus.PENDING,
      plusOneAllowed: false,
      dietaryRequirements: [],
    },
  },
  {
    fullName: "Mrs. Nana Yaa Tetteh",
    side: GuestSide.LISA,
    groupType: GroupType.FAMILY_FRIEND,
    relation: "Family friend",
    guestType: GuestType.ADULT,
    householdName: "Tetteh Household",
    notes: "Seated with community elders.",
    phone: "+233240000008",
    email: "nana-yaa.tetteh@example.com",
    invitation: {
      inviteStatus: InviteStatus.DELIVERED,
      rsvpStatus: RsvpStatus.DECLINED,
      plusOneAllowed: false,
      dietaryRequirements: [],
    },
  },
  {
    fullName: "Mr. Michael Aidoo",
    side: GuestSide.JAMES,
    groupType: GroupType.FAMILY_FRIEND,
    relation: "Neighborhood elder",
    guestType: GuestType.ELDER,
    householdName: "Aidoo Household",
    phone: "+233240000009",
    email: "michael.aidoo@example.com",
    invitation: {
      inviteStatus: InviteStatus.NOT_SENT,
      rsvpStatus: RsvpStatus.PENDING,
      plusOneAllowed: false,
      dietaryRequirements: [],
    },
  },
  {
    fullName: "Ms. Akosua Frimpong",
    side: GuestSide.LISA,
    groupType: GroupType.OTHER,
    relation: "Mentor",
    guestType: GuestType.ADULT,
    householdName: "Frimpong Household",
    phone: "+233240000010",
    email: "akosua.frimpong@example.com",
    invitation: {
      inviteStatus: InviteStatus.DELIVERED,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: false,
      dietaryRequirements: ["Pescatarian"],
    },
  },
  {
    fullName: "Mr. Yaw Boateng",
    side: GuestSide.JAMES,
    groupType: GroupType.FAMILY_FRIEND,
    relation: "Youth fellowship leader",
    guestType: GuestType.ADULT,
    householdName: "Boateng Household",
    phone: "+233240000011",
    email: "yaw.boateng@example.com",
    invitation: {
      inviteStatus: InviteStatus.SENT,
      rsvpStatus: RsvpStatus.PENDING,
      plusOneAllowed: true,
      dietaryRequirements: [],
    },
  },
  {
    fullName: "Miss Ama Serwaa",
    side: GuestSide.LISA,
    groupType: GroupType.FAMILY,
    relation: "Niece",
    guestType: GuestType.CHILD,
    householdName: "Serwaa Family",
    notes: "Include in children's seating cluster.",
    phone: "+233240000012",
    email: "ama.serwaa@example.com",
    invitation: {
      inviteStatus: InviteStatus.SENT,
      rsvpStatus: RsvpStatus.ATTENDING,
      plusOneAllowed: false,
      dietaryRequirements: ["Child meal"],
    },
  },
];

function createInviteToken(email: string) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 36);
}

/** Email is the seed's identity, matching the unique column it replaced. */
async function findGuestIdByEmail(email: string) {
  const existing = await guestsCollection()
    .where("email", "==", email)
    .limit(1)
    .get();

  return existing.docs[0]?.id ?? null;
}

async function main() {
  const collection = guestsCollection();

  for (const guest of guests) {
    const email = guest.email.trim().toLowerCase();
    const inviteToken = createInviteToken(email);
    const existingId = await findGuestIdByEmail(email);
    const guestRef = existingId ? collection.doc(existingId) : collection.doc();

    await guestRef.set(
      {
        fullName: guest.fullName,
        side: guest.side,
        groupType: guest.groupType,
        relation: guest.relation,
        guestType: guest.guestType,
        householdName: guest.householdName ?? null,
        notes: guest.notes ?? null,
        phone: guest.phone ?? null,
        email,
        invitation: {
          inviteStatus: guest.invitation.inviteStatus,
          rsvpStatus: guest.invitation.rsvpStatus,
          plusOneAllowed: guest.invitation.plusOneAllowed,
          plusOneName: guest.invitation.plusOneName ?? null,
          dietaryRequirements: guest.invitation.dietaryRequirements,
          inviteToken,
        },
        ...(existingId ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  console.log(`Seeded ${guests.length} wedding guests.`);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});
