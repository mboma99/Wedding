# Traditional Wedding Guest Manager Architecture

## Scope

This application models exactly one traditional wedding event. There is no `Wedding` table, no event switcher, and no multi-event UI abstraction. Every screen and query is optimized for a single invitation list that belongs to James and Lisa's traditional wedding.

## Technical shape

- **Next.js App Router** for routing, layouts, and server-first pages.
- **Prisma on Supabase Postgres** for the operational data model.
- **Feature folders** under `src/features/*` to keep dashboard, guest management, and RSVP flow isolated.
- **Server utilities** under `src/server/*` for Prisma access, queries, and future server actions.
- **Tailwind + shadcn/ui conventions** for reusable UI primitives and consistent theming.
- **Zod + React Hook Form** reserved for the create/edit and public RSVP flows in later phases.
- **TanStack Table + Recharts** reserved for the dashboard and guest directory in later phases.

## Data model decisions

- `Guest` is the primary record for every invited person.
- `Invitation` is a one-to-one extension of `Guest` for invitation and RSVP lifecycle fields.
- `side` is intentionally limited to `JAMES` or `LISA` so the UI can apply clear visual ownership.
- `inviteToken` lives on `Invitation` because public RSVP links are invitation-driven, not user-account-driven.
- `dietaryRequirements` is stored as a string array because a guest can declare more than one requirement.

## Folder structure

```text
.
|-- docs/
|   `-- architecture.md
|-- prisma/
|   |-- schema.prisma
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
|   |-- lib/
|   |   `-- utils.ts
|   `-- server/
|       |-- actions/
|       |-- db/
|       |   `-- prisma.ts
|       `-- queries/
|-- .env.example
|-- components.json
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

