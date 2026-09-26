"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor } from "@/domain/vendors";
import {
  createVendorAction,
  deleteVendorAction,
  updateVendorDetailsAction,
} from "@/server/actions/vendors";

const categories = ["Venue", "Food", "Décor", "Misc"];

type VendorFormProps = {
  vendor?: Vendor;
  onClose?: () => void;
};

function VendorFields({ vendor, onClose }: VendorFormProps) {
  const router = useRouter();
  const [name, setName] = useState(vendor?.name ?? "");
  const [category, setCategory] = useState(vendor?.category ?? "Misc");
  const [totalCost, setTotalCost] = useState(
    vendor ? String(vendor.totalCost) : "",
  );
  const [deadline, setDeadline] = useState(vendor?.finalPaymentDeadline ?? "");
  const [paymentDetails, setPaymentDetails] = useState(vendor?.paymentDetails ?? "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setIsPending(true);

    startTransition(async () => {
      const details = {
        name,
        category,
        totalCost: Number(totalCost),
        finalPaymentDeadline: deadline,
        paymentDetails,
      };
      const result = vendor
        ? await updateVendorDetailsAction(vendor.id, details)
        : await createVendorAction(details);

      setIsPending(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      onClose?.();
      router.refresh();
    });
  }

  function remove() {
    if (!vendor || !window.confirm(`Remove ${vendor.name}?`)) {
      return;
    }

    setIsPending(true);
    startTransition(async () => {
      const result = await deleteVendorAction(vendor.id);
      setIsPending(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      onClose?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-2.5 rounded-[1.25rem] border border-border/80 bg-muted/25 p-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <Input onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <select
            className="flex h-11 w-full rounded-2xl border border-border bg-white/80 px-4 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Cost (£)</span>
          <Input
            inputMode="decimal"
            onChange={(event) => setTotalCost(event.target.value)}
            value={totalCost}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Payment deadline
          </span>
          <Input
            onChange={(event) => setDeadline(event.target.value)}
            type="date"
            value={deadline}
          />
        </label>
      </div>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Bank details</span>
        <Textarea
          onChange={(event) => setPaymentDetails(event.target.value)}
          rows={4}
          value={paymentDetails}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          disabled={isPending || !name}
          onClick={save}
          size="sm"
          type="button"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button onClick={onClose} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
        {vendor ? (
          <Button
            disabled={isPending}
            onClick={remove}
            size="sm"
            type="button"
            variant="destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Owns the header row so the edit form can span the full card width. */
export function VendorHeader({
  vendor,
  cost,
}: {
  vendor: Vendor;
  cost: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return <VendorFields onClose={() => setIsOpen(false)} vendor={vendor} />;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-base font-semibold text-primary">{vendor.name}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-muted-foreground">{cost}</p>
        <Button
          aria-label={`Edit ${vendor.name}`}
          onClick={() => setIsOpen(true)}
          size="icon"
          title={`Edit ${vendor.name}`}
          type="button"
          variant="ghost"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AddVendorButton() {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return <VendorFields onClose={() => setIsOpen(false)} />;
  }

  return (
    <Button onClick={() => setIsOpen(true)} size="sm" type="button" variant="outline">
      <Plus className="mr-1.5 h-4 w-4" />
      Add vendor
    </Button>
  );
}
