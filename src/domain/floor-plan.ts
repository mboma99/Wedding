/**
 * The main hall seating plan. Everything is measured in centimetres, with the
 * origin at the stage-end, left-hand corner of the hall. Items sit by their
 * centre; anything dragged below the hall lands in the "To place" tray.
 */

export const ITEM_TYPES = [
  "round",
  "trestle",
  "sofa",
  "decor",
  "cake",
  "food",
  "sign",
  "furn",
  "zone",
  "corner",
  "dance",
  "dj",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const CORNERS = ["nw", "ne", "se", "sw"] as const;
export type Corner = (typeof CORNERS)[number];

export type PlanItem = {
  id: string;
  type: ItemType;
  label: string;
  x: number;
  y: number;
  /** 0, 90, 180 or 270. Corner pieces turn by changing `corner` instead. */
  rot: number;
  w?: number;
  h?: number;
  d?: number;
  seats?: number;
  corner?: Corner;
  /** Label offset from the centre, for labels that would sit under another item. */
  lx?: number;
  ly?: number;
};

export type FloorPlan = {
  /** Bumped when the default layout gains something older saved plans lack. */
  revision?: number;
  room: { w: number; h: number };
  items: PlanItem[];
  /** Which table each guest sits at: guest id to table item id. */
  assignments: Record<string, string>;
};

/** A guest as the seating chart needs them. */
export type SeatingGuest = {
  id: string;
  name: string;
  side: "JAMES" | "LISA";
  household: string | null;
  declined: boolean;
  /** Brings a plus-one, who sits with them. */
  plusOne: boolean;
  plusOneName: string | null;
};

/** You both sit on the stage sofa, not at a guest table. */
export const COUPLE_SEATS = 2;

export function chairsNeeded(guest: SeatingGuest) {
  return guest.plusOne ? 2 : 1;
}

type Shape = "circle" | "rect" | "tri";
export type Look = "table" | "top" | "zone" | "dance" | "sofa" | "decor";

type TypeSpec = {
  shape: Shape;
  look: Look;
  d?: number;
  w?: number;
  h?: number;
  seats: number;
  seatOptions?: number[];
  /** Seats that count towards the guest total. */
  guest?: boolean;
  /** Counts as a guest table and takes the next T-number. */
  table?: boolean;
  bothSides?: boolean;
  /** Skipped by overlap checks: decoration, things on the stage, the food in the hallway. */
  noClash?: boolean;
  /** Seats without drawn chairs, like the couple's sofa. */
  noChairs?: boolean;
};

export const TYPE_SPECS: Record<ItemType, TypeSpec> = {
  round: { shape: "circle", look: "table", d: 152, seats: 10, seatOptions: [8, 9, 10, 11, 12], guest: true, table: true },
  trestle: { shape: "rect", look: "table", w: 240, h: 76, seats: 8, seatOptions: [4, 6, 8, 10], guest: true, table: true, bothSides: true },
  sofa: { shape: "rect", look: "sofa", w: 90, h: 240, seats: 2, guest: true, noClash: true, noChairs: true },
  decor: { shape: "rect", look: "decor", seats: 0, noClash: true },
  cake: { shape: "rect", look: "table", w: 150, h: 75, seats: 0 },
  food: { shape: "rect", look: "table", seats: 0, noClash: true },
  sign: { shape: "rect", look: "sofa", w: 150, h: 40, seats: 0, noClash: true },
  furn: { shape: "rect", look: "table", seats: 0 },
  zone: { shape: "rect", look: "zone", seats: 0 },
  corner: { shape: "tri", look: "zone", seats: 0 },
  dance: { shape: "rect", look: "dance", seats: 0 },
  dj: { shape: "rect", look: "table", seats: 0 },
};

/** Space a seated guest needs behind the table edge. */
export const CHAIR_ROUND = 55;
export const CHAIR_RECT = 60;

/** The "To place" tray sits this far below the hall, under the rooms around it. */
export const TRAY_TOP = 640;
export const TRAY_HEIGHT = 260;
/** Width of the catering hallway down the left side. */
export const HALL_WIDTH = 300;
/** Where the side door to the hallway starts, measured from the stage wall. */
export const HALLWAY_DOOR_TOP = 520;
export const HALLWAY_DOOR_WIDTH = 120;

export function specOf(item: PlanItem) {
  return TYPE_SPECS[item.type];
}

export function diameterOf(item: PlanItem) {
  return item.d ?? TYPE_SPECS[item.type].d ?? 150;
}

export function sizeOf(item: PlanItem) {
  const spec = specOf(item);
  return { w: item.w ?? spec.w ?? 100, h: item.h ?? spec.h ?? 100 };
}

export function seatsOf(item: PlanItem) {
  return item.seats ?? specOf(item).seats;
}

function chairsOf(item: PlanItem) {
  return specOf(item).noChairs ? 0 : seatsOf(item);
}

export function isTurned(item: PlanItem) {
  return item.rot % 180 !== 0;
}

/** Width and depth as they appear on the plan, after any quarter turn. */
export function shownSize(item: PlanItem) {
  const { w, h } = sizeOf(item);
  return isTurned(item) ? { sw: h, sh: w } : { sw: w, sh: h };
}

export function withShownSize(item: PlanItem, sw: number, sh: number): PlanItem {
  return isTurned(item) ? { ...item, w: sh, h: sw } : { ...item, w: sw, h: sh };
}

/** Rotate a point by a quarter-turn multiple, keeping the result exact. */
function rotatePoint(x: number, y: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  return [x * c - y * s, x * s + y * c];
}

/**
 * A corner piece fills the half of its box on the side of its right-angle
 * corner. Points are relative to the item's centre, right angle in the middle.
 */
export function trianglePoints(item: PlanItem): [number, number][] {
  const { w, h } = sizeOf(item);
  const box: Record<Corner, [number, number]> = {
    nw: [-w / 2, -h / 2],
    ne: [w / 2, -h / 2],
    se: [w / 2, h / 2],
    sw: [-w / 2, h / 2],
  };
  const i = CORNERS.indexOf(item.corner ?? "sw");
  return [CORNERS[(i + 3) % 4], CORNERS[i], CORNERS[(i + 1) % 4]].map((k) => box[k]);
}

export function turned(item: PlanItem): PlanItem {
  if (specOf(item).shape === "tri") {
    const i = CORNERS.indexOf(item.corner ?? "sw");
    return { ...item, corner: CORNERS[(i + 1) % 4] };
  }
  return { ...item, rot: (item.rot + 90) % 360 };
}

type Footprint =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "poly"; points: [number, number][] };

