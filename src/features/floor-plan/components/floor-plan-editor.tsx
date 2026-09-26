"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { toast } from "sonner";
import { Copy, Plus, RotateCw, Search, Trash2, X } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  chairsNeeded,
  defaultFloorPlan,
  diameterOf,
  findClashes,
  guestsByTable,
  isParked,
  nameOf,
  nextTableLabel,
  seatingSummary,
  seatsOf,
  shownSize,
  specOf,
  TRAY_TOP,
  turned,
  withShownSize,
  type FloorPlan,
  type ItemType,
  type PlanItem,
  type SeatingGuest,
} from "@/domain/floor-plan";
import { PLAN_LEFT, PLAN_RIGHT, PlanCanvas } from "@/features/floor-plan/components/plan-canvas";
import { cn } from "@/lib/utils";
import { saveFloorPlanAction } from "@/server/actions/floor-plan";

type SaveState = "saved" | "pending" | "saving" | "error";

type Drag =
  | { mode: "move"; id: string; ox: number; oy: number }
  | { mode: "resize"; id: string; edge: string; left: number; right: number; top: number; bottom: number };

const SAVE_DELAY = 800;
const snap = (v: number) => Math.round(v / 5) * 5;

export function FloorPlanEditor({ initialPlan, guests }: { initialPlan: FloorPlan; guests: SeatingGuest[] }) {
  const [plan, setPlan] = useState(initialPlan);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [confirmReset, setConfirmReset] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // On a phone the plan is wider than the screen; start with the hall in view
  // rather than the car park at the left edge.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const hallCentre = (PLAN_LEFT + initialPlan.room.w / 2) / (PLAN_LEFT + initialPlan.room.w + PLAN_RIGHT);
    scroller.scrollLeft = hallCentre * scroller.scrollWidth - scroller.clientWidth / 2;
  }, [initialPlan.room.w]);
  const lastSaved = useRef(initialPlan);

  const { clashing, messages } = useMemo(() => findClashes(plan), [plan]);
  const summary = useMemo(() => seatingSummary(plan, guests), [plan, guests]);
  const byTable = useMemo(() => guestsByTable(plan, guests), [plan, guests]);
  const chairsUsed = useMemo(
    () => new Map([...byTable].map(([id, seated]) => [id, seated.reduce((sum, g) => sum + chairsNeeded(g), 0)])),
    [byTable],
  );
  const selected = plan.items.find((item) => item.id === selectedId) ?? null;

  // Save a moment after the last change; a drag keeps pushing it back, so it
  // saves once when the item is let go.
  const save = useCallback(async (next: FloorPlan) => {
    setSaveState("saving");
    const result = await saveFloorPlanAction(next);
    if (result.success) {
      lastSaved.current = next;
      setSaveState((state) => (state === "saving" ? "saved" : state));
    } else {
      setSaveState("error");
      toast.error(result.message);
    }
  }, []);

  useEffect(() => {
    if (plan === lastSaved.current) return;
    setSaveState("pending");
    if (drag) return;
    const timer = window.setTimeout(() => void save(plan), SAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [plan, drag, save]);

  useEffect(() => {
    if (saveState === "saved") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const updateItem = (id: string, change: (item: PlanItem) => PlanItem) =>
    setPlan((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? change(item) : item)),
    }));

  function toPlan(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    const target = event.target as Element;
    const handle = target.closest<SVGGElement>("[data-handle]");
    const itemEl = target.closest<SVGGElement>("[data-item-id]");

    if (handle) {
      const item = plan.items.find((i) => i.id === handle.dataset.handle);
      if (!item) return;
      const { sw, sh } = specOf(item).shape === "circle" ? { sw: 0, sh: 0 } : shownSize(item);
      setDrag({
        mode: "resize",
        id: item.id,
        edge: handle.dataset.edge ?? "se",
        left: item.x - sw / 2,
        right: item.x + sw / 2,
        top: item.y - sh / 2,
        bottom: item.y + sh / 2,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (!itemEl) {
      setSelectedId(null);
      return;
    }

    const item = plan.items.find((i) => i.id === itemEl.dataset.itemId);
    if (!item) return;
    const p = toPlan(event);
    setSelectedId(item.id);
    setDrag({ mode: "move", id: item.id, ox: p.x - item.x, oy: p.y - item.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = toPlan(event);

    if (drag.mode === "move") {
      const x = snap(p.x - drag.ox);
      const y = snap(p.y - drag.oy);
      updateItem(drag.id, (item) => (item.x === x && item.y === y ? item : { ...item, x, y }));
      return;
    }

    updateItem(drag.id, (item) => {
      if (specOf(item).shape === "circle") {
        const d = Math.max(60, Math.min(300, snap(2 * Math.hypot(p.x - item.x, p.y - item.y))));
        return d === item.d ? item : { ...item, d };
      }
      const MIN = 10;
      let { left, right, top, bottom } = drag;
      if (drag.edge.includes("w")) left = Math.min(snap(p.x), right - MIN);
      if (drag.edge.includes("e")) right = Math.max(snap(p.x), left + MIN);
      if (drag.edge.includes("n")) top = Math.min(snap(p.y), bottom - MIN);
      if (drag.edge.includes("s")) bottom = Math.max(snap(p.y), top + MIN);
      return { ...withShownSize(item, right - left, bottom - top), x: (left + right) / 2, y: (top + bottom) / 2 };
    });
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const itemEl = (event.target as Element).closest<SVGGElement>("[data-item-id]");
    const id = itemEl?.dataset.itemId;
    if (!id) return;
    const step = event.shiftKey ? 100 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setSelectedId(id);
      updateItem(id, (item) => ({ ...item, x: item.x + move[0], y: item.y + move[1] }));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    } else if ((event.key === "Delete" || event.key === "Backspace") && id === selectedId) {
      event.preventDefault();
      removeSelected();
    }
  }

  function addItem(type: ItemType) {
    const trayCount = plan.items.filter((item) => isParked(item, plan.room)).length;
    const item: PlanItem = {
      id: `i${Date.now().toString(36)}`,
      type,
      label: "",
      rot: 0,
      x: Math.min(plan.room.w - 150, 550 + (trayCount % 3) * 260),
      y: plan.room.h + TRAY_TOP + 130,
      seats: specOf({ type } as PlanItem).seats,
    };
    if (type === "corner") Object.assign(item, { w: 300, h: 300, corner: "sw", label: "AREA", seats: undefined });
    else item.label = nextTableLabel(plan.items);
    setPlan((current) => ({ ...current, items: [...current.items, item] }));
    setSelectedId(item.id);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy: PlanItem = {
      ...selected,
      id: `i${Date.now().toString(36)}`,
      x: selected.x + 60,
      y: selected.y + 60,
      label: specOf(selected).table ? nextTableLabel(plan.items) : selected.label,
    };
    setPlan((current) => ({ ...current, items: [...current.items, copy] }));
    setSelectedId(copy.id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setPlan((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== selectedId),
      assignments: Object.fromEntries(Object.entries(current.assignments).filter(([, tableId]) => tableId !== selectedId)),
    }));
    setSelectedId(null);
  }

  function seatAt(guestIds: string[], tableId: string) {
    setPlan((current) => ({
      ...current,
      assignments: { ...current.assignments, ...Object.fromEntries(guestIds.map((id) => [id, tableId])) },
    }));
  }

  function unseat(guestId: string) {
    setPlan((current) => {
      const assignments = { ...current.assignments };
      delete assignments[guestId];
      return { ...current, assignments };
    });
  }

  function setRoomSize(axis: "w" | "h", metres: number) {
    const cm = Math.round(metres * 100);
    if (!Number.isFinite(cm) || cm < 400 || cm > 5000) return;
    setPlan((current) => {
      const shift = axis === "h" ? cm - current.room.h : 0;
      return {
        ...current,
        room: { ...current.room, [axis]: cm },
        // Keep anything waiting in the tray in the tray.
        items: shift
          ? current.items.map((item) => (isParked(item, current.room) ? { ...item, y: item.y + shift } : item))
          : current.items,
      };
    });
  }

  const statusText = {
    saved: "All changes saved",
    pending: "Saving…",
    saving: "Saving…",
    error: "Not saved",
  }[saveState];

  return (
    <main className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
      <PageHeader
        actions={
          <div className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full",
                saveState === "saved" && "bg-emerald-600",
                (saveState === "pending" || saveState === "saving") && "bg-amber-500",
                saveState === "error" && "bg-destructive",
              )}
            />
            <span aria-live="polite" className="text-muted-foreground">
              {statusText}
            </span>
            {saveState === "error" ? (
              <Button onClick={() => void save(plan)} size="sm" type="button" variant="outline">
                Try again
              </Button>
            ) : null}
          </div>
        }
        meta="Main hall at Rainworth Village Hall. Drag to move, use the pink handles to resize. Changes save automatically."
        title="Floor plan"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain" ref={scrollerRef}>
            <PlanCanvas
              chairsUsed={chairsUsed}
              clashing={clashing}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDrag(null)}
              plan={plan}
              resizing={drag?.mode === "resize"}
              selectedId={selectedId}
              svgRef={svgRef}
            />
          </div>
          <dl className="grid grid-cols-2 border-t border-border/80 text-sm sm:grid-cols-4">
            {[
              ["Venue", "Rainworth Village Hall"],
              ["Room", `${(plan.room.w / 100).toFixed(1)} × ${(plan.room.h / 100).toFixed(1)} m (est.)`],
              ["Scale", "Grid = 1 m"],
              ["Status", "Estimate, not to scale"],
            ].map(([term, value]) => (
              <div
                className="border-border/80 px-4 py-3 odd:border-r [&:nth-child(-n+2)]:border-b sm:border-r sm:last:border-r-0 sm:[&:nth-child(-n+2)]:border-b-0"
                key={term}
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{term}</dt>
                <dd className="font-medium text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <aside className="space-y-4">
          <Panel title="Seating">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="seats in the room" value={summary.seats} />
              <Stat label="people to seat" value={summary.people} />
              <Stat label="people with a table" value={summary.seated} />
              <Stat label="still to seat" value={summary.unseated} />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              From your guest list: everyone who hasn&apos;t declined
              {summary.plusOnes ? `, ${summary.plusOnes} plus-one${summary.plusOnes === 1 ? "" : "s"}` : ""} and
              you both on the stage.
              {summary.declined ? ` ${summary.declined} declined and aren't counted.` : ""} Select a table to seat guests at it.
            </p>
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                summary.spare >= 0 && !messages.length
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {summary.spare < 0
                ? `${-summary.spare} people short of a seat. Add a table or more seats.`
                : messages.length
                  ? `Everyone has a seat${summary.spare ? ` (${summary.spare} spare)` : ""}, but some things overlap.`
                  : `Everyone has a seat${summary.spare ? `, with ${summary.spare} spare` : ""}. Walking room between tables isn't checked.`}
            </p>
            {messages.length ? (
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-destructive">
                {messages.slice(0, 8).map((message) => (
                  <li key={message}>{message}</li>
                ))}
                {messages.length > 8 ? <li>and {messages.length - 8} more</li> : null}
              </ul>
            ) : null}
          </Panel>

          {selected ? (
            <SelectedPanel
              item={selected}
              key={selected.id}
              onChange={(change) => updateItem(selected.id, change)}
              onDuplicate={duplicateSelected}
              onRemove={removeSelected}
            >
              {specOf(selected).table ? (
                <TableGuests
                  assignments={plan.assignments}
                  guests={guests}
                  onSeat={(ids) => seatAt(ids, selected.id)}
                  onUnseat={unseat}
                  seated={byTable.get(selected.id) ?? []}
                  seats={seatsOf(selected)}
                  tableLabels={new Map(plan.items.map((item) => [item.id, nameOf(item)]))}
                />
              ) : null}
            </SelectedPanel>
          ) : null}

          <Panel title="Add">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => addItem("round")} size="sm" type="button">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Round table
              </Button>
              <Button onClick={() => addItem("trestle")} size="sm" type="button" variant="outline">
                Long table
              </Button>
              <Button onClick={() => addItem("corner")} size="sm" type="button" variant="outline">
                Corner area
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">New items land in the &ldquo;To place&rdquo; tray under the plan.</p>
          </Panel>

          <Panel title="Room size">
            <p className="text-sm text-muted-foreground">
              Change these once you&apos;ve measured the hall. A normal step is about 0.75 m.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field id="plan-room-w" label="Side to side (m)">
                <MetreInput id="plan-room-w" onCommit={(m) => setRoomSize("w", m)} value={plan.room.w / 100} />
              </Field>
              <Field id="plan-room-h" label="Stage to entrance (m)">
                <MetreInput id="plan-room-h" onCommit={(m) => setRoomSize("h", m)} value={plan.room.h / 100} />
              </Field>
            </div>
            {confirmReset ? (
              <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
                <p>This puts everything back to the layout from your sketch. Guests stay at tables that are still there.</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      // Keep who sits where; tables that still exist keep their guests.
                      setPlan((current) => ({ ...defaultFloorPlan(), assignments: current.assignments }));
                      setSelectedId(null);
                      setConfirmReset(false);
                    }}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    Reset
                  </Button>
                  <Button onClick={() => setConfirmReset(false)} size="sm" type="button" variant="outline">
                    Keep my changes
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setConfirmReset(true)} size="sm" type="button" variant="outline">
                Reset to the sketch layout
              </Button>
            )}
          </Panel>

          <Panel title="What's assumed">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>The room size is a guess until it&apos;s measured.</li>
              <li>Round tables are 5 ft (152 cm) with 55 cm of chair space around each.</li>
              <li>Red means two things overlap or something is past a wall.</li>
              <li>The rooms around the hall show where things are, not their true size.</li>
              <li>Plus-ones sit with the guest who brings them.</li>
              <li>If you both edit at once, the last change saved wins.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function SelectedPanel({
  item,
  onChange,
  onDuplicate,
  onRemove,
  children,
}: {
  children?: ReactNode;
  item: PlanItem;
  onChange: (change: (item: PlanItem) => PlanItem) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const spec = specOf(item);
  const round = spec.shape === "circle";
  const { sw, sh } = round ? { sw: 0, sh: 0 } : shownSize(item);

  return (
    <Panel title={`Selected · ${nameOf(item)}`}>
      <Field id="plan-item-label" label="Name">
        <Input
          id="plan-item-label"
          maxLength={40}
          onChange={(event) => onChange((current) => ({ ...current, label: event.target.value }))}
          value={item.label}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {round ? (
          <Field id="plan-item-d" label="Diameter (cm)">
            <NumberInput
              id="plan-item-d"
              max={300}
              min={60}
              onCommit={(d) => onChange((current) => ({ ...current, d }))}
              value={Math.round(diameterOf(item))}
            />
          </Field>
        ) : (
          <>
            <Field id="plan-item-w" label="Across (m)">
              <MetreInput id="plan-item-w" onCommit={(m) => onChange((current) => withShownSize(current, Math.round(m * 100), sh))} value={sw / 100} />
            </Field>
            <Field id="plan-item-h" label="Down (m)">
              <MetreInput id="plan-item-h" onCommit={(m) => onChange((current) => withShownSize(current, sw, Math.round(m * 100)))} value={sh / 100} />
            </Field>
          </>
        )}
        {spec.seatOptions ? (
          <Field id="plan-item-seats" label="Seats">
            <Select
              id="plan-item-seats"
              onChange={(event) => onChange((current) => ({ ...current, seats: Number(event.target.value) }))}
              value={seatsOf(item)}
            >
              {spec.seatOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
      {round ? (
        <p className="text-sm text-muted-foreground">5 ft is 152 cm, 5 ft 6 is 168 cm, 6 ft is 183 cm.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onChange(turned)} size="sm" type="button" variant="outline">
          <RotateCw className="mr-1 h-3.5 w-3.5" />
          Rotate
        </Button>
        <Button onClick={onDuplicate} size="sm" type="button" variant="outline">
          <Copy className="mr-1 h-3.5 w-3.5" />
          Duplicate
        </Button>
        <Button onClick={onRemove} size="sm" type="button" variant="outline" className="text-destructive">
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
      {children}
    </Panel>
  );
}

function SideDot({ side }: { side: SeatingGuest["side"] }) {
  return (
    <span
      aria-label={side === "LISA" ? "Lisa's side" : "James's side"}
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", side === "LISA" ? "bg-lisa" : "bg-james")}
      role="img"
    />
  );
}

function guestName(guest: SeatingGuest) {
  if (!guest.plusOne) return guest.name;
  return `${guest.name} + ${guest.plusOneName ?? "guest"}`;
}

/** Who sits at the selected table, and a searchable list to add more. */
function TableGuests({
  seated,
  seats,
  guests,
  assignments,
  tableLabels,
  onSeat,
  onUnseat,
}: {
  seated: SeatingGuest[];
  seats: number;
  guests: SeatingGuest[];
  assignments: Record<string, string>;
  tableLabels: Map<string, string>;
  onSeat: (guestIds: string[]) => void;
  onUnseat: (guestId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const used = seated.reduce((sum, guest) => sum + chairsNeeded(guest), 0);
  const seatedIds = new Set(seated.map((guest) => guest.id));
  const query = search.trim().toLowerCase();

  // Unseated guests first, then those at another table (picking them moves them).
  const tableOf = (guest: SeatingGuest) => {
    const id = assignments[guest.id];
    return id && tableLabels.has(id) ? tableLabels.get(id)! : null;
  };
  const candidates = guests
    .filter((guest) => !guest.declined && !seatedIds.has(guest.id))
    .filter(
      (guest) =>
        !query ||
        guest.name.toLowerCase().includes(query) ||
        (guest.household ?? "").toLowerCase().includes(query) ||
        (guest.plusOneName ?? "").toLowerCase().includes(query),
    )
    .sort((a, b) => Number(Boolean(tableOf(a))) - Number(Boolean(tableOf(b))));

  const households = new Map<string, SeatingGuest[]>();
  for (const guest of candidates) {
    const key = guest.household ? `${guest.side}:${guest.household}` : `solo:${guest.id}`;
    households.set(key, [...(households.get(key) ?? []), guest]);
  }

  return (
    <div className="space-y-3 border-t border-border/80 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-primary">Guests at this table</h3>
        <span className={cn("text-sm", used > seats ? "font-semibold text-destructive" : "text-muted-foreground")}>
          {used} of {seats} chairs
        </span>
      </div>

      {seated.length ? (
        <ul className="space-y-1">
          {seated.map((guest) => (
            <li className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm" key={guest.id}>
              <SideDot side={guest.side} />
              <span className="min-w-0 flex-1 truncate">{guestName(guest)}</span>
              {guest.declined ? <span className="text-xs text-destructive">declined</span> : null}
              <button
                aria-label={`Take ${guest.name} off this table`}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onUnseat(guest.id)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nobody yet.</p>
      )}
      {used > seats ? (
        <p className="text-sm text-destructive">That&apos;s more people than chairs. Add seats or move someone.</p>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Find a guest to seat here"
          className="pl-9"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find a guest or household"
          value={search}
        />
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {[...households.entries()].map(([key, members]) => {
          const household = members[0].household;
          return (
            <div className="space-y-1" key={key}>
              {household && members.length > 1 ? (
                <div className="flex items-center justify-between gap-2 px-1 pt-1">
                  <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {household}
                  </span>
                  <button
                    aria-label={`Seat all of the ${household} household here`}
                    className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSeat(members.map((guest) => guest.id))}
                    type="button"
                  >
                    Seat all {members.reduce((sum, guest) => sum + chairsNeeded(guest), 0)}
                  </button>
                </div>
              ) : null}
              {members.map((guest) => {
                const elsewhere = tableOf(guest);
                return (
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={guest.id}
                    onClick={() => onSeat([guest.id])}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SideDot side={guest.side} />
                    <span className="min-w-0 flex-1 truncate">{guestName(guest)}</span>
                    {elsewhere ? <span className="shrink-0 text-xs text-muted-foreground">at {elsewhere}</span> : null}
                  </button>
                );
              })}
            </div>
          );
        })}
        {!candidates.length ? (
          <p className="px-1 text-sm text-muted-foreground">
            {query ? "No guests match that search." : "Everyone coming already has a table."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      {children}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * A number box that keeps what's typed until it's committed (Enter or leaving
 * the box), so a half-typed "1" doesn't shrink the room to a metre.
 */
function NumberInput({
  id,
  value,
  onCommit,
  min,
  max,
  step = 1,
}: {
  id: string;
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onCommit(parsed);
    setDraft(null);
  };

  return (
    <Input
      id={id}
      inputMode="decimal"
      max={max}
      min={min}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") setDraft(null);
      }}
      step={step}
      type="number"
      value={draft ?? String(value)}
    />
  );
}

function MetreInput({ id, value, onCommit }: { id: string; value: number; onCommit: (metres: number) => void }) {
  return <NumberInput id={id} max={50} min={0.1} onCommit={onCommit} step={0.1} value={+value.toFixed(2)} />;
}
