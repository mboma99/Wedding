# Traditional Wedding Guest Manager Architecture

## Scope

This application models exactly one traditional wedding event. There is no `Wedding` table, no event switcher, and no multi-event UI abstraction. Every screen and query is optimized for a single invitation list that belongs to James and Lisa's traditional wedding.

## Technical shape

- **Next.js App Router** for routing, layouts, and server-first pages.
- **Firestore via the Firebase Admin SDK** for the operational data model. See `docs/firestore-setup.md`.
- **Feature folders** under `src/features/*` to keep dashboard, guest management, and RSVP flow isolated.
- **Server utilities** under `src/server/*` for Firestore access, queries, and server actions. Only the server touches Firestore; `firestore.rules` denies all direct client access.
- **Tailwind + shadcn/ui conventions** for reusable UI primitives and consistent theming.
- **Zod + React Hook Form** reserved for the create/edit and public RSVP flows in later phases.
- **TanStack Table + Recharts** reserved for the dashboard and guest directory in later phases.

## Data model decisions

- `Guest` is the primary record for every invited person.
- `invitation` is a nested map on the guest document, holding invitation and RSVP lifecycle fields. It was a one-to-one `Invitation` table under Postgres; since every read joined the pair, Firestore keeps them in one document so reads need no join and a guest updates atomically.
- `side` is intentionally limited to `JAMES` or `LISA` so the UI can apply clear visual ownership.
- `inviteToken` lives on `Invitation` because public RSVP links are invitation-driven, not user-account-driven.
- `dietaryRequirements` is stored as a string array because a guest can declare more than one requirement.
- Enum values live in `src/domain/enums.ts` rather than being generated from a schema. The declaration-order arrays there exist because Postgres sorted enum columns by declaration order, and the in-memory sorts reproduce that ordering.
- Guest list filtering, sorting and paging happen in memory (`src/server/queries/guests.ts`). Firestore cannot do case-insensitive substring search, cross-field OR, or offset paging, and a guest list is a few hundred documents at most.
- Email uniqueness is enforced by a query inside the write transaction, standing in for the unique column Postgres provided.
- `vendors` is a second collection holding the booked suppliers, their proposal line items, bank details, deadlines and money entries.
- Each entry carries a `source` naming whose money it is (`LISA`, `JAMES`, `JOINT`, `UNASSIGNED`) and a separate `paid` flag. Keeping them apart is deliberate: the workbook colours a cell green when it is paid, which erases who funded it, so paying a vendor used to lose the attribution. A vendor therefore has three figures — paid, set aside, still to find — while each person keeps credit for money they have already handed over.
- Joint entries carry a `split`. The workbook records joint money as one figure, but its bank-row formulas attribute each joint cell by an explicit fraction, and those fractions are the real splits.
- Savings balances live in `meta/savings` so the app can show what each person has saved against what they have allocated.
- A household is not a record: guests form one by sharing `side` and `householdName`, so a flat guest list can be collated into households later without a migration. `scripts/import-guests.ts` fills the name in on re-import and leaves invitation state alone.

## Folder structure

```text
.
|-- docs/
|   `-- architecture.md
|-- data/
|   |-- guest-list.csv
|   `-- vendors.json
|-- scripts/
|   |-- extract-vendors.py
|   |-- import-guests.ts
|   |-- import-vendors.ts
|   `-- seed.ts
|-- src/
|   |-- app/
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |   |-- shared/
|   |   `-- ui/
|   |-- features/
|   |   |-- dashboard/
|   |   |-- guests/
|   |   `-- rsvp/
|   |-- domain/
|   |   `-- enums.ts
|   |-- lib/
|   |   `-- utils.ts
|   `-- server/
|       |-- actions/
|       |-- db/
|       |   |-- firestore.ts
|       |   `-- guest-doc.ts
|       `-- queries/
|-- .env.example
|-- components.json
|-- firebase.json
|-- firestore.indexes.json
|-- firestore.rules
|-- eslint.config.mjs
|-- next.config.ts
|-- package.json
|-- postcss.config.js
|-- tailwind.config.ts
`-- tsconfig.json
```

## Phase mapping

- **Phase 1**: data model and app baseline
- **Phase 2**: dashboard queries, KPIs, and charts
- **Phase 3**: guest list table, search, filters, sorting, and pagination
- **Phase 4**: guest form workflows and validation
- **Phase 5**: public RSVP flow with invitation tokens
- **Phase 6**: UI polish, robustness, and documentation cleanup

