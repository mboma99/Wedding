"use client";

import type { KeyboardEvent, PointerEvent, Ref } from "react";

import {
  diameterOf,
  HALL_WIDTH,
  HALLWAY_DOOR_TOP,
  HALLWAY_DOOR_WIDTH,
  isParked,
  nameOf,
  seatsOf,
  shownSize,
  sizeOf,
  specOf,
  trianglePoints,
  TRAY_HEIGHT,
  TRAY_TOP,
  type FloorPlan,
  type Look,
  type PlanItem,
} from "@/domain/floor-plan";
import { cn } from "@/lib/utils";

type PlanCanvasProps = {
  plan: FloorPlan;
  /** Chairs taken by assigned guests, per table id. */
  chairsUsed: Map<string, number>;
  selectedId: string | null;
  clashing: Set<string>;
  /** Show the live size readout while a handle is being dragged. */
  resizing: boolean;
  /** Off, items can only be tapped to select; nothing drags, and swipes scroll the page. */
  editable: boolean;
  svgRef: Ref<SVGSVGElement>;
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onKeyDown: (event: KeyboardEvent<SVGSVGElement>) => void;
};

export const PLAN_LEFT = 780;
export const PLAN_RIGHT = 300;
const LEFT = PLAN_LEFT;
const RIGHT = PLAN_RIGHT;
const TOP = 130;

// Tailwind classes per look; selection and clashes override the outline.
const SHAPE_CLASS: Record<Look, string> = {
  table: "fill-card stroke-primary [stroke-width:4]",
  top: "fill-lisa/15 stroke-lisa [stroke-width:5]",
  zone: "fill-muted stroke-muted-foreground/60 [stroke-width:3] [stroke-dasharray:14_8]",
  dance: "fill-[hsl(33_40%_90%)] stroke-primary/40 [stroke-width:3]",
  sofa: "fill-lisa/15 stroke-lisa [stroke-width:5]",
  decor: "fill-emerald-700/25 stroke-emerald-700/40 [stroke-width:3]",
};

function shapeClass(look: Look, selected: boolean, clash: boolean) {
  return cn(
    SHAPE_CLASS[look],
    clash && "fill-destructive/10 stroke-destructive",
    selected && "stroke-lisa [stroke-width:7] [stroke-dasharray:none]",
  );
}

