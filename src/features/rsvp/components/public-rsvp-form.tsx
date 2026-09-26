"use client";

import { useState, startTransition, type CSSProperties } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RsvpStatus } from "@/domain/enums";
import {
  getPublicRsvpInitialValues,
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
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState<PublicRsvpFormValues | null>(null);

  const form = useForm<PublicRsvpFormValues>({
    resolver: zodResolver(publicRsvpFormSchema),
    defaultValues: getPublicRsvpInitialValues(invitation),
  });

  const guests = form.watch("guests");
  const hasRepliedBefore = invitation.guests.some(
    (guest) => guest.invitation.rsvpStatus !== RsvpStatus.PENDING,
  );
  const isHousehold = invitation.guests.length > 1;

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
      setIsPending(false);
    });
  });

  if (submitted) {
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
        <button
          className="animate-enter text-sm font-medium text-primary underline-offset-4 [animation-delay:300ms] hover:underline"
          onClick={() => setSubmitted(null)}
          type="button"
        >
          Change {isHousehold ? "our" : "my"} reply
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-8" noValidate onSubmit={onSubmit}>
      {hasRepliedBefore ? (
        <p className="rounded-lg bg-primary/[0.04] px-4 py-3 text-center text-sm text-muted-foreground">
          You&apos;ve replied before. Change anything below and send it again.
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
          const isAttending = guests[index]?.rsvpStatus !== RsvpStatus.DECLINED;
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
        <p className="text-xs text-muted-foreground">
          RSVP code {formatInviteCode(invitation.inviteCode)}
        </p>
      </div>
    </form>
  );
}
