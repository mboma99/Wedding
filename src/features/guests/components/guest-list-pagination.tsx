import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildGuestListHref, type GuestListSearchParams } from "@/features/guests/types";

type GuestListPaginationProps = {
  filters: GuestListSearchParams;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalGuests: number;
};

export function GuestListPagination({
  filters,
  page,
  totalPages,
  pageStart,
  pageEnd,
  totalGuests,
}: GuestListPaginationProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-primary">{pageStart}</span> to{" "}
        <span className="font-semibold text-primary">{pageEnd}</span> of{" "}
        <span className="font-semibold text-primary">{totalGuests}</span> guests
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          asChild
          variant="outline"
          size="sm"
          className={`w-full sm:w-auto ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Link href={buildGuestListHref(filters, { page: Math.max(1, page - 1) })}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Link>
        </Button>
        <div className="rounded-full border border-border bg-white/85 px-4 py-2 text-center text-sm font-medium text-primary">
          Page {page} of {totalPages}
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={`w-full sm:w-auto ${
            page >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Link
            href={buildGuestListHref(filters, {
              page: Math.min(totalPages, page + 1),
            })}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
