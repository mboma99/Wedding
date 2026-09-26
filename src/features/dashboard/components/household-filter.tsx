"use client";

import { Select } from "@/components/ui/select";
import { buildDashboardHouseholdKey } from "@/features/dashboard/types";
import { sideLabels, type HouseholdOption } from "@/features/guests/types";

/** Applies on change, so there is no separate "Apply filter" step. */
export function HouseholdFilter({
  value,
  householdOptions,
}: {
  value: string;
  householdOptions: HouseholdOption[];
}) {
  return (
    <form action="/admin" method="get" className="w-full sm:w-64">
      <label className="sr-only" htmlFor="household-filter">
        Household
      </label>
      <Select
        defaultValue={value}
        id="household-filter"
        name="household"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">All households</option>
        {householdOptions.map((household) => (
          <option
            key={buildDashboardHouseholdKey(household)}
            value={buildDashboardHouseholdKey(household)}
          >
            {household.householdName} · {sideLabels[household.side]}
          </option>
        ))}
      </Select>
    </form>
  );
}
