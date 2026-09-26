"""Extract vendor, payment and proposal data from the wedding workbook.

Reads the "Final Proposal" and "Payment Plan" sheets and writes data/vendors.json,
which scripts/import-vendors.ts loads into Firestore.

    python3 scripts/extract-vendors.py "/path/to/Traditional_Wedding_Dashboard.xlsx"

Only the workbook structure is read here; payment history recorded in the app is
never touched by the import.
"""

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

# Payment Plan month columns. The sheet runs March 2026 through May 2027.
MONTH_COLUMNS = {
    "C": "2026-03", "D": "2026-04", "E": "2026-05", "F": "2026-06",
    "G": "2026-07", "H": "2026-08", "I": "2026-09", "J": "2026-10",
    "K": "2026-11", "L": "2026-12", "M": "2027-01", "N": "2027-02",
    "O": "2027-03", "P": "2027-04", "Q": "2027-05",
}

# Final Proposal rows belonging to each Payment Plan vendor. Verified against the
# sheet's own category subtotals: Venue 1515.5, Decor 1522 + 710, Misc 300 +
# 1003.4 + 495 + 450. The seven Food rows are not split between the three
# caterers in the workbook, so they stay unassigned.
VENDOR_ROWS = {
    "venue": [2, 3, 4],
    "serenity-decor": [14, 15, 16, 17, 18, 19],
    "ari-creations": [20, 21, 22],
    "wedding-cake": [24],
    "dj": [25, 26, 27],
    "photographer": [28],
    "mc": [30],
}
UNASSIGNED_FOOD_ROWS = [6, 7, 8, 9, 10, 11, 12]
DETAIL_ROWS = {
    2: "venue", 14: "serenity-decor", 20: "ari-creations",
    25: "dj", 28: "photographer", 30: "mc",
}

# Payment Plan cells are colour coded: green means the money reached the vendor,
# pink/blue/purple mean it is set aside by Lisa, James or jointly but not paid.
# The legend lives in rows 15-19 of the sheet itself.
PAID_FILLS = {"FF93C47D", "FF6AA84F"}
FUNDING_BY_FILL = {
    "FFF4C2D7": "LISA",
    "FF8DB3E2": "JAMES",
    "FF8E7CC3": "JOINT",
}

SAVINGS_ROWS = {"lisas' bank": "lisa", "james' bank": "james"}

# The bank-row formulas attribute each payment cell to a person, joint cells by
# an explicit fraction, e.g. "(F6*0.30347566)" in Lisa's row against
# "(F6*0.69652434)" in James'. Those fractions are the real joint splits.
CELL_FACTOR = re.compile(r"\(?\s*(?:([A-Z]{1,2}\d+)\s*\*\s*([0-9.]+)|([0-9.]+)\s*\*\s*([A-Z]{1,2}\d+))\s*\)?")
PLAIN_CELL = re.compile(r"(?<![*.\d])\b([A-Z]{1,2}\d+)\b(?!\s*\*)")


def parse_attribution(formula):
    """Map cell reference -> fraction of that cell credited to this person.

    A cell multiplied by a fraction is a joint split. A cell named on its own —
    added or subtracted — is entirely that person's money.
    """
    shares = {}
    if not formula:
        return shares

    for match in CELL_FACTOR.finditer(formula):
        cell = match.group(1) or match.group(4)
        factor = match.group(2) or match.group(3)
        if cell and factor:
            shares[cell] = float(factor)

    for match in PLAIN_CELL.finditer(formula):
        shares.setdefault(match.group(1), 1.0)

    return shares

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")


def load_fills(z):
    """Map each cell style index to its background colour."""
    styles = ET.fromstring(z.read("xl/styles.xml"))
    fills = []
    for fill in styles.find("m:fills", NS):
        pattern = fill.find("m:patternFill", NS)
        colour = None
        if pattern is not None:
            fg = pattern.find("m:fgColor", NS)
            if fg is not None:
                colour = fg.get("rgb")
        fills.append((pattern.get("patternType") if pattern is not None else None, colour))

    style_fill = [xf.get("fillId") for xf in styles.find("m:cellXfs", NS)]

    def colour_of(style_index):
        if style_index is None:
            return None
        pattern, colour = fills[int(style_fill[int(style_index)] or 0)]
        return colour if pattern not in (None, "none") else None

    return colour_of


