"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DeleteGuestButton } from "@/features/guests/components/delete-guest-button";
import {
  createGuestAction,
  updateGuestAction,
} from "@/server/actions/guests";
import {
  getEmptyGuestFormValues,
  guestFormSchema,
  type GuestFormInitialValues,
  type GuestFormValues,
} from "@/features/guests/form-schema";
import {
  groupTypeLabels,
  groupTypeOptions,
  guestSideOptions,
  guestTypeLabels,
  guestTypeOptions,
  type HouseholdOption,
  inviteStatusLabels,
  inviteStatusOptions,
  rsvpStatusLabels,
  rsvpStatusOptions,
  sideLabels,
} from "@/features/guests/types";

type HouseholdLinkMode = "INDIVIDUAL" | "EXISTING" | "CUSTOM";

type GuestFormProps = {
  mode: "create" | "edit";
  guestId?: string;
  initialValues?: GuestFormInitialValues;
  householdOptions?: HouseholdOption[];
};

function buildHouseholdOptionKey(household: HouseholdOption) {
  return `${household.side}::${household.householdName}`;
}

function getInitialHouseholdMode(
  initialValues: GuestFormInitialValues,
  householdOptions: HouseholdOption[],
): HouseholdLinkMode {
  if (!initialValues.householdName) {
    return "INDIVIDUAL";
  }

  return householdOptions.some(
    (household) =>
      household.side === initialValues.side &&
      household.householdName === initialValues.householdName,
  )
    ? "EXISTING"
    : "CUSTOM";
}

