"use client";

import { useEffect, useState } from "react";

type WeddingCountdownProps = {
  targetDate?: string | null;
  dateLabel?: string | null;
  initialNow?: number;
};

type CountdownParts = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
};

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const EMPTY_COUNTDOWN: CountdownParts = {
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isComplete: true,
};

function addUtcYears(date: Date, years: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ),
  );
}

function addUtcMonths(date: Date, months: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ),
  );
}

function getCountdownParts(now: Date, target: Date): CountdownParts {
  if (now >= target) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
    };
  }

  let cursor = new Date(now.getTime());
  let years = 0;
  let months = 0;

  while (addUtcYears(cursor, 1) <= target) {
    cursor = addUtcYears(cursor, 1);
    years += 1;
  }

  while (addUtcMonths(cursor, 1) <= target) {
    cursor = addUtcMonths(cursor, 1);
    months += 1;
  }

  let remainingMs = target.getTime() - cursor.getTime();

  const days = Math.floor(remainingMs / DAY_IN_MS);
  remainingMs -= days * DAY_IN_MS;

  const hours = Math.floor(remainingMs / HOUR_IN_MS);
  remainingMs -= hours * HOUR_IN_MS;

  const minutes = Math.floor(remainingMs / MINUTE_IN_MS);
  remainingMs -= minutes * MINUTE_IN_MS;

  const seconds = Math.floor(remainingMs / SECOND_IN_MS);

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    isComplete: false,
  };
}

function CountdownUnit({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const displayLabel = value === 1 ? label.replace(/s$/, "") : label;

  return (
    <div className={`flex min-w-[72px] flex-col items-center ${className ?? ""}`}>
      <span className="font-serif text-2xl sm:text-4xl">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-[0.62rem] uppercase tracking-[0.22em] text-white sm:text-[0.68rem]">
        {displayLabel}
      </span>
    </div>
  );
}

export function WeddingCountdown({
  targetDate,
  dateLabel,
  initialNow,
}: WeddingCountdownProps) {
  const targetTime = targetDate ? Date.parse(targetDate) : Number.NaN;
  const hasValidTarget = Number.isFinite(targetTime);
  const initialTime = typeof initialNow === "number" ? initialNow : null;

  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    hasValidTarget && initialTime !== null
      ? getCountdownParts(new Date(initialTime), new Date(targetTime))
      : EMPTY_COUNTDOWN,
  );

  useEffect(() => {
    if (!hasValidTarget) {
      setCountdown(EMPTY_COUNTDOWN);
      return;
    }

    const target = new Date(targetTime);

    const updateCountdown = () => {
      setCountdown(getCountdownParts(new Date(), target));
    };

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasValidTarget, targetTime]);

  if (!dateLabel || !hasValidTarget) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-5">
        <CountdownUnit label="Years" value={countdown.years} />
        <CountdownUnit label="Months" value={countdown.months} />
        <CountdownUnit label="Days" value={countdown.days} />
        <CountdownUnit className="hidden sm:flex" label="Hours" value={countdown.hours} />
        <CountdownUnit className="hidden sm:flex" label="Minutes" value={countdown.minutes} />
        <CountdownUnit className="hidden sm:flex" label="Seconds" value={countdown.seconds} />
      </div>
      <p className="text-xs uppercase tracking-[0.24em] text-white sm:text-sm sm:tracking-[0.26em]">
        {countdown.isComplete ? "Today is the day" : `Until ${dateLabel}`}
      </p>
    </div>
  );
}