def load(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.get("Id"): r.get("Target") for r in rels}
    sheets = {}
    for sh in wb.find("m:sheets", NS):
        target = relmap[sh.get("{%s}id" % NS["r"])]
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        sheets[sh.get("name")] = target
    return z, shared, sheets


def rows_of(z, shared, target, colour_of=None):
    root = ET.fromstring(z.read(target))
    out = {}
    fills = {}
    formulas = {}
    for row in root.iter("{%s}row" % NS["m"]):
        index = int(row.get("r"))
        vals = {}
        row_fills = {}
        row_formulas = {}
        for c in row.findall("m:c", NS):
            col = re.match(r"[A-Z]+", c.get("r")).group(0)
            if colour_of is not None:
                row_fills[col] = colour_of(c.get("s"))
            formula_el = c.find("m:f", NS)
            if formula_el is not None and formula_el.text:
                row_formulas[col] = formula_el.text
            v = c.find("m:v", NS)
            is_el = c.find("m:is", NS)
            if c.get("t") == "s" and v is not None:
                val = shared[int(v.text)]
            elif is_el is not None:
                val = "".join(x.text or "" for x in is_el.iter("{%s}t" % NS["m"]))
            elif v is not None:
                val = v.text
            else:
                val = ""
            if val not in (None, ""):
                vals[col] = val
        out[index] = vals
        fills[index] = row_fills
        formulas[index] = row_formulas
    return (out, fills, formulas) if colour_of is not None else out


def number(value):
    """Sheet cells are strings; subtotal and label rows must not crash the run."""
    if value in (None, ""):
        return None
    try:
        return round(float(str(value).strip()), 2)
    except ValueError:
        return None