function getInitialHouseholdKey(
  initialValues: GuestFormInitialValues,
  householdOptions: HouseholdOption[],
) {
  const matchingHousehold = householdOptions.find(
    (household) =>
      household.side === initialValues.side &&
      household.householdName === initialValues.householdName,
  );

  return matchingHousehold ? buildHouseholdOptionKey(matchingHousehold) : "";
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function GuestForm({
  mode,
  guestId,
  initialValues = getEmptyGuestFormValues(),
  householdOptions = [],
}: GuestFormProps) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [householdMode, setHouseholdMode] = useState<HouseholdLinkMode>(() =>
    getInitialHouseholdMode(initialValues, householdOptions),
  );
  const [selectedHouseholdKey, setSelectedHouseholdKey] = useState(() =>
    getInitialHouseholdKey(initialValues, householdOptions),
  );

  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: initialValues,
  });

  const side = form.watch("side");
  const householdName = form.watch("householdName");
  const plusOneAllowed = form.watch("plusOneAllowed");
  const availableHouseholds = householdOptions.filter(
    (household) => household.side === side,
  );
  const matchingTypedHousehold = availableHouseholds.find(
    (household) => household.householdName === householdName,
  );
  const selectedHousehold =
    availableHouseholds.find(
      (household) => buildHouseholdOptionKey(household) === selectedHouseholdKey,
    ) ?? availableHouseholds[0];
  const resultingHouseholdGuestCount =
    householdMode === "EXISTING" && selectedHousehold
      ? selectedHousehold.linkedGuestCount + 1
      : householdMode === "CUSTOM" && householdName
        ? (matchingTypedHousehold?.linkedGuestCount ?? 0) + 1
        : 0;

  useEffect(() => {
    if (householdMode !== "EXISTING") {
      return;
    }

    if (!availableHouseholds.length) {
      setHouseholdMode(householdName ? "CUSTOM" : "INDIVIDUAL");
      return;
    }

    const nextHousehold = selectedHousehold ?? availableHouseholds[0];
    const nextHouseholdKey = buildHouseholdOptionKey(nextHousehold);

    if (selectedHouseholdKey !== nextHouseholdKey) {
      setSelectedHouseholdKey(nextHouseholdKey);
    }

    if (householdName !== nextHousehold.householdName) {
      form.setValue("householdName", nextHousehold.householdName, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    availableHouseholds,
    form,
    householdMode,
    householdName,
    selectedHousehold,
    selectedHouseholdKey,
  ]);

  useEffect(() => {
    if (householdMode === "INDIVIDUAL" && householdName) {
      form.setValue("householdName", "", {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [form, householdMode, householdName]);

  function handleHouseholdModeChange(nextMode: HouseholdLinkMode) {
    setHouseholdMode(nextMode);

    if (nextMode === "INDIVIDUAL") {
      form.setValue("householdName", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (nextMode === "EXISTING") {
      const firstHousehold = availableHouseholds[0];

      if (!firstHousehold) {
        setHouseholdMode(householdName ? "CUSTOM" : "INDIVIDUAL");
        return;
      }

      setSelectedHouseholdKey(buildHouseholdOptionKey(firstHousehold));
      form.setValue("householdName", firstHousehold.householdName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function handleExistingHouseholdChange(nextHouseholdKey: string) {
    setSelectedHouseholdKey(nextHouseholdKey);

    const nextHousehold = availableHouseholds.find(
      (household) => buildHouseholdOptionKey(household) === nextHouseholdKey,
    );

    if (!nextHousehold) {
      return;
    }

    form.setValue("householdName", nextHousehold.householdName, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    setIsPending(true);

    startTransition(async () => {
      if (mode === "edit" && !guestId) {
        setServerMessage("This guest record cannot be updated right now.");
        setIsPending(false);
        return;
      }

      let result;

      if (mode === "create") {
        result = await createGuestAction(values);
      } else {
        const editGuestId = guestId;

        if (!editGuestId) {
          setServerMessage("This guest record cannot be updated right now.");
          setIsPending(false);
          return;
        }

        result = await updateGuestAction(editGuestId, values);
      }

      if (!result.success) {
        setServerMessage(result.message);
        setIsPending(false);
        return;
      }

      router.push("/admin/guests");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5 sm:space-y-6" onSubmit={onSubmit}>
      {serverMessage ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverMessage}
        </div>
      ) : null}

      <Card className="border-white/80 bg-white/85">
        <CardHeader>
          <CardTitle>Guest profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Full name"
            error={form.formState.errors.fullName?.message}
          >
            <Input
              disabled={isPending}
              placeholder="e.g. Mrs. Abena Asante"
              {...form.register("fullName")}
            />
          </FormField>

          <FormField
            label="Relation"
            error={form.formState.errors.relation?.message}
          >
            <Input
              disabled={isPending}
              placeholder="e.g. Mother's cousin"
              {...form.register("relation")}
            />
          </FormField>

          <FormField label="Side" error={form.formState.errors.side?.message}>
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              {...form.register("side")}
            >
              {guestSideOptions.map((side) => (
                <option key={side} value={side}>
                  {sideLabels[side]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Group type"
            error={form.formState.errors.groupType?.message}
          >
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              {...form.register("groupType")}
            >
              {groupTypeOptions.map((groupType) => (
                <option key={groupType} value={groupType}>
                  {groupTypeLabels[groupType]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Guest type"
            error={form.formState.errors.guestType?.message}
          >
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              {...form.register("guestType")}
            >
              {guestTypeOptions.map((guestType) => (
                <option key={guestType} value={guestType}>
                  {guestTypeLabels[guestType]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Household name"
            error={form.formState.errors.householdName?.message}
          >
            <div className="space-y-4 rounded-[1.25rem] border border-border/80 bg-muted/20 p-4">
              <div className="grid gap-3">
                <label className="rounded-[1rem] border border-border/80 bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      checked={householdMode === "INDIVIDUAL"}
                      className="mt-1 h-4 w-4"
                      disabled={isPending}
                      name="household-mode"
                      onChange={() => handleHouseholdModeChange("INDIVIDUAL")}
                      type="radio"
                    />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        Individual invite
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Keep this guest on their own invitation link.
                      </p>
                    </div>
                  </div>
                </label>

                <label className="rounded-[1rem] border border-border/80 bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      checked={householdMode === "EXISTING"}
                      className="mt-1 h-4 w-4"
                      disabled={isPending || availableHouseholds.length === 0}
                      name="household-mode"
                      onChange={() => handleHouseholdModeChange("EXISTING")}
                      type="radio"
                    />
                    <div className="w-full space-y-3">
                      <div>
                        <p className="text-sm font-medium text-primary">
                          Link to an existing household invite
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Attach this guest to a household already on the{" "}
                          {sideLabels[side]}.
                        </p>
                      </div>
                      <select
                        className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={
                          isPending ||
                          householdMode !== "EXISTING" ||
                          availableHouseholds.length === 0
                        }
                        onChange={(event) =>
                          handleExistingHouseholdChange(event.target.value)
                        }
                        value={
                          selectedHousehold
                            ? buildHouseholdOptionKey(selectedHousehold)
                            : ""
                        }
                      >
                        {availableHouseholds.length === 0 ? (
                          <option value="">
                            No existing households on {sideLabels[side]}
                          </option>
                        ) : (
                          availableHouseholds.map((household) => (
                            <option
                              key={buildHouseholdOptionKey(household)}
                              value={buildHouseholdOptionKey(household)}
                            >
                              {household.householdName} · {household.linkedGuestCount}{" "}
                              linked guest
                              {household.linkedGuestCount === 1 ? "" : "s"}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </label>

                <label className="rounded-[1rem] border border-border/80 bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      checked={householdMode === "CUSTOM"}
                      className="mt-1 h-4 w-4"
                      disabled={isPending}
                      name="household-mode"
                      onChange={() => handleHouseholdModeChange("CUSTOM")}
                      type="radio"
                    />
                    <div className="w-full space-y-3">
                      <div>
                        <p className="text-sm font-medium text-primary">
                          Create or rename a household invite
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Use this when starting a new household that more guests
                          can join later.
                        </p>
                      </div>
                      <Input
                        disabled={isPending || householdMode !== "CUSTOM"}
                        placeholder="e.g. Asante Family"
                        {...form.register("householdName")}
                      />
                    </div>
                  </div>
                </label>
              </div>

              <div className="rounded-[1rem] border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                {householdMode === "EXISTING" && selectedHousehold ? (
                  <span>
                    This guest will join the {selectedHousehold.householdName}{" "}
                    household. The invite will cover{" "}
                    {resultingHouseholdGuestCount} guests.
                  </span>
                ) : null}
                {householdMode === "CUSTOM" && householdName ? (
                  <span>
                    {matchingTypedHousehold
                      ? `This matches the existing ${householdName} household. The invite will cover ${resultingHouseholdGuestCount} guests.`
                      : `This starts the ${householdName} household. It becomes a household invite as soon as another guest is linked to the same household.`}
                  </span>
                ) : null}
                {householdMode === "INDIVIDUAL" ? (
                  <span>
                    This guest will use an individual invite link until they are
                    linked into a household.
                  </span>
                ) : null}
              </div>
            </div>
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/85">
        <CardHeader>
          <CardTitle>Contact channels</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Email address"
            error={form.formState.errors.email?.message}
          >
            <Input
              disabled={isPending}
              placeholder="name@example.com"
              type="email"
              {...form.register("email")}
            />
          </FormField>

          <FormField
            label="Phone number"
            error={form.formState.errors.phone?.message}
          >
            <Input
              disabled={isPending}
              placeholder="+233240000001"
              {...form.register("phone")}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Notes"
              hint="Optional planning context, seating details, or outreach reminders."
              error={form.formState.errors.notes?.message}
            >
              <Textarea
                disabled={isPending}
                placeholder="Add any guest-specific planning notes"
                {...form.register("notes")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/85">
        <CardHeader>
          <CardTitle>Invitation and RSVP</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Invitation status"
            error={form.formState.errors.inviteStatus?.message}
          >
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              {...form.register("inviteStatus")}
            >
              {inviteStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {inviteStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="RSVP status"
            error={form.formState.errors.rsvpStatus?.message}
          >
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              {...form.register("rsvpStatus")}
            >
              {rsvpStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {rsvpStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>

          <div className="rounded-[1.25rem] border border-border/80 bg-muted/25 p-4 md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                disabled={isPending}
                type="checkbox"
                {...form.register("plusOneAllowed")}
              />
              <div>
                <p className="text-sm font-medium text-primary">Plus one allowed</p>
                <p className="text-xs text-muted-foreground">
                  Enable this if the guest may bring an additional attendee.
                </p>
              </div>
            </label>
          </div>

          <FormField
            label="Plus one name"
            hint="Optional. Leave blank until the guest confirms who they are bringing."
            error={form.formState.errors.plusOneName?.message}
          >
            <Input
              disabled={!plusOneAllowed || isPending}
              placeholder="e.g. Kwesi Owusu"
              {...form.register("plusOneName")}
            />
          </FormField>

          <FormField
            label="Dietary requirements"
            hint="Separate multiple items with commas or new lines."
            error={form.formState.errors.dietaryRequirements?.message}
          >
            <Textarea
              disabled={isPending}
              placeholder="Vegetarian, No shellfish"
              {...form.register("dietaryRequirements")}
            />
          </FormField>
        </CardContent>
      </Card>

      {mode === "edit" && guestId ? (
        <Card className="border-rose-200 bg-rose-50/70">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Delete this guest from the directory. Their invitation and RSVP
              record will be removed at the same time.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-rose-800">
              Use this only when the guest should no longer exist in the
              traditional wedding list.
            </p>
            <DeleteGuestButton
              className="w-full sm:w-auto"
              disabled={isPending}
              guestId={guestId}
              guestName={form.watch("fullName") || initialValues.fullName || "this guest"}
              label="Delete guest"
              onDeleteError={setServerMessage}
              redirectHref="/admin/guests"
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild className="w-full sm:w-auto" variant="outline">
          <Link href="/admin/guests">Cancel</Link>
        </Button>
        <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
          {mode === "create" ? (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              {isPending ? "Creating guest..." : "Create guest"}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Saving changes..." : "Save changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