export function PlanCanvas({
  plan,
  chairsUsed,
  selectedId,
  clashing,
  resizing,
  editable,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: PlanCanvasProps) {
  const { w: W, h: H } = plan.room;
  const layerOrder = ["zone", "corner", "dance", "decor", "furn", "cake", "dj", "food", "sign", "round", "trestle", "sofa"];
  const sorted = [...plan.items].sort((a, b) => layerOrder.indexOf(a.type) - layerOrder.indexOf(b.type));
  const selected = plan.items.find((item) => item.id === selectedId) ?? null;

  return (
    <svg
      aria-label="Floor plan of the main hall"
      className="block h-auto w-full min-w-[560px] touch-pan-x touch-pan-y select-none font-sans"
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={svgRef}
      role="application"
      viewBox={`${-LEFT} ${-TOP} ${W + LEFT + RIGHT} ${H + TOP + TRAY_TOP + TRAY_HEIGHT + 40}`}
    >
      <defs>
        <marker
          id="plan-arrow"
          markerHeight="5"
          markerWidth="5"
          orient="auto-start-reverse"
          refX="5"
          refY="5"
          viewBox="0 0 10 10"
        >
          <path className="fill-james" d="M0 0 L10 5 L0 10 z" />
        </marker>
      </defs>

      <Surroundings room={plan.room} />

      {/* 1 m grid */}
      <g className="stroke-border/70 [stroke-width:2]">
        {Array.from({ length: Math.max(0, Math.ceil(W / 100) - 1) }, (_, i) => (
          <line key={`gx${i}`} x1={(i + 1) * 100} x2={(i + 1) * 100} y1={0} y2={H} />
        ))}
        {Array.from({ length: Math.max(0, Math.ceil(H / 100) - 1) }, (_, i) => (
          <line key={`gy${i}`} x1={0} x2={W} y1={(i + 1) * 100} y2={(i + 1) * 100} />
        ))}
      </g>

      <rect className="fill-none stroke-primary [stroke-width:16]" height={H + 16} width={W + 16} x={-8} y={-8} />

      <HallwayWindows room={plan.room} />
      <Door wall="left" start={HALLWAY_DOOR_TOP} width={HALLWAY_DOOR_WIDTH} outward room={plan.room} />
      <Door wall="bottom" start={W / 2 - 90} width={180} double room={plan.room} />
      <Door wall="right" start={Math.round(H * 0.47)} width={110} outward room={plan.room} />
      <OutsideLabel anchor="end" x={-40} y={HALLWAY_DOOR_TOP - 110}>
        To food
      </OutsideLabel>
      <OutsideLabel rotate={90} x={W + 44} y={Math.round(H * 0.47) - 100}>
        Fire exit
      </OutsideLabel>

      <Dimensions room={plan.room} />

      {/* holding tray */}
      <rect
        className="fill-none stroke-border [stroke-dasharray:12_8] [stroke-width:3]"
        height={TRAY_HEIGHT}
        rx={12}
        width={W + HALL_WIDTH}
        x={-HALL_WIDTH}
        y={H + TRAY_TOP}
      />
      <text className="fill-muted-foreground uppercase tracking-[0.12em]" style={{ fontSize: 26 }} x={-HALL_WIDTH + 20} y={H + TRAY_TOP + 36}>
        To place · drag into the room
      </text>

      {sorted.map((item) => (
        <PlanShape
          chairsUsed={chairsUsed.get(item.id) ?? 0}
          clash={clashing.has(item.id)}
          editable={editable}
          item={item}
          key={item.id}
          parked={isParked(item, plan.room)}
          selected={item.id === selectedId}
        />
      ))}

      {selected && editable ? <Handles item={selected} resizing={resizing} /> : null}
    </svg>
  );
}

function PlanShape({
  item,
  selected,
  clash,
  parked,
  chairsUsed,
  editable,
}: {
  chairsUsed: number;
  editable: boolean;
  item: PlanItem;
  selected: boolean;
  clash: boolean;
  parked: boolean;
}) {
  const spec = specOf(item);
  const chairs = spec.noChairs ? 0 : seatsOf(item);
  const cls = shapeClass(spec.look, selected, clash);
  const chairClass = cn("fill-card [stroke-width:3]", clash ? "stroke-destructive" : "stroke-primary/40");

  let body;
  if (spec.shape === "circle") {
    const r = diameterOf(item) / 2;
    body = (
      <>
        {Array.from({ length: chairs }, (_, i) => {
          const a = (i / chairs) * Math.PI * 2 - Math.PI / 2;
          return <circle className={chairClass} cx={Math.cos(a) * (r + 26)} cy={Math.sin(a) * (r + 26)} key={i} r={19} />;
        })}
        <circle className={cls} cx={0} cy={0} r={r} />
      </>
    );
  } else if (spec.shape === "tri") {
    body = <polygon className={cls} points={trianglePoints(item).map((p) => p.join(",")).join(" ")} />;
  } else {
    const { w, h } = sizeOf(item);
    const perSide = spec.bothSides ? Math.ceil(chairs / 2) : chairs;
    const sides = chairs ? (spec.bothSides ? [-1, 1] : [-1]) : [];
    body = (
      <>
        {sides.flatMap((side) => {
          const count = side === -1 ? perSide : chairs - perSide;
          return Array.from({ length: count }, (_, i) => {
            const cx = -w / 2 + (w / count) * (i + 0.5);
            return (
              <rect className={chairClass} height={36} key={`${side}-${i}`} rx={8} width={40} x={cx - 20} y={side * (h / 2 + 30) - 18} />
            );
          });
        })}
        <rect className={cls} height={h} rx={spec.look === "zone" ? 0 : spec.look === "sofa" ? 30 : 6} width={w} x={-w / 2} y={-h / 2} />
        {item.type === "sofa" ? <rect className={cls} height={h} rx={12} width={26} x={-w / 2} y={-h / 2} /> : null}
      </>
    );
  }

  return (
    <g
      aria-label={nameOf(item)}
      className={cn(
        "outline-none focus-visible:[&>g>*]:stroke-ring",
        editable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
        parked && "opacity-75",
      )}
      data-item-id={item.id}
      role="button"
      tabIndex={0}
    >
      <g transform={`translate(${item.x} ${item.y}) rotate(${item.rot})`}>{body}</g>
      <ItemLabel chairsUsed={chairsUsed} item={item} />
    </g>
  );
}

function ItemLabel({ item, chairsUsed }: { item: PlanItem; chairsUsed: number }) {
  const spec = specOf(item);
  if (!item.label) return null;

  const zoneish = spec.look === "zone" || spec.look === "decor";
  const labelClass = zoneish
    ? "pointer-events-none fill-muted-foreground uppercase tracking-[0.12em]"
    : "pointer-events-none fill-primary font-semibold";
  const labelSize = zoneish ? 28 : 30;

  if (spec.shape === "tri") {
    const pts = trianglePoints(item);
    const cx = item.x + (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
    const cy = item.y + (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
    return (
      <text className={labelClass} dominantBaseline="central" style={{ fontSize: labelSize }} textAnchor="middle" x={cx} y={cy}>
        {item.label}
      </text>
    );
  }

  const chairs = spec.noChairs ? 0 : seatsOf(item);
  const lift = chairs && spec.shape === "circle" ? 12 : 0;
  const x = item.x + (item.lx ?? 0);
  const y = item.y + (item.ly ?? 0) - lift;
  let sideways = false;
  if (spec.shape === "rect") {
    const { sw, sh } = shownSize(item);
    sideways = sh > sw * 1.4 && item.label.length > 3;
  }

  let sub: string | null = null;
  const overFull = spec.table && chairsUsed > chairs;
  if (chairs && spec.table) sub = chairsUsed ? `${chairsUsed}/${chairs} seated` : `${chairs} seats`;
  if (item.type === "dance") {
    const { sw, sh } = shownSize(item);
    sub = `${+(sw / 100).toFixed(1)} × ${+(sh / 100).toFixed(1)} m`;
  }

  return (
    <>
      <text
        className={labelClass}
        dominantBaseline="central"
        style={{ fontSize: labelSize }}
        textAnchor="middle"
        transform={sideways ? `rotate(-90 ${x} ${y})` : undefined}
        x={x}
        y={y}
      >
        {item.label}
      </text>
      {sub ? (
        <text className={cn("pointer-events-none", overFull ? "fill-destructive font-semibold" : "fill-muted-foreground")} dominantBaseline="central" style={{ fontSize: 22 }} textAnchor="middle" x={item.x} y={item.y + (item.type === "dance" ? 36 : 22)}>
          {sub}
        </text>
      ) : null}
    </>
  );
}

function Handles({ item, resizing }: { item: PlanItem; resizing: boolean }) {
  const handle = (x: number, y: number, edge: string, cursor: string) => (
    <g className={cn(cursor, "touch-none")} data-edge={edge} data-handle={item.id} key={edge}>
      <circle className="fill-transparent" cx={x} cy={y} r={34} />
      <rect className="fill-card stroke-lisa [stroke-width:5]" height={28} rx={5} width={28} x={x - 14} y={y - 14} />
    </g>
  );

  if (specOf(item).shape === "circle") {
    const r = diameterOf(item) / 2;
    return (
      <g>
        {handle(item.x + r, item.y, "e", "cursor-ew-resize")}
        <text className="pointer-events-none fill-lisa" style={{ fontSize: 26 }} textAnchor="middle" x={item.x} y={item.y - r - 70}>
          ⌀ {Math.round(diameterOf(item))} cm
        </text>
      </g>
    );
  }

  const { sw, sh } = shownSize(item);
  const x1 = item.x - sw / 2;
  const x2 = item.x + sw / 2;
  const y1 = item.y - sh / 2;
  const y2 = item.y + sh / 2;

  return (
    <g>
      {handle(x1, y1, "nw", "cursor-nwse-resize")}
      {handle(x2, y1, "ne", "cursor-nesw-resize")}
      {handle(x1, y2, "sw", "cursor-nesw-resize")}
      {handle(x2, y2, "se", "cursor-nwse-resize")}
      {sw > 120 ? [handle(item.x, y1, "n", "cursor-ns-resize"), handle(item.x, y2, "s", "cursor-ns-resize")] : null}
      {sh > 120 ? [handle(x1, item.y, "w", "cursor-ew-resize"), handle(x2, item.y, "e", "cursor-ew-resize")] : null}
      {resizing ? (
        <text className="pointer-events-none fill-lisa" style={{ fontSize: 26 }} textAnchor="middle" x={item.x} y={y1 - 40}>
          {(sw / 100).toFixed(2)} × {(sh / 100).toFixed(2)} m
        </text>
      ) : null}
    </g>
  );
}

function OutsideLabel({
  x,
  y,
  children,
  anchor = "middle",
  rotate,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  rotate?: number;
}) {
  return (
    <text
      className="pointer-events-none fill-muted-foreground uppercase tracking-[0.12em]"
      style={{ fontSize: 26 }}
      textAnchor={anchor}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      x={x}
      y={y}
    >
      {children}
    </text>
  );
}

/**
 * The ground floor around the hall, from the venue sketch and photos. It shows
 * where things are, not their true size, and can't be dragged.
 */
function Surroundings({ room }: { room: FloorPlan["room"] }) {
  const { w: W, h: H } = room;
  const doorMid = HALLWAY_DOOR_TOP + HALLWAY_DOOR_WIDTH / 2;
  const lobbyX1 = -560;
  const lobbyX2 = 60;
  const corridorBottom = H + 190;
  const lobbyBottom = H + 540;
  const kitchenX = 820;
  const lobbyRight = 70;
  const roomClass = "fill-muted/70 stroke-muted-foreground/50 [stroke-width:3]";

  return (
    <g>
      <path
        className={cn(HALL_FILL, "stroke-muted-foreground/60 [stroke-width:4]")}
        d={`M -20 ${HALLWAY_DOOR_TOP - 80} L ${-HALL_WIDTH} ${HALLWAY_DOOR_TOP - 80} L ${-HALL_WIDTH} ${H + 20} L ${lobbyX1} ${H + 20} L ${lobbyX1} ${lobbyBottom} L ${lobbyX2} ${lobbyBottom} L ${lobbyX2} ${corridorBottom} L ${kitchenX} ${corridorBottom} L ${kitchenX} ${H + 20} L -20 ${H + 20} Z`}
      />
      <rect className={roomClass} height={lobbyBottom - corridorBottom - 120} width={370} x={lobbyX2} y={corridorBottom + 60} />
      <rect className={roomClass} height={lobbyBottom - corridorBottom} width={kitchenX - lobbyX2 - 370} x={lobbyX2 + 370} y={corridorBottom} />

      {/* lobby where the hallway, corridor and entrance hall meet */}
      <rect className={cn(HALL_FILL, "stroke-muted-foreground/60 [stroke-width:4]")} height={220} width={lobbyRight + HALL_WIDTH} x={-HALL_WIDTH} y={H + 20} />
      <DoorShape inner transform={`translate(-85 ${H + 20}) rotate(180)`} width={120} />
      <DoorShape double inner transform={`translate(${lobbyRight} ${H + 45}) rotate(90)`} width={130} />
      <DoorShape inner transform={`translate(-110 ${H + 240}) rotate(180)`} width={120} />
      <rect className={roomClass} height={lobbyBottom - H - 60} width={W + 240 - kitchenX} x={kitchenX} y={H + 60} />

      <OutsideLabel rotate={-90} x={-HALL_WIDTH + 50} y={H - 350}>Hallway</OutsideLabel>
      <OutsideLabel x={(lobbyX1 + lobbyX2) / 2} y={lobbyBottom - 40}>Entrance hall</OutsideLabel>
      <OutsideLabel x={lobbyX2 + 185} y={lobbyBottom - 90}>Stairs</OutsideLabel>
      <OutsideLabel x={(lobbyX2 + 370 + kitchenX) / 2} y={lobbyBottom - 40}>Toilets</OutsideLabel>
      <OutsideLabel x={(kitchenX + W + 240) / 2} y={lobbyBottom - 40}>Kitchen</OutsideLabel>
      <OutsideLabel x={W / 2 + 150} y={corridorBottom - 20}>Corridor</OutsideLabel>

      {/* car park beyond the left side */}
      <g className="stroke-muted-foreground/60 [stroke-width:3]">
        {Array.from({ length: Math.max(0, Math.ceil((H - HALLWAY_DOOR_TOP) / 220)) }, (_, i) => (
          <line key={i} x1={-740} x2={-590} y1={HALLWAY_DOOR_TOP + i * 220} y2={HALLWAY_DOOR_TOP + i * 220} />
        ))}
      </g>
      <OutsideLabel rotate={-90} x={-540} y={(HALLWAY_DOOR_TOP + H) / 2}>Car park</OutsideLabel>

      {/* the way to the food and back in */}
      <path
        className="fill-none stroke-james/70 [stroke-dasharray:18_12] [stroke-width:5]"
        d={`M -30 ${doorMid} L -170 ${doorMid + 120} L -170 ${H + 105} L ${W / 2} ${H + 105} L ${W / 2} ${H - 110}`}
        markerEnd="url(#plan-arrow)"
      />
    </g>
  );
}

function HallwayWindows({ room }: { room: FloorPlan["room"] }) {
  const tops: number[] = [];
  for (let y = HALLWAY_DOOR_TOP + HALLWAY_DOOR_WIDTH + 200; y + 160 < room.h - 320; y += 300) tops.push(y);

  return (
    <g>
      {tops.map((y) => (
        <g key={y}>
          <line className="stroke-card [stroke-width:20]" x1={-8} x2={-8} y1={y} y2={y + 160} />
          <line className="stroke-primary [stroke-width:4]" x1={-14} x2={-14} y1={y} y2={y + 160} />
          <line className="stroke-primary [stroke-width:4]" x1={-2} x2={-2} y1={y} y2={y + 160} />
        </g>
      ))}
    </g>
  );
}

/**
 * A door drawn on a wall running along x with the room above it (-y), then
 * turned onto the wall it belongs to.
 */
function Door({
  wall,
  start,
  width,
  outward = false,
  double = false,
  room,
}: {
  wall: "top" | "bottom" | "left" | "right";
  start: number;
  width: number;
  outward?: boolean;
  double?: boolean;
  room: FloorPlan["room"];
}) {
  const transform = {
    bottom: `translate(${start} ${room.h})`,
    top: `translate(${start + width} 0) rotate(180)`,
    left: `translate(0 ${start}) rotate(90)`,
    right: `translate(${room.w} ${start + width}) rotate(-90)`,
  }[wall];

  return <DoorShape double={double} outward={outward} transform={transform} width={width} />;
}

const HALL_FILL = "fill-[hsl(33_30%_91%)]";

/**
 * A door in local coordinates: the wall runs along x from 0 to `width`, and
 * the room it opens into is above (-y) unless it opens outward. An inner door
 * sits in a thin partition, so its gap is painted in the floor colour.
 */
function DoorShape({
  transform,
  width,
  outward = false,
  double = false,
  inner = false,
}: {
  transform: string;
  width: number;
  outward?: boolean;
  double?: boolean;
  inner?: boolean;
}) {
  const dir = outward ? -1 : 1;
  const leaf = "stroke-primary [stroke-width:4]";
  const swing = "fill-none stroke-muted-foreground [stroke-width:2] [stroke-dasharray:8_6]";
  const half = width / 2;

  return (
    <g transform={transform}>
      {inner ? (
        <line className="stroke-[hsl(33_30%_91%)] [stroke-width:8]" x1={0} x2={width} y1={0} y2={0} />
      ) : (
        <line className="stroke-card [stroke-width:20]" x1={0} x2={width} y1={8} y2={8} />
      )}
      {double ? (
        <>
          <line className={leaf} x1={0} x2={0} y1={0} y2={-dir * half} />
          <line className={leaf} x1={width} x2={width} y1={0} y2={-dir * half} />
          <path
            className={swing}
            d={`M ${half} 0 A ${half} ${half} 0 0 ${dir > 0 ? 0 : 1} 0 ${-dir * half} M ${width - half} 0 A ${half} ${half} 0 0 ${dir > 0 ? 1 : 0} ${width} ${-dir * half}`}
          />
        </>
      ) : (
        <>
          <line className={leaf} x1={0} x2={0} y1={0} y2={-dir * width} />
          <path className={swing} d={`M ${width} 0 A ${width} ${width} 0 0 ${dir > 0 ? 0 : 1} 0 ${-dir * width}`} />
        </>
      )}
    </g>
  );
}

function Dimensions({ room }: { room: FloorPlan["room"] }) {
  const { w: W, h: H } = room;
  const line = "fill-none stroke-muted-foreground [stroke-width:2]";
  const label = "fill-muted-foreground";
  const dx = W + 130;

  return (
    <g>
      <line className={line} x1={0} x2={W} y1={-80} y2={-80} />
      <line className={line} x1={0} x2={0} y1={-96} y2={-64} />
      <line className={line} x1={W} x2={W} y1={-96} y2={-64} />
      <text className={label} style={{ fontSize: 34 }} textAnchor="middle" x={W / 2} y={-94}>
        {(W / 100).toFixed(1)} m (est.)
      </text>

      <line className={line} x1={dx} x2={dx} y1={0} y2={H} />
      <line className={line} x1={dx - 16} x2={dx + 16} y1={0} y2={0} />
      <line className={line} x1={dx - 16} x2={dx + 16} y1={H} y2={H} />
      <text className={label} style={{ fontSize: 34 }} textAnchor="middle" transform={`rotate(90 ${dx + 40} ${H / 2})`} x={dx + 40} y={H / 2}>
        {(H / 100).toFixed(1)} m (est.)
      </text>

      {/* 5 m scale bar */}
      <g transform="translate(-700 -95)">
        {Array.from({ length: 5 }, (_, i) => (
          <rect className={cn("stroke-primary [stroke-width:2]", i % 2 ? "fill-card" : "fill-primary")} height={14} key={i} width={100} x={i * 100} y={0} />
        ))}
        <text className={label} style={{ fontSize: 34 }} x={0} y={56}>
          0
        </text>
        <text className={label} style={{ fontSize: 34 }} textAnchor="middle" x={500} y={56}>
          5 m
        </text>
      </g>
    </g>
  );
}
