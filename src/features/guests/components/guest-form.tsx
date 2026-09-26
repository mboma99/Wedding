"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Children,
  startTransition,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

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

type FieldName = keyof GuestFormValues;

function fieldId(name: FieldName) {
  return `guest-${name}`;
}

/** Label above, helper and error below, all wired to the control by id. */
function FormField({
  name,
  label,
  hint,
  optional = false,
  error,
  children,
  className,
}: {
  name: FieldName;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        className="flex items-baseline justify-between gap-2 text-sm font-medium text-primary"
        htmlFor={fieldId(name)}
      >
        {label}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">Optional</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground" id={`${fieldId(name)}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" id={`${fieldId(name)}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A segmented control built from real radios, so keyboard and forms just work. */
function ChoiceGroup({
  legend,
  children,
  className,
  hint,
  wrap = false,
}: {
  legend: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  /** Set when the options wrap onto two rows on phones. */
  wrap?: boolean;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 text-sm font-medium text-primary">{legend}</legend>
      <div
        className={cn(
          "segmented grid auto-cols-fr grid-flow-col gap-1 rounded-[var(--segment-radius)] bg-muted/70 p-1",
          className,
        )}
        data-wrap={wrap || undefined}
        style={{ "--segments": Children.count(children) } as CSSProperties}
      >
        {children}
        <span aria-hidden className="segmented-thumb" />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </fieldset>
  );
}

function Choice({
  children,
  ...inputProps
}: Omit<ComponentProps<"input">, "type" | "className">) {
  return (
    <label className="relative min-w-0">
      <input className="peer sr-only" type="radio" {...inputProps} />
      <span className="flex h-9 cursor-pointer items-center justify-center gap-2 truncate rounded-[calc(var(--segment-radius)_-_4px)] px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-45 peer-disabled:hover:text-muted-foreground">
        {children}
      </span>
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[12rem_1fr] lg:gap-8">
        <div className="space-y-1">
          <h2 className="font-serif text-xl text-primary">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="min-w-0 space-y-5">{children}</div>
      </CardContent>
    </Card>
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

  const isCreateMode = mode === "create";
  // Which submit button was pressed; both submit the same form.
  const submitIntentRef = useRef<"done" | "another">("done");
  const [showStatusFields, setShowStatusFields] = useState(!isCreateMode);
  const errors = form.formState.errors;

  function describe(name: FieldName, hasHint = false) {
    const error = errors[name]?.message;

    return {
      id: fieldId(name),
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error
        ? `${fieldId(name)}-error`
        : hasHint
          ? `${fieldId(name)}-hint`
          : undefined,
    };
  }

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    setIsPending(true);

    startTransition(async () => {
      if (!isCreateMode && !guestId) {
        setServerMessage("This guest record cannot be updated right now.");
        setIsPending(false);
        return;
      }

      const result = isCreateMode
        ? await createGuestAction(values)
        : await updateGuestAction(guestId!, values);

      if (!result.success) {
        setServerMessage(result.message);
        setIsPending(false);
        return;
      }

      if (isCreateMode && submitIntentRef.current === "another") {
        // Families are entered back to back, so keep who they are grouped
        // with and clear everything personal.
        form.reset({
          ...getEmptyGuestFormValues(),
          side: values.side,
          groupType: values.groupType,
          guestType: values.guestType,
          householdName: values.householdName,
        });
        submitIntentRef.current = "done";
        setIsPending(false);
        toast.success(`Added ${values.fullName}`, {
          description: "Ready for the next guest.",
        });
        router.refresh();
        requestAnimationFrame(() => form.setFocus("fullName"));
        return;
      }

      toast.success(isCreateMode ? `Added ${values.fullName}` : "Changes saved");
      router.push("/admin/guests");
      router.refresh();
    });
  });

  const householdSummary =
    householdMode === "EXISTING" && selectedHousehold
      ? `Joins the ${selectedHousehold.householdName} household. One RSVP link will cover ${resultingHouseholdGuestCount} guests.`
      : householdMode === "CUSTOM" && householdName
        ? matchingTypedHousehold
          ? `Matches the existing ${householdName} household. One RSVP link will cover ${resultingHouseholdGuestCount} guests.`
          : `Starts the ${householdName} household. Guests added to it later will share this RSVP link.`
        : null;

  return (
    <form className="space-y-4 sm:space-y-5" noValidate onSubmit={onSubmit}>
      {serverMessage ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {serverMessage}
        </div>
      ) : null}

      <fieldset className="min-w-0 space-y-4 sm:space-y-5" disabled={isPending}>
        <FormSection
          description="Who they are and whose side of the family they're on."
          title="Guest"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField error={errors.fullName?.message} label="Full name" name="fullName">
              <Input
                autoComplete="off"
                autoFocus={isCreateMode}
                placeholder="e.g. Abena Asante"
                {...describe("fullName")}
                {...form.register("fullName")}
              />
            </FormField>

            <FormField
              error={errors.relation?.message}
              label="Relation"
              name="relation"
            >
              <Input
                autoComplete="off"
                placeholder="e.g. Mother's cousin"
                {...describe("relation")}
                {...form.register("relation")}
              />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ChoiceGroup legend="Side">
              {guestSideOptions.map((option) => (
                <Choice key={option} value={option} {...form.register("side")}>
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-sm",
                      option === "JAMES" ? "bg-james" : "bg-lisa",
                    )}
                  />
                  {option === "JAMES" ? "James" : "Lisa"}
                </Choice>
              ))}
            </ChoiceGroup>

            <ChoiceGroup legend="Age group">
              {guestTypeOptions.map((option) => (
                <Choice key={option} value={option} {...form.register("guestType")}>
                  {guestTypeLabels[option]}
                </Choice>
              ))}
            </ChoiceGroup>
          </div>

          <ChoiceGroup className="grid-flow-row grid-cols-2 sm:grid-cols-4" legend="Group" wrap>
            {groupTypeOptions.map((option) => (
              <Choice key={option} value={option} {...form.register("groupType")}>
                {groupTypeLabels[option]}
              </Choice>
            ))}
          </ChoiceGroup>
        </FormSection>

        <FormSection
          description="Who shares their RSVP link, and whether they can bring someone."
          title="Invitation"
        >
          <div className="space-y-3">
            <ChoiceGroup
              hint={
                availableHouseholds.length === 0 && householdMode !== "EXISTING"
                  ? `No households on ${side === "JAMES" ? "James's" : "Lisa's"} side yet. Start one with “New”.`
                  : undefined
              }
              legend="RSVP link"
            >
              <Choice
                checked={householdMode === "INDIVIDUAL"}
                name="household-mode"
                onChange={() => handleHouseholdModeChange("INDIVIDUAL")}
                value="INDIVIDUAL"
              >
                <span className="sm:hidden">Own</span>
                <span className="hidden sm:inline">Their own</span>
              </Choice>
              <Choice
                checked={householdMode === "EXISTING"}
                disabled={availableHouseholds.length === 0}
                name="household-mode"
                onChange={() => handleHouseholdModeChange("EXISTING")}
                value="EXISTING"
              >
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Join household</span>
              </Choice>
              <Choice
                checked={householdMode === "CUSTOM"}
                name="household-mode"
                onChange={() => handleHouseholdModeChange("CUSTOM")}
                value="CUSTOM"
              >
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New household</span>
              </Choice>
            </ChoiceGroup>

            {householdMode === "EXISTING" ? (
              <div className="animate-enter space-y-2">
                <label className="sr-only" htmlFor="guest-existing-household">
                  Household to join
                </label>
                <Select
                  id="guest-existing-household"
                  onChange={(event) => handleExistingHouseholdChange(event.target.value)}
                  value={selectedHousehold ? buildHouseholdOptionKey(selectedHousehold) : ""}
                >
                  {availableHouseholds.map((household) => (
                    <option
                      key={buildHouseholdOptionKey(household)}
                      value={buildHouseholdOptionKey(household)}
                    >
                      {household.householdName} · {household.linkedGuestCount}{" "}
                      {household.linkedGuestCount === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {householdMode === "CUSTOM" ? (
              <FormField
                className="animate-enter"
                error={errors.householdName?.message}
                label="Household name"
                name="householdName"
              >
                <Input
                  autoComplete="off"
                  placeholder="e.g. Asante family"
                  {...describe("householdName")}
                  {...form.register("householdName")}
                />
              </FormField>
            ) : null}

            {householdSummary ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {householdSummary}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-border/70 pt-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                type="checkbox"
                {...form.register("plusOneAllowed")}
              />
              <span>
                <span className="block text-sm font-medium text-primary">
                  Can bring a plus one
                </span>
                <span className="block text-xs text-muted-foreground">
                  Their RSVP form will ask for a guest name.
                </span>
              </span>
            </label>

            {plusOneAllowed ? (
              <FormField
                className="animate-enter sm:max-w-sm sm:pl-7"
                error={errors.plusOneName?.message}
                hint="Leave blank until they tell you."
                label="Plus one's name"
                name="plusOneName"
                optional
              >
                <Input
                  autoComplete="off"
                  placeholder="e.g. Kwesi Owusu"
                  {...describe("plusOneName", true)}
                  {...form.register("plusOneName")}
                />
              </FormField>
            ) : null}
          </div>

          <div className="border-t border-border/70 pt-5">
            {showStatusFields ? (
              <div className={cn("grid gap-5 sm:grid-cols-2", isCreateMode && "animate-enter")}>
                <FormField
                  error={errors.inviteStatus?.message}
                  label="Invitation"
                  name="inviteStatus"
                >
                  <Select {...describe("inviteStatus")} {...form.register("inviteStatus")}>
                    {inviteStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {inviteStatusLabels[status]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField error={errors.rsvpStatus?.message} label="RSVP" name="rsvpStatus">
                  <Select {...describe("rsvpStatus")} {...form.register("rsvpStatus")}>
                    {rsvpStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {rsvpStatusLabels[status]}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            ) : (
              <button
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setShowStatusFields(true)}
                type="button"
              >
                Already sent the invite or had a reply?
              </button>
            )}
          </div>
        </FormSection>

        <FormSection
          description="How to reach them, and anything to remember on the day."
          title="Contact and notes"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              error={errors.phone?.message}
              hint="Guests can enter this number to find their RSVP."
              label="Phone"
              name="phone"
              optional
            >
              <Input
                autoComplete="off"
                inputMode="tel"
                placeholder="e.g. 07123 456789"
                type="tel"
                {...describe("phone", true)}
                {...form.register("phone")}
              />
            </FormField>

            <FormField error={errors.email?.message} label="Email" name="email" optional>
              <Input
                autoComplete="off"
                inputMode="email"
                placeholder="e.g. abena@example.com"
                type="email"
                {...describe("email")}
                {...form.register("email")}
              />
            </FormField>
          </div>

          <FormField
            error={errors.dietaryRequirements?.message}
            hint="Separate items with commas."
            label="Dietary needs"
            name="dietaryRequirements"
            optional
          >
            <Input
              autoComplete="off"
              placeholder="e.g. Vegetarian, no shellfish"
              {...describe("dietaryRequirements", true)}
              {...form.register("dietaryRequirements")}
            />
          </FormField>

          <FormField error={errors.notes?.message} label="Notes" name="notes" optional>
            <Textarea
              className="min-h-[88px]"
              placeholder="Seating, travel, anything worth remembering"
              rows={3}
              {...describe("notes")}
              {...form.register("notes")}
            />
          </FormField>
        </FormSection>
      </fieldset>

      {!isCreateMode && guestId ? (
        <Card className="border-rose-200">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="space-y-1">
              <p className="font-medium text-primary">Delete this guest</p>
              <p className="text-sm text-muted-foreground">
                Removes them and their RSVP from the list. This can&apos;t be undone.
              </p>
            </div>
            <DeleteGuestButton
              className="w-full sm:w-auto"
              disabled={isPending}
              guestId={guestId}
              guestName={form.watch("fullName") || initialValues.fullName || "this guest"}
              label="Delete guest"
              redirectHref="/admin/guests"
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-6 flex gap-2 border-t border-border/80 bg-background/95 px-6 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button asChild className="hidden sm:inline-flex" variant="ghost">
          <Link href="/admin/guests">Cancel</Link>
        </Button>
        {isCreateMode ? (
          <>
            <Button
              className="flex-1 sm:flex-none"
              disabled={isPending}
              onClick={() => {
                submitIntentRef.current = "another";
              }}
              type="submit"
              variant="outline"
            >
              {isPending && submitIntentRef.current === "another" ? (
                "Adding..."
              ) : (
                <>
                  <span className="sm:hidden">Add &amp; next</span>
                  <span className="hidden sm:inline">Add and start another</span>
                </>
              )}
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              disabled={isPending}
              onClick={() => {
                submitIntentRef.current = "done";
              }}
              type="submit"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isPending && submitIntentRef.current === "done" ? "Adding..." : "Add guest"}
            </Button>
          </>
        ) : (
          <>
            <Button asChild className="flex-1 sm:hidden" variant="outline">
              <Link href="/admin/guests">Cancel</Link>
            </Button>
            <Button className="flex-1 sm:flex-none" disabled={isPending} type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
