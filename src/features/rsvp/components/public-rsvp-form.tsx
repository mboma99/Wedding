"use client";

import { useState, startTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RsvpStatus } from "@/domain/enums";
import {
  getPublicRsvpInitialValues,
  hasReplied,
  publicRsvpFormSchema,
  type PublicInvitationRecord,
  type PublicRsvpFormValues,
} from "@/features/rsvp/types";
import { formatInviteCode } from "@/lib/rsvp";
import { WaxSeal } from "@/features/rsvp/components/wax-seal";
import { submitPublicRsvpAction } from "@/server/actions/rsvp";

type PublicRsvpFormProps = {
  invitation: PublicInvitationRecord;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" id={id}>
      {message}
    </p>
  );
}

function ReplyChoice({
  label,
  ...inputProps
}: { label: string } & Omit<React.ComponentProps<"input">, "type" | "className">) {
  return (
    <label className="relative min-w-0">
      <input className="peer sr-only" type="radio" {...inputProps} />
      <span className="flex h-11 cursor-pointer items-center justify-center rounded-[calc(var(--segment-radius)_-_4px)] px-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed">
        {label}
      </span>
    </label>
  );
}

type SummaryGuest = {
  id: string;
  name: string;
  status: "ATTENDING" | "DECLINED" | "PENDING";
  plusOneName: string;
  dietary: string;
};