/** The floor an item needs, chairs included. */
export function footprint(item: PlanItem): Footprint {
  const spec = specOf(item);

  if (spec.shape === "circle") {
    return {
      kind: "circle",
      cx: item.x,
      cy: item.y,
      r: diameterOf(item) / 2 + (chairsOf(item) ? CHAIR_ROUND : 0),
    };
  }

  if (spec.shape === "tri") {
    return { kind: "poly", points: trianglePoints(item).map(([x, y]) => [item.x + x, item.y + y]) };
  }

  const { w, h } = sizeOf(item);
  const chairs = chairsOf(item);
  const top = -h / 2 - (chairs ? CHAIR_RECT : 0);
  const bottom = h / 2 + (chairs && spec.bothSides ? CHAIR_RECT : 0);
  const corners = [
    [-w / 2, top],
    [w / 2, top],
    [w / 2, bottom],
    [-w / 2, bottom],
  ].map(([x, y]) => rotatePoint(x, y, item.rot));
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x1 = item.x + Math.min(...xs);
  const x2 = item.x + Math.max(...xs);
  const y1 = item.y + Math.min(...ys);
  const y2 = item.y + Math.max(...ys);

  return { kind: "poly", points: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]] };
}

const EPS = 1;

function containsPoint(points: [number, number][], x: number, y: number) {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    if (cross !== 0) {
      if (sign && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
  }
  return true;
}

function distanceToSegment(px: number, py: number, [x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function overlaps(a: Footprint, b: Footprint): boolean {
  if (a.kind === "circle" && b.kind === "circle") {
    return Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r - EPS;
  }

  if (a.kind === "circle" || b.kind === "circle") {
    const circle = (a.kind === "circle" ? a : b) as Extract<Footprint, { kind: "circle" }>;
    const { points } = (a.kind === "poly" ? a : b) as Extract<Footprint, { kind: "poly" }>;
    if (containsPoint(points, circle.cx, circle.cy)) return true;
    return points.some(
      (p, i) => distanceToSegment(circle.cx, circle.cy, p, points[(i + 1) % points.length]) < circle.r - EPS,
    );
  }

  // Separating axis test: two convex shapes are apart if any edge normal splits them.
  for (const points of [a.points, b.points]) {
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      const nx = y1 - y2;
      const ny = x2 - x1;
      const length = Math.hypot(nx, ny) || 1;
      const project = (ps: [number, number][]) => ps.map(([x, y]) => (x * nx + y * ny) / length);
      const pa = project(a.points);
      const pb = project(b.points);
      if (Math.max(...pa) <= Math.min(...pb) + EPS || Math.max(...pb) <= Math.min(...pa) + EPS) {
        return false;
      }
    }
  }
  return true;
}

function pastWall(f: Footprint, room: FloorPlan["room"]) {
  if (f.kind === "circle") {
    return f.cx - f.r < -EPS || f.cy - f.r < -EPS || f.cx + f.r > room.w + EPS || f.cy + f.r > room.h + EPS;
  }
  return f.points.some(([x, y]) => x < -EPS || y < -EPS || x > room.w + EPS || y > room.h + EPS);
}

/** Items waiting in the tray under the plan: not in the room, not counted. */
export function isParked(item: PlanItem, room: FloorPlan["room"]) {
  return item.y > room.h + TRAY_TOP - 40;
}

export function nameOf(item: PlanItem) {
  const label = item.label || item.type;
  return label === label.toUpperCase() ? label.charAt(0) + label.slice(1).toLowerCase() : label;
}

export function findClashes(plan: FloorPlan) {
  const clashing = new Set<string>();
  const messages: string[] = [];
  const checked = plan.items.filter((item) => !specOf(item).noClash && !isParked(item, plan.room));
  const prints = checked.map(footprint);

  for (let i = 0; i < checked.length; i++) {
    if (pastWall(prints[i], plan.room)) {
      clashing.add(checked[i].id);
      messages.push(`${nameOf(checked[i])} is past a wall`);
    }
    for (let j = i + 1; j < checked.length; j++) {
      if (overlaps(prints[i], prints[j])) {
        clashing.add(checked[i].id);
        clashing.add(checked[j].id);
        messages.push(`${nameOf(checked[i])} overlaps ${nameOf(checked[j])}`);
      }
    }
  }

  return { clashing, messages };
}

/** Guests at each table, dropping assignments to tables that no longer exist. */
export function guestsByTable(plan: FloorPlan, guests: SeatingGuest[]) {
  const tables = new Set(plan.items.filter((item) => specOf(item).table).map((item) => item.id));
  const byTable = new Map<string, SeatingGuest[]>();
  for (const guest of guests) {
    const tableId = plan.assignments[guest.id];
    if (!tableId || !tables.has(tableId)) continue;
    byTable.set(tableId, [...(byTable.get(tableId) ?? []), guest]);
  }
  return byTable;
}

export function seatingSummary(plan: FloorPlan, guests: SeatingGuest[]) {
  const inRoom = plan.items.filter((item) => !isParked(item, plan.room));
  const seats = inRoom.filter((item) => specOf(item).guest).reduce((sum, item) => sum + seatsOf(item), 0);
  const tables = inRoom.filter((item) => specOf(item).table).length;
  const coming = guests.filter((guest) => !guest.declined);
  const people = coming.reduce((sum, guest) => sum + chairsNeeded(guest), 0) + COUPLE_SEATS;
  const byTable = guestsByTable(plan, coming);
  const seated = [...byTable.values()].flat().reduce((sum, guest) => sum + chairsNeeded(guest), 0);
  return {
    seats,
    tables,
    people,
    plusOnes: coming.filter((guest) => guest.plusOne).length,
    declined: guests.length - coming.length,
    seated,
    unseated: people - COUPLE_SEATS - seated,
    spare: seats - people,
  };
}

export function nextTableLabel(items: PlanItem[]) {
  const numbers = items
    .map((item) => /^T(\d+)$/.exec(item.label))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => Number(match[1]));
  return `T${(numbers.length ? Math.max(...numbers) : 0) + 1}`;
}

export const PLAN_REVISION = 2;

/** Guests pass it in the corridor on the way to the main doors. */
export function welcomeSign(room: FloorPlan["room"]): PlanItem {
  return { id: "welcome", type: "sign", label: "Welcome", x: room.w / 2 - 170, y: room.h + 60, rot: 0 };
}

/** Adds what later revisions of the default layout brought in to a plan saved before them. */
export function upgradeFloorPlan(plan: FloorPlan): FloorPlan {
  if ((plan.revision ?? 1) >= PLAN_REVISION) return plan;
  const items = plan.items.some((item) => item.id === "welcome")
    ? plan.items
    : [...plan.items, welcomeSign(plan.room)];
  return { ...plan, revision: PLAN_REVISION, items };
}

/** The layout drawn from the sketch and photos of Rainworth Village Hall. */
export function defaultFloorPlan(): FloorPlan {
  const W = 1100;
  const H = 1800;
  const items: PlanItem[] = [
    { id: "stage", type: "zone", label: "STAGE", ly: 75, x: 550, y: 125, w: 500, h: 250, rot: 0 },
    { id: "backdrop", type: "decor", label: "", x: 550, y: 22, w: 480, h: 30, rot: 0 },
    { id: "sofa", type: "sofa", label: "Lisa & James", x: 550, y: 110, rot: 90 },
    { id: "flowers", type: "decor", label: "", x: 550, y: 238, w: 480, h: 16, rot: 0 },
    { id: "stairs-l", type: "zone", label: "STAIRS", x: 235, y: 215, w: 130, h: 150, rot: 0 },
    { id: "stairs-r", type: "zone", label: "STAIRS", x: 865, y: 215, w: 130, h: 150, rot: 0 },
    { id: "dj", type: "dj", label: "DJ", x: 200, y: 400, w: 160, h: 70, rot: 0 },
    { id: "dance", type: "dance", label: "Dance floor", x: 550, y: 480, w: 400, h: 300, rot: 0 },
    { id: "cake", type: "cake", label: "Cake", x: 900, y: 400, rot: 0 },
    { id: "kitchenette", type: "corner", corner: "sw", label: "KITCHENETTE", x: 200, y: 1650, w: 400, h: 300, rot: 0 },
    { id: "bar", type: "corner", corner: "se", label: "BAR", x: 900, y: 1650, w: 400, h: 300, rot: 0 },
    { id: "food", type: "food", label: "Food", x: -95, y: 1050, w: 600, h: 76, rot: 90 },
    welcomeSign({ w: W, h: H }),
    { id: "tea", type: "furn", label: "Tea & coffee", x: 250, y: H + TRAY_TOP + 130, w: 220, h: 70, rot: 0 },
  ];
  const spots = [
    [210, 790], [550, 790], [890, 790],
    [210, 1060], [550, 1060], [890, 1060],
    [210, 1330], [550, 1330], [890, 1330],
    [385, 1570], [700, 1570],
  ];
  spots.forEach(([x, y], i) =>
    items.push({ id: `t${i + 1}`, type: "round", label: `T${i + 1}`, seats: 10, d: 152, x, y, rot: 0 }),
  );

  return { revision: PLAN_REVISION, room: { w: W, h: H }, items, assignments: {} };
}
