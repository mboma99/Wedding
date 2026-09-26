"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Unlink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sideLabels } from "@/features/guests/types";
import type { GuestListItem, HouseholdOption } from "@/features/guests/types";
import { assignHouseholdAction } from "@/server/actions/guests";

type HouseholdGroupingToolbarProps = {
  selectedGuests: GuestListItem[];
  householdOptions: HouseholdOption[];
  onClearSelection: () => void;
};

export function HouseholdGroupingToolbar({
  selectedGuests,
  householdOptions,
  onClearSelection,
}: HouseholdGroupingToolbarProps) {
  const router = useRouter();
  const [householdName, setHouseholdName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sides = Array.from(new Set(selectedGuests.map((guest) => guest.side)));
  const isMixedSides = sides.length > 1;
  const trimmedName = householdName.trim().replace(/\s+/g, " ");

  // Only households on the selected guests' side can be joined, since a
  // household is identified by side and name together.
  const sideHouseholds = useMemo(
    () =>
      sides.length === 1
        ? householdOptions.filter((option) => option.side === sides[0])
        : householdOptions,
    [householdOptions, sides],
  );

  const matchedHousehold = sideHouseholds.find(
    (option) => option.householdName.toLowerCase() === trimmedName.toLowerCase(),
  );
  const alreadyGrouped = selectedGuests.filter((guest) => guest.householdName);

  function runUpdate(nextHouseholdName: string | null) {
    setError(null);
    setNotice(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await assignHouseholdAction(
        selectedGuests.map((guest) => guest.id),
        nextHouseholdName,
      );

      setIsPending(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setNotice(
        result.householdName
          ? `${result.guestCount} ${
              result.guestCount === 1 ? "guest" : "guests"
            } grouped into ${result.householdName}.`
          : `Removed ${result.guestCount} ${
              result.guestCount === 1 ? "guest" : "guests"
            } from their household.`,
      );
      setHouseholdName("");
      onClearSelection();
      router.refresh();
    });
  }

  return (
    <div className="sticky bottom-3 z-20 mt-4 rounded-[1.5rem] border border-primary/20 bg-white/95 p-3.5 shadow-lg backdrop-blur sm:bottom-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                {selectedGuests.length} selected
              </p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {selectedGuests.map((guest) => guest.fullName).join(", ")}
              </p>
            </div>
          </div>
          <Button onClick={onClearSelection} size="sm" type="button" variant="ghost">
            <X className="mr-2 h-4 w-4" />
            Clear selection
          </Button>
        </div>

        {isMixedSides ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The selection covers both sides ({sides.map((side) => sideLabels[side]).join(" and ")}).
            A household belongs to one side, so group these separately.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                Household name
              </span>
              <Input
                list="household-options"
                onChange={(event) => setHouseholdName(event.target.value)}
                placeholder="e.g. Moyo Family"
                value={householdName}
              />
              <datalist id="household-options">
                {sideHouseholds.map((option) => (
                  <option
                    key={`${option.side}-${option.householdName}`}
                    value={option.householdName}
                  >
                    {`${option.linkedGuestCount} guest${
                      option.linkedGuestCount === 1 ? "" : "s"
                    }`}
                  </option>
                ))}
              </datalist>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={isPending || !trimmedName}
                onClick={() => runUpdate(trimmedName)}
                type="button"
              >
                <Home className="mr-2 h-4 w-4" />
                {isPending
                  ? "Saving..."
                  : matchedHousehold
                    ? `Add to ${matchedHousehold.householdName}`
                    : "Group into household"}
              </Button>
              {alreadyGrouped.length ? (
                <Button
                  disabled={isPending}
                  onClick={() => runUpdate(null)}
                  type="button"
                  variant="outline"
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Remove from household
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {matchedHousehold && !isMixedSides ? (
          <p className="text-sm text-muted-foreground">
            {matchedHousehold.householdName} already has{" "}
            {matchedHousehold.linkedGuestCount} guest
            {matchedHousehold.linkedGuestCount === 1 ? "" : "s"}. The selected guests
            will join them and share one RSVP link.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