/** What each person has told us, set out plainly. */
function ReplySummary({ guests }: { guests: SummaryGuest[] }) {
  return (
    <ul className="divide-y divide-primary/10 rounded-lg border border-primary/15 bg-white/70">
      {guests.map((guest) => (
        <li className="space-y-2 px-4 py-4 sm:px-5" key={guest.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-serif text-xl text-primary">{guest.name}</p>
            <StatusPill status={guest.status} />
          </div>
          {guest.status === "ATTENDING" && (guest.plusOneName || guest.dietary) ? (
            <dl className="space-y-1 text-sm">
              {guest.plusOneName ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Bringing</dt>
                  <dd className="text-primary">{guest.plusOneName}</dd>
                </div>
              ) : null}
              {guest.dietary ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Dietary needs</dt>
                  <dd className="text-primary">{guest.dietary}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function StatusPill({ status }: { status: SummaryGuest["status"] }) {
  if (status === "ATTENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
        <svg aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 16 16">
          <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Attending
      </span>
    );
  }
  if (status === "DECLINED") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#efe7da] px-3 py-1 text-sm font-semibold text-primary">
        Not attending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
      No reply yet
    </span>
  );
}

function thankYouMessage(values: PublicRsvpFormValues) {
  const attending = values.guests.filter(
    (guest) => guest.rsvpStatus === RsvpStatus.ATTENDING,
  ).length;

  if (attending === values.guests.length) {
    return "We can't wait to celebrate with you.";
  }

  if (attending === 0) {
    return "Thank you for letting us know. You'll be missed.";
  }

  return "Thank you. We've saved everyone's replies.";
}

export function PublicRsvpForm({ invitation }: PublicRsvpFormProps) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState<PublicRsvpFormValues | null>(null);
  // Everyone has replied: open on what they told us, not on the form.
  const everyoneReplied = invitation.guests.every(hasReplied);
  const [editing, setEditing] = useState(!everyoneReplied);

  // Starting values may leave a reply unchosen; the schema insists on one before sending.
  const form = useForm<PublicRsvpFormValues>({
    resolver: zodResolver(publicRsvpFormSchema),
    defaultValues: getPublicRsvpInitialValues(invitation),
  });

  const guests = form.watch("guests");
  const hasRepliedBefore = invitation.guests.some(hasReplied);
  const isHousehold = invitation.guests.length > 1;

  // The latest answers: what was just sent, or what we have on record.
  const summaryGuests: SummaryGuest[] = invitation.guests.map((guest, index) => {
    const sent = submitted?.guests[index];
    return {
      id: guest.id,
      name: guest.fullName,
      status: sent ? sent.rsvpStatus : guest.invitation.rsvpStatus,
      plusOneName: sent ? sent.plusOneName : (guest.invitation.plusOneName ?? ""),
      dietary: sent ? sent.dietaryRequirements : guest.invitation.dietaryRequirements.join(", "),
    };
  });
  const changeLabel = `Change ${isHousehold ? "our" : "my"} reply`;

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    setIsPending(true);

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof submitPublicRsvpAction>>;

      try {
        result = await submitPublicRsvpAction(invitation.token, values);
      } catch {
        // Guests often reply from a phone; a dropped connection shouldn't
        // leave the button stuck on "Sending...".
        setServerMessage("We couldn't send your reply. Check your connection and try again.");
        setIsPending(false);
        return;
      }

      if (!result.success) {
        setServerMessage(result.message);
        setIsPending(false);
        return;
      }

      setSubmitted(values);
      setEditing(false);
      setIsPending(false);
      // A yes can unlock the date, place and plan; a no hides them again.
      router.refresh();
    });
  });

  if (submitted && !editing) {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center" role="status">
        <WaxSeal className="stamp-in h-28 w-28" />
        <p className="animate-enter text-xs font-semibold uppercase tracking-[0.28em] text-primary/60 [animation-delay:150ms]">
          Reply sent
        </p>
        <div className="animate-enter space-y-2 [animation-delay:200ms]">
          <p className="font-serif text-3xl text-primary">Thank you</p>
          <p className="mx-auto max-w-sm text-base leading-7 text-muted-foreground">
            {thankYouMessage(submitted)}
          </p>
        </div>
        <div className="animate-enter w-full text-left [animation-delay:250ms]">
          <ReplySummary guests={summaryGuests} />
        </div>
        <Button
          className="animate-enter [animation-delay:300ms]"
          onClick={() => setEditing(true)}
          type="button"
          variant="outline"
        >
          {changeLabel}
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-6">
        <p className="text-center text-sm text-muted-foreground">
          Thank you, we have {isHousehold ? "your household's" : "your"} reply.
        </p>
        <ReplySummary guests={summaryGuests} />
        <div className="flex flex-col items-center gap-3">
          <Button onClick={() => setEditing(true)} type="button" variant="outline">
            {changeLabel}
          </Button>
          <p className="text-xs text-muted-foreground">
            If plans change, you can update it here. RSVP code {formatInviteCode(invitation.inviteCode)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-8" noValidate onSubmit={onSubmit}>
      {hasRepliedBefore ? (
        <p className="rounded-lg bg-primary/[0.04] px-4 py-3 text-center text-sm text-muted-foreground">
          Your current reply is selected below. Change anything, then send it again.
        </p>
      ) : null}

      {serverMessage ? (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {serverMessage}
        </div>
      ) : null}

      <fieldset className="space-y-8" disabled={isPending}>
        {invitation.guests.map((guest, index) => {
          const isAttending = guests[index]?.rsvpStatus === RsvpStatus.ATTENDING;
          const idBase = `guest-${index}`;
          const statusError = form.formState.errors.guests?.[index]?.rsvpStatus?.message;

          return (
            <div
              className="space-y-4 border-b border-primary/10 pb-8 last:border-0 last:pb-0"
              key={guest.id}
            >
              <p className="font-serif text-2xl text-primary" id={`${idBase}-name`}>
                {guest.fullName}
              </p>

              <div
                aria-labelledby={`${idBase}-name`}
                className="segmented grid grid-cols-2 gap-1 rounded-[var(--segment-radius)] bg-[#efe7da] p-1"
                role="radiogroup"
                style={{ "--segments": 2 } as CSSProperties}
              >
                <ReplyChoice
                  label="Attending"
                  value={RsvpStatus.ATTENDING}
                  {...form.register(`guests.${index}.rsvpStatus`)}
                />
                <ReplyChoice
                  label="Not attending"
                  value={RsvpStatus.DECLINED}
                  {...form.register(`guests.${index}.rsvpStatus`)}
                />
                <span aria-hidden className="segmented-thumb" />
              </div>
              <FieldError id={`${idBase}-status-error`} message={statusError} />

              {isAttending ? (
                <div className="animate-enter grid gap-4 sm:grid-cols-2">
                  {guest.invitation.plusOneAllowed ? (
                    <div className="space-y-2">
                      <label
                        className="flex items-baseline justify-between text-sm font-medium text-primary"
                        htmlFor={`${idBase}-plus-one`}
                      >
                        Bringing a guest?
                        <span className="text-xs font-normal text-muted-foreground">
                          Optional
                        </span>
                      </label>
                      <Input
                        autoComplete="off"
                        className="bg-white"
                        id={`${idBase}-plus-one`}
                        placeholder="Their name"
                        {...form.register(`guests.${index}.plusOneName`)}
                      />
                      <FieldError
                        id={`${idBase}-plus-one-error`}
                        message={form.formState.errors.guests?.[index]?.plusOneName?.message}
                      />
                    </div>
                  ) : null}

                  <div
                    className={
                      guest.invitation.plusOneAllowed ? "space-y-2" : "space-y-2 sm:col-span-2"
                    }
                  >
                    <label
                      className="flex items-baseline justify-between text-sm font-medium text-primary"
                      htmlFor={`${idBase}-dietary`}
                    >
                      Any dietary needs?
                      <span className="text-xs font-normal text-muted-foreground">
                        Optional
                      </span>
                    </label>
                    <Input
                      className="bg-white"
                      id={`${idBase}-dietary`}
                      placeholder="e.g. Vegetarian, no nuts"
                      {...form.register(`guests.${index}.dietaryRequirements`)}
                    />
                    <FieldError
                      id={`${idBase}-dietary-error`}
                      message={
                        form.formState.errors.guests?.[index]?.dietaryRequirements?.message
                      }
                    />
                  </div>
                </div>
              ) : null}

              <input type="hidden" {...form.register(`guests.${index}.guestId`)} />
              <input type="hidden" {...form.register(`guests.${index}.plusOneAllowed`)} />
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col items-center gap-4 pt-2">
        <Button className="w-full sm:w-auto sm:px-10" disabled={isPending} size="lg" type="submit">
          {isPending ? "Sending..." : isHousehold ? "Send our reply" : "Send my reply"}
        </Button>
        {everyoneReplied || submitted ? (
          <button
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            disabled={isPending}
            onClick={() => {
              form.reset(submitted ?? getPublicRsvpInitialValues(invitation));
              setServerMessage(null);
              setEditing(false);
            }}
            type="button"
          >
            Keep {isHousehold ? "our" : "my"} reply as it is
          </button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          RSVP code {formatInviteCode(invitation.inviteCode)}
        </p>
      </div>
    </form>
  );
}
