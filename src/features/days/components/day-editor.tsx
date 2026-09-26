"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DAY_NAMES, formatDayDate, type DayKey, type WeddingDay } from "@/domain/days";
import { cn } from "@/lib/utils";
import { saveWeddingDayAction } from "@/server/actions/days";

type Field = "date" | "startTime" | "venueName" | "address" | "mapUrl";

/**
 * One wedding day: its details and plan are edited then saved together; the
 * two reveal switches take effect straight away, using the saved details.
 */
export function DayEditor({ dayKey, initialDay, invitedCount }: { dayKey: DayKey; initialDay: WeddingDay; invitedCount: number }) {
  const [saved, setSaved] = useState(initialDay);
  const [day, setDay] = useState(initialDay);
  const [saving, setSaving] = useState(false);
  const id = (field: string) => `${dayKey}-${field}`;

  // The switches save on their own, so only the details count as unsaved.
  const details = (d: WeddingDay) => JSON.stringify([d.date, d.startTime, d.venueName, d.address, d.mapUrl, d.schedule]);
  const dirty = details(day) !== details(saved);
  const hasDate = Boolean(saved.date);
  const hasLocation = Boolean(saved.venueName || saved.address);

  const set = (field: Field, value: string) =>
    setDay((current) => ({ ...current, [field]: field === "date" ? value || null : value }));

  async function persist(next: WeddingDay) {
    setSaving(true);
    const result = await saveWeddingDayAction(dayKey, next);
    setSaving(false);
    if (!result.success) {
      toast.error(result.message);
      return false;
    }
    setSaved(next);
    return true;
  }

  async function saveDetails() {
    // Keep the live reveal settings; only the details are being saved here.
    const next = { ...day, revealDate: saved.revealDate, revealLocation: saved.revealLocation };
    if (await persist(next)) {
      setDay(next);
      toast.success(`${DAY_NAMES[dayKey]} saved`);
    }
  }

  async function toggle(field: "revealDate" | "revealLocation", value: boolean) {
    const next = { ...saved, [field]: value };
    if (await persist(next)) {
      setDay((current) => ({ ...current, [field]: value }));
      toast.success(
        `${field === "revealDate" ? "Date" : "Location"} ${value ? "shown to" : "hidden from"} guests`,
      );
    }
  }

  function updateItem(itemId: string, field: "time" | "title", value: string) {
    setDay((current) => ({
      ...current,
      schedule: current.schedule.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{DAY_NAMES[dayKey]}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {dayKey === "celebration" ? "Everyone on the guest list" : `${invitedCount} invited`}
          </span>
        </div>
        <CardDescription>
          Guests only see what&apos;s switched on, and only once they&apos;ve said yes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reveal switches: they save straight away. */}
        <div className="divide-y divide-border/80 rounded-xl border border-border/80">
          <RevealRow
            description={hasDate ? formatDayDate(saved.date!) : "Add and save a date first."}
            disabled={saving || !hasDate}
            id={id("reveal-date")}
            label="Show the date"
            on={saved.revealDate}
            onChange={(value) => void toggle("revealDate", value)}
          />
          <RevealRow
            description={hasLocation ? saved.venueName || saved.address : "Add and save a location first."}
            disabled={saving || !hasLocation}
            id={id("reveal-location")}
            label="Show the location"
            on={saved.revealLocation}
            onChange={(value) => void toggle("revealLocation", value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <FieldBox htmlFor={id("date")} label="Date">
            <Input className="min-w-0 px-3" id={id("date")} onChange={(e) => set("date", e.target.value)} type="date" value={day.date ?? ""} />
          </FieldBox>
          <FieldBox htmlFor={id("time")} label="Starts at">
            <Input className="min-w-0 px-3" id={id("time")} onChange={(e) => set("startTime", e.target.value)} type="time" value={day.startTime} />
          </FieldBox>
        </div>
        <FieldBox htmlFor={id("venue")} label="Venue">
          <Input id={id("venue")} maxLength={120} onChange={(e) => set("venueName", e.target.value)} placeholder="e.g. Rainworth Village Hall" value={day.venueName} />
        </FieldBox>
        <FieldBox htmlFor={id("address")} label="Address">
          <Input id={id("address")} maxLength={300} onChange={(e) => set("address", e.target.value)} placeholder="Street, town, postcode" value={day.address} />
        </FieldBox>
        <FieldBox hint="Optional. Otherwise guests get a map link from the address." htmlFor={id("map")} label="Map link">
          <Input id={id("map")} inputMode="url" maxLength={500} onChange={(e) => set("mapUrl", e.target.value)} placeholder="https://maps.app.goo.gl/…" value={day.mapUrl} />
        </FieldBox>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-primary">Day plan</p>
            <p className="text-xs text-muted-foreground">Shown with the date, to guests who said yes.</p>
          </div>
          {day.schedule.length ? (
            <ul className="space-y-2">
              {day.schedule.map((item, index) => (
                <li className="flex items-center gap-2" key={item.id}>
                  <Input
                    aria-label={`Time for step ${index + 1}`}
                    className="w-28 min-w-0 shrink-0 px-3"
                    onChange={(e) => updateItem(item.id, "time", e.target.value)}
                    type="time"
                    value={item.time}
                  />
                  <Input
                    aria-label={`What happens at step ${index + 1}`}
                    maxLength={120}
                    onChange={(e) => updateItem(item.id, "title", e.target.value)}
                    placeholder="e.g. Guests arrive"
                    value={item.title}
                  />
                  <button
                    aria-label={`Remove step ${index + 1}`}
                    className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setDay((current) => ({ ...current, schedule: current.schedule.filter((s) => s.id !== item.id) }))}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
          )}
          <Button
            onClick={() =>
              setDay((current) => ({
                ...current,
                schedule: [...current.schedule, { id: `s${Date.now().toString(36)}`, time: "", title: "" }],
              }))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add a step
          </Button>
        </div>

        <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-border/80 pt-4", !dirty && "hidden")}>
          <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>
          <Button disabled={saving} onClick={() => setDay(saved)} size="sm" type="button" variant="outline">
            Discard
          </Button>
          <Button disabled={saving} onClick={() => void saveDetails()} size="sm" type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RevealRow({
  id,
  label,
  description,
  on,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  on: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {on ? <Eye aria-hidden className="h-4 w-4 shrink-0 text-emerald-700" /> : <EyeOff aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary" id={`${id}-label`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground" id={`${id}-hint`}>
          <span className={on ? "font-medium text-emerald-700" : undefined}>
            {on ? "Visible to guests who said yes" : "Hidden from guests"}
          </span>
          <span className="block truncate">{description}</span>
        </p>
      </div>
      <Switch
        aria-describedby={`${id}-hint`}
        aria-labelledby={`${id}-label`}
        checked={on}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function FieldBox({ htmlFor, label, hint, children }: { htmlFor: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
