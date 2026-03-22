"use client";

import { useState, startTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, HeartHandshake } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getInvitationHeading,
  getInvitationSummary,
  getPublicRsvpInitialValues,
  publicRsvpFormSchema,
  type PublicInvitationRecord,
  type PublicRsvpFormValues,
} from "@/features/rsvp/types";
import { formatInviteCode } from "@/lib/rsvp";
import { submitPublicRsvpAction } from "@/server/actions/rsvp";

type PublicRsvpFormProps = {
  invitation: PublicInvitationRecord;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

export function PublicRsvpForm({ invitation }: PublicRsvpFormProps) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<PublicRsvpFormValues>({
    resolver: zodResolver(publicRsvpFormSchema),
    defaultValues: getPublicRsvpInitialValues(invitation),
  });

  const guests = form.watch("guests");

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await submitPublicRsvpAction(invitation.token, values);

      if (!result.success) {
        setServerMessage(result.message);
        setIsPending(false);
        return;
      }

      setIsSubmitted(true);
      setIsPending(false);
    });
  });

  if (isSubmitted) {
    return (
      <Card className="border-white/80 bg-white/90">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-4xl text-primary">
              RSVP received
            </h2>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Thank you. Your response for {getInvitationHeading(invitation)} has
              been saved.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/80 bg-white/90">
        <CardContent className="space-y-6 p-5 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] border border-primary/10 bg-primary/10 text-primary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Public RSVP
            </p>
            <h1 className="font-serif text-3xl leading-tight text-primary sm:text-6xl sm:leading-none">
              {getInvitationHeading(invitation)}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {getInvitationSummary(invitation)}
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              RSVP code: {formatInviteCode(invitation.inviteCode)}
            </p>
          </div>
        </CardContent>
      </Card>

      {serverMessage ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverMessage}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={onSubmit}>
        {invitation.guests.map((guest, index) => {
          const response = guests[index];
          const isAttending = response?.rsvpStatus !== "DECLINED";

          return (
            <Card key={guest.id} className="border-white/80 bg-white/90">
              <CardHeader>
                <CardTitle>{guest.fullName}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 md:grid-cols-2 sm:p-6">
                <div className="space-y-3 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Attendance response
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="rounded-[1.25rem] border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-3">
                        <input
                          disabled={isPending}
                          type="radio"
                          value="ATTENDING"
                          {...form.register(`guests.${index}.rsvpStatus`)}
                        />
                        <div>
                          <p className="text-sm font-medium text-primary">
                            Joyfully attending
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Confirm this guest as attending.
                          </p>
                        </div>
                      </div>
                    </label>
                    <label className="rounded-[1.25rem] border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-3">
                        <input
                          disabled={isPending}
                          type="radio"
                          value="DECLINED"
                          {...form.register(`guests.${index}.rsvpStatus`)}
                        />
                        <div>
                          <p className="text-sm font-medium text-primary">
                            Unable to attend
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mark this guest as declining.
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                  <FieldError
                    message={form.formState.errors.guests?.[index]?.rsvpStatus?.message}
                  />
                </div>

                {guest.invitation.plusOneAllowed ? (
                  <label className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Plus one name
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Optional. Leave blank if no plus one is attending.
                      </p>
                    </div>
                    <Input
                      disabled={!isAttending || isPending}
                      placeholder="Name of your plus one"
                      {...form.register(`guests.${index}.plusOneName`)}
                    />
                    <FieldError
                      message={
                        form.formState.errors.guests?.[index]?.plusOneName?.message
                      }
                    />
                  </label>
                ) : null}

                <label
                  className={
                    guest.invitation.plusOneAllowed
                      ? "space-y-2"
                      : "space-y-2 md:col-span-2"
                  }
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Dietary requirements
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Separate multiple items with commas or new lines.
                    </p>
                  </div>
                  <Textarea
                    disabled={!isAttending || isPending}
                    placeholder="Vegetarian, No shellfish"
                    {...form.register(`guests.${index}.dietaryRequirements`)}
                  />
                  <FieldError
                    message={
                      form.formState.errors.guests?.[index]?.dietaryRequirements
                        ?.message
                    }
                  />
                </label>

                <input
                  type="hidden"
                  {...form.register(`guests.${index}.guestId`)}
                />
                <input
                  type="hidden"
                  {...form.register(`guests.${index}.plusOneAllowed`)}
                />
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end">
          <Button className="w-full sm:w-auto" disabled={isPending} size="lg" type="submit">
            {isPending ? "Submitting RSVP..." : "Submit RSVP"}
          </Button>
        </div>
      </form>
    </div>
  );
}
