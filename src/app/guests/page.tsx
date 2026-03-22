import { redirect } from "next/navigation";

type LegacyGuestsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GuestsPage({
  searchParams,
}: LegacyGuestsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    if (value) {
      query.set(key, value);
    }
  }

  redirect(
    query.toString()
      ? `/admin/guests?${query.toString()}`
      : "/admin/guests",
  );
}
