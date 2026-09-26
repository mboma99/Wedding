# Firestore setup

The app reads and writes Firestore only from the server, through the Firebase
Admin SDK. There is no client SDK and no Firebase Auth: admin access is still
the `ADMIN_PASSWORD` cookie session, and `firestore.rules` denies all direct
client access so the Admin SDK is the only way in.

The web config from the Firebase console (`apiKey`, `authDomain`, `appId`, …) is
**not** used by this app. It is for browser SDKs.

## 1. Get a service account key

1. Firebase console → your project (`wedding-87673`) → ⚙ **Project settings**.
2. **Service accounts** tab → **Generate new private key** → downloads a JSON file.
3. Open the JSON and copy three values into `.env`:

```bash
FIREBASE_PROJECT_ID="wedding-87673"       # "project_id"
FIREBASE_CLIENT_EMAIL="...@....iam.gserviceaccount.com"  # "client_email"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

Keep the private key on one line, in double quotes, with the `\n` sequences
exactly as they appear in the JSON. The app converts them back to real newlines.
Never commit the JSON file or the key.

## 2. Create the Firestore database

Firebase console → **Firestore Database** → **Create database** → production
mode, and pick a region (`europe-west2` is closest to the UK). The app creates
the `guests` collection on first write, so nothing else is needed.

If the database already exists and was created in **test mode**, it is open to
the world until the test window expires. Deploy the rules now (see below) or
switch the database to production mode in the console.

## 3. Seed and run

```bash
npm run db:seed   # writes the 13 sample guests, idempotent (keyed on email)
                  # if the project already holds real guests, these are added
                  # alongside them; they all use @example.com addresses
npm run dev       # http://localhost:3000
```

## Importing the real guest list

`data/guest-list.csv` holds the guest list, exported straight from the
`Traditional_Wedding_Dashboard.xlsx` "Guest List" sheet.

```bash
npm run import:guests                        # reads data/guest-list.csv
npm run import:guests -- path/to/other.csv   # or any CSV/TSV export
```

The importer reads spreadsheet exports as they come: it skips the title and
totals block above the header, finds the header row by its `Full Name` column,
and accepts either display headings (`Full Name`, `Group Type`, `Guest Type`,
`Invite Status`, `RSVP Status`, `Household`) or field names (`fullName`,
`groupType`, ...). Unknown columns are ignored and nameless rows are skipped, so
re-exporting the sheet after adding a column just works.

Accepted values: side `James`/`Lisa`; group type `Family`, `Friend`,
`Family Friend`, `Other`; guest type `Adult`, `Child`, `Teen` (stored as `ELDER`,
which the UI labels "Teenager"). A blank guest type becomes `Adult` and a blank
relation falls back to the group-type name, because the admin form requires one.
Every imported guest starts at invite `NOT_SENT` / RSVP `PENDING` with its own
invite token.

### Filling in households later

Guests can be imported with no household and grouped afterwards. Households are
not a table: guests belong to the same household when they share `side` and
`householdName`, and the RSVP link then covers all of them together.

To collate, add a `Household` column to the sheet, fill it in for the guests
who share one, re-export, and re-run the import. Re-running is safe by design:

- guests already imported are matched by identity, never duplicated
- a household name in the file is written to guests that lack it
- nothing else on an existing guest is touched, so invite status, RSVP replies,
  dietary notes and admin edits all survive

Identity is `side` + group type + name, plus an occurrence number so two
genuinely different guests with the same name stay separate. Renaming a guest in
the file makes the importer treat it as a new guest, so rename in the admin UI
instead.

## Importing vendors, costs and payments

`data/vendors.json` holds the vendor data, generated from the wedding workbook's
**Final Proposal** and **Payment Plan** sheets:

```bash
python3 scripts/extract-vendors.py "/path/to/Traditional_Wedding_Dashboard.xlsx"
npm run import:vendors
```

The extractor needs no third-party packages — it reads the .xlsx directly. It
maps each Payment Plan row to a vendor, attaches the Final Proposal line items,
bank details and final payment deadlines, and reconciles against the workbook's
own totals (£9,127.50 cost, £3,726.40 still to find).

It also reads the **cell colours**, which is where the funding split lives:

| Sheet colour | Meaning |
|---|---|
| pink `#F4C2D7` | Lisa's money |
| blue `#8DB3E2` | James' money |
| purple `#8E7CC3` | joint money |
| green `#93C47D` | already paid to the vendor |
| no colour | planned, owner not decided |

Green and the owner colours are separate facts, so an entry stores both: a
`source` naming whose money it is, and a `paid` flag. The sheet loses the owner
when a cell turns green, but the bank-row formulas often still name the payer —
the £50 Ari payment appears as `- H7` in Lisa's row, so it imports as Lisa, paid.
Seven older payments are named in neither formula and import as unassigned; set
their owner in the app.

The `Lisas' Bank` and `James' Bank` rows below the Total become the savings
balances, seeded into `meta/savings` on first import only.

### Where joint splits come from

Joint cells are one figure in the sheet, but the bank-row formulas attribute
them per person as explicit fractions:

```
Lisa's Bank  = ... + (F6*0.30347566) + (G6*0.30347566) + (H6*0.35117273) + (0.64038728*I7)
James' Bank  = E9  + (F6*0.69652434) + (G6*0.69652434) + (H6*0.64882727) + (I7*0.35961272)
```

The extractor parses those coefficients, so each joint entry carries the real
split rather than an even one. An even split is only used when a joint cell has
no coefficient in either formula.

Those formulas also show that the bank rows are not separate savings pots: they
are the sum of everything each person has put in, joint shares included, less
money already paid out. James' £1,100 is exactly his £500 plus his £600 of joint
shares; Lisa's £2,305.42 is her £2,024.55 plus £330.87 of joint shares, less the
£50 Ari payment her formula subtracts.

Seven Food line items are not split between the three caterers in the workbook,
so they are stored separately and shown under the Food heading rather than
guessed at.

### Re-importing is safe

Costs, bank details and deadlines are refreshed from the workbook on every
import. Entries, line items, notes and savings balances are editable in the app,
so they are written once when a vendor is first created and **never**
overwritten, and updating the spreadsheet will not wipe them.

### A note on bank details

Vendor bank details are stored in Firestore and displayed on `/admin/vendors`.
The admin password is the only thing protecting that page, so treat it
accordingly. `scripts/extract-vendors.py` deliberately keeps them out of its
console output.

## Local development without touching the real project

```bash
npm run db:emulator                        # needs Java; firebase-tools via npx
```

Then uncomment in `.env`:

```bash
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
```

When that variable is set the credentials are ignored, so the emulator needs no
service account. Emulator data is discarded when it stops — re-run
`npm run db:seed` after each start. Emulator UI: <http://127.0.0.1:4000/firestore>.

## Deploying rules and indexes

```bash
npx firebase-tools deploy --only firestore:rules
```

`firestore.indexes.json` is intentionally empty: every query the app runs is a
single-field equality or range, which Firestore indexes automatically. If a
future query combines a range filter with an ordering or equality on a different
field, Firestore will fail with a link that generates the required index.

## Hosting

Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
`ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in the host's environment. Hosting
dashboards commonly mangle multi-line values, so paste the private key with the
literal `\n` escapes, as in `.env`.