def parse_deadline(text):
    """Deadlines are written four different ways, so each is matched explicitly."""
    if not text:
        return None
    match = re.search(r"FINAL PAYMENT DEADLINE:\s*(.+)", text, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    raw = match.group(1).strip().splitlines()[0].strip()
    cleaned = re.sub(r"^[A-Za-z]+day,\s*", "", raw)
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned)

    day_first = re.match(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", cleaned)
    if day_first:
        day, month, year = day_first.groups()
        if month.lower() in MONTHS:
            return f"{year}-{MONTHS[month.lower()]:02d}-{int(day):02d}"

    month_first = re.match(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", cleaned)
    if month_first:
        month, day, year = month_first.groups()
        if month.lower() in MONTHS:
            return f"{year}-{MONTHS[month.lower()]:02d}-{int(day):02d}"

    return None


def line_item(row):
    price = number(row.get("A"))
    if price is None:
        return None
    return {
        "description": (row.get("D") or "").strip(),
        "category": (row.get("E") or "").strip(),
        "unitPrice": number(row.get("B")),
        "quantity": number(row.get("C")),
        "price": price,
    }


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else None
    if not source:
        print("Usage: python3 scripts/extract-vendors.py <workbook.xlsx>")
        return 1

    z, shared, sheets = load(source)
    colour_of = load_fills(z)
    proposal = rows_of(z, shared, sheets["Final Proposal"])
    plan, plan_fills, plan_formulas = rows_of(z, shared, sheets["Payment Plan"], colour_of)

    items_by_vendor = {}
    for vendor_key, indexes in VENDOR_ROWS.items():
        items = [line_item(proposal.get(i, {})) for i in indexes]
        items_by_vendor[vendor_key] = [i for i in items if i]

    details = {}
    for index, vendor_key in DETAIL_ROWS.items():
        text = (proposal.get(index, {}).get("F") or "").strip()
        details[vendor_key] = {
            "paymentDetails": text or None,
            "finalPaymentDeadline": parse_deadline(text),
        }

    attribution = {"lisa": {}, "james": {}}
    for index, row in plan.items():
        label = (row.get("A") or "").strip().lower()
        if label in SAVINGS_ROWS:
            attribution[SAVINGS_ROWS[label]] = parse_attribution(
                plan_formulas.get(index, {}).get("B")
            )

    vendors = []
    totals_row = None
    # Rows below the Total line are funding sources (bank balances), not vendors.
    for index in sorted(plan):
        row = plan[index]
        name = (row.get("A") or "").strip()
        if not name:
            continue
        if name.lower() == "total":
            totals_row = row
            break
        amount = number(row.get("B"))
        if amount is None:
            continue

        key = slugify(name)
        fills = plan_fills.get(index, {})
        entries = []
        for col, month in MONTH_COLUMNS.items():
            value = number(row.get(col))
            if value:
                fill = fills.get(col) or ""
                cell = f"{col}{index}"
                paid = fill in PAID_FILLS
                source = FUNDING_BY_FILL.get(fill, "UNASSIGNED")
                lisa_factor = attribution["lisa"].get(cell)
                james_factor = attribution["james"].get(cell)

                # A paid cell loses its owner colour in the sheet, but the bank
                # formulas still name whoever the money came from.
                if paid and source == "UNASSIGNED":
                    if lisa_factor is not None and james_factor is None:
                        source = "LISA"
                    elif james_factor is not None and lisa_factor is None:
                        source = "JAMES"
                    elif lisa_factor is not None and james_factor is not None:
                        source = "JOINT"

                entry = {
                    "month": month,
                    "amount": value,
                    "source": source,
                    "paid": paid,
                }

                if source == "JOINT" and (
                    lisa_factor is not None or james_factor is not None
                ):
                    lisa = round(value * (lisa_factor or 0), 2)
                    james = round(value - lisa, 2)
                    if james_factor is not None and lisa_factor is None:
                        james = round(value * james_factor, 2)
                        lisa = round(value - james, 2)
                    entry["split"] = {"lisa": lisa, "james": james}

                entries.append(entry)

        detail = details.get(key, {})
        category = (
            items_by_vendor.get(key, [{}])[0].get("category")
            if items_by_vendor.get(key)
            else ("Food" if key.startswith("catering") else "Other")
        )

        vendors.append({
            "key": key,
            "name": name,
            "category": (category or "Other").strip(),
            "totalCost": amount,
            "leftToPay": number(row.get("R")) or 0,
            "entries": entries,
            "lineItems": items_by_vendor.get(key, []),
            "paymentDetails": detail.get("paymentDetails"),
            "finalPaymentDeadline": detail.get("finalPaymentDeadline"),
        })

    savings = {"lisa": 0.0, "james": 0.0}
    for row in plan.values():
        label = (row.get("A") or "").strip().lower()
        if label in SAVINGS_ROWS:
            savings[SAVINGS_ROWS[label]] = round(number(row.get("B")) or 0, 2)

    unassigned = []
    for row_index in UNASSIGNED_FOOD_ROWS:
        item = line_item(proposal.get(row_index, {}))
        if not item:
            continue
        # A few proposal rows leave the category cell blank; these rows all sit
        # inside the Food block, so the category is filled in here.
        item["category"] = item["category"] or "Food"
        unassigned.append(item)

    payload = {
        "source": Path(source).name,
        "vendors": vendors,
        "unassignedItems": unassigned,
        "savings": savings,
        "totals": {
            "totalCost": number(totals_row.get("B")) if totals_row else None,
            "leftToPay": number(totals_row.get("R")) if totals_row else None,
        },
    }

    out = Path("data/vendors.json")
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    # Bank details live in this file; the summary below deliberately omits them.
    joint_splits = [
        (v["name"], e["month"], e["amount"], e.get("split"))
        for v in vendors
        for e in v["entries"]
        if e["source"] == "JOINT"
    ]

    by_source = {}
    paid_total = 0.0
    for vendor in vendors:
        for entry in vendor["entries"]:
            by_source[entry["source"]] = round(
                by_source.get(entry["source"], 0) + entry["amount"], 2
            )
            if entry["paid"]:
                paid_total = round(paid_total + entry["amount"], 2)
    print(f"Wrote {out} with {len(vendors)} vendors and {len(unassigned)} unassigned items.")
    print(f"  by funder: {by_source}")
    print(f"  already paid: {paid_total}")
    unowned = [
        (v["name"], e["month"], e["amount"])
        for v in vendors
        for e in v["entries"]
        if e["paid"] and e["source"] == "UNASSIGNED"
    ]
    print(f"  paid with no recorded funder: {len(unowned)}")
    for name, month, amount in unowned:
        print(f"    {name} {month} {amount}")
    print(f"  savings: Lisa {savings['lisa']}, James {savings['james']}")
    print("  joint splits from the bank-row formulas:")
    for name, month, amount, split in joint_splits:
        print(f"    {name} {month} {amount} -> {split}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
