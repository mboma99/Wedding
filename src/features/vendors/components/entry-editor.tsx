"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  currentMonthKey,
  evenSplit,
  formatCurrency,
  formatMonth,
  FundingSource,
  fundingSourceColors,
  fundingSourceLabels,
  fundingSourceOrder,
  getEntrySplit,
  PAID_COLOR,
  type VendorEntry,
} from "@/domain/vendors";
import { SourceChip } from "@/features/vendors/components/source-chip";
import {
  addVendorEntryAction,
  deleteVendorEntryAction,
  updateVendorEntryAction,
} from "@/server/actions/vendors";

function useMutation() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(work: () => Promise<{ success: boolean; message: string }>) {
    setError(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await work();
      setIsPending(false);

      if (!result.success) {
        setError(result.message);
        return;
      }

      router.refresh();
    });
  }

  return { isPending, error, run };
}

function SourceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      aria-label="Money from"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {fundingSourceOrder.map((option) => (
        <option key={option} value={option}>
          {fundingSourceLabels[option]}
        </option>
      ))}
    </Select>
  );
}

function SplitFields({
  amount,
  lisa,
  james,
  onLisa,
  onJames,
}: {
  amount: number;
  lisa: string;
  james: string;
  onLisa: (value: string) => void;
  onJames: (value: string) => void;
}) {
  const sum = Number(lisa || 0) + Number(james || 0);
  const off = Math.abs(sum - amount) > 0.01;

  return (
    <div className="space-y-1.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Lisa put in</span>
          <Input
            inputMode="decimal"
            onChange={(event) => onLisa(event.target.value)}
            value={lisa}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            James put in
          </span>
          <Input
            inputMode="decimal"
            onChange={(event) => onJames(event.target.value)}
            value={james}
          />
        </label>
      </div>
      {off ? (
        <p className="text-xs text-destructive">
          Shares add up to {formatCurrency(sum)}, not {formatCurrency(amount)}.
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal, scrollable strip of a vendor's payments in month order. */
export function EntryTimeline({
  vendorId,
  entries,
}: {
  vendorId: string;
  entries: VendorEntry[];
}) {
  const { isPending, error, run } = useMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [source, setSource] = useState<string>(FundingSource.LISA);
  const [lisaShare, setLisaShare] = useState("");
  const [jamesShare, setJamesShare] = useState("");
  const [paid, setPaid] = useState(false);

  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  function open(entry: VendorEntry) {
    if (selectedId === entry.id) {
      setSelectedId(null);
      return;
    }

    setSelectedId(entry.id);
    setAmount(String(entry.amount));
    setMonth(entry.month);
    setSource(entry.source);

    setPaid(entry.paid);

    const split = getEntrySplit(entry) ?? evenSplit(entry.amount);
    setLisaShare(String(split.lisa));
    setJamesShare(String(split.james));
  }

  function changeSource(next: string) {
    setSource(next);

    if (next === FundingSource.JOINT) {
      const split = evenSplit(Number(amount) || 0);
      setLisaShare(String(split.lisa));
      setJamesShare(String(split.james));
    }
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max items-stretch gap-2">
          {entries.map((entry) => {
            const isSelected = entry.id === selectedId;

            return (
              <li key={entry.id}>
                <div
                  className={
                    isSelected
                      ? "flex w-[150px] flex-col gap-2 rounded-xl border-2 border-primary/40 bg-white p-3"
                      : "flex w-[150px] flex-col gap-2 rounded-xl border border-border/70 bg-white/70 p-3"
                  }
                  style={
                    entry.paid ? { backgroundColor: `${PAID_COLOR}1f` } : undefined
                  }
                >
                  <button
                    className="space-y-1.5 text-left"
                    onClick={() => open(entry)}
                    title="Edit this payment"
                    type="button"
                  >
                    <span
                      className="block h-1 w-8 rounded-full"
                      style={{ backgroundColor: fundingSourceColors[entry.source] }}
                    />
                    <span className="block text-xs text-muted-foreground">
                      {formatMonth(entry.month, "short")}
                    </span>
                    <span className="block text-base font-semibold text-primary">
                      {formatCurrency(entry.amount)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {fundingSourceLabels[entry.source]}
                      {entry.paid ? " · paid" : ""}
                    </span>
                    {entry.source === FundingSource.JOINT ? (
                      <span className="block text-xs text-muted-foreground">
                        L {formatCurrency(getEntrySplit(entry)?.lisa ?? 0)} · J{" "}
                        {formatCurrency(getEntrySplit(entry)?.james ?? 0)}
                      </span>
                    ) : null}
                  </button>
                  <Button
                    className="w-full"
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        updateVendorEntryAction(vendorId, entry.id, {
                          paid: !entry.paid,
                        }),
                      )
                    }
                    size="sm"
                    title={
                      entry.paid
                        ? "Move back to set aside"
                        : "Mark as paid to the vendor"
                    }
                    type="button"
                    variant={entry.paid ? "ghost" : "outline"}
                  >
                    {entry.paid ? (
                      <>
                        <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                        Unpay
                      </>
                    ) : (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Paid
                      </>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {selected ? (
        <div className="animate-enter space-y-2.5 rounded-xl border border-border/80 bg-muted/25 p-3">
          <div className="flex items-center gap-2">
            <SourceChip source={selected.source} />
            <span className="text-sm text-muted-foreground">
              {formatMonth(selected.month)}
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Input
              aria-label="Amount"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
            />
            <Input
              aria-label="Month"
              onChange={(event) => setMonth(event.target.value)}
              type="month"
              value={month}
            />
            <SourceSelect onChange={changeSource} value={source} />
          </div>
          {source === FundingSource.JOINT ? (
            <SplitFields
              amount={Number(amount) || 0}
              james={jamesShare}
              lisa={lisaShare}
              onJames={setJamesShare}
              onLisa={setLisaShare}
            />
          ) : null}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={paid}
              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
              onChange={(event) => setPaid(event.target.checked)}
              type="checkbox"
            />
            Paid to the vendor
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex-1"
              disabled={isPending || !amount}
              onClick={() =>
                run(async () => {
                  const result = await updateVendorEntryAction(vendorId, selected.id, {
                    amount: Number(amount),
                    month,
                    source,
                    paid,
                    split:
                      source === FundingSource.JOINT
                        ? { lisa: Number(lisaShare), james: Number(jamesShare) }
                        : null,
                  });

                  if (result.success) {
                    setSelectedId(null);
                  }

                  return result;
                })
              }
              size="sm"
              type="button"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={() => setSelectedId(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const result = await deleteVendorEntryAction(vendorId, selected.id);

                  if (result.success) {
                    setSelectedId(null);
                  }

                  return result;
                })
              }
              size="sm"
              type="button"
              variant="destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function AddEntryForm({ vendorId }: { vendorId: string }) {
  const { isPending, error, run } = useMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(currentMonthKey());
  const [source, setSource] = useState<string>(FundingSource.LISA);
  const [lisaShare, setLisaShare] = useState("");
  const [jamesShare, setJamesShare] = useState("");

  function changeSource(next: string) {
    setSource(next);

    if (next === FundingSource.JOINT) {
      const split = evenSplit(Number(amount) || 0);
      setLisaShare(String(split.lisa));
      setJamesShare(String(split.james));
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm" type="button" variant="outline">
        <Plus className="mr-1.5 h-4 w-4" />
        Add
      </Button>
    );
  }

  return (
    <div className="animate-enter space-y-2.5 rounded-xl border border-border/80 bg-muted/25 p-3">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Input
          aria-label="Amount"
          inputMode="decimal"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="£"
          value={amount}
        />
        <Input
          aria-label="Month"
          onChange={(event) => setMonth(event.target.value)}
          type="month"
          value={month}
        />
        <SourceSelect onChange={changeSource} value={source} />
      </div>
      {source === FundingSource.JOINT ? (
        <SplitFields
          amount={Number(amount) || 0}
          james={jamesShare}
          lisa={lisaShare}
          onJames={setJamesShare}
          onLisa={setLisaShare}
        />
      ) : null}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={isPending || !amount}
          onClick={() =>
            run(async () => {
              const result = await addVendorEntryAction(vendorId, {
                amount: Number(amount),
                month,
                source,
                split:
                  source === FundingSource.JOINT
                    ? { lisa: Number(lisaShare), james: Number(jamesShare) }
                    : null,
              });

              if (result.success) {
                setAmount("");
                setIsOpen(false);
              }

              return result;
            })
          }
          size="sm"
          type="button"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          onClick={() => setIsOpen(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
