"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, type VendorLineItem } from "@/domain/vendors";
import {
  addVendorLineItemAction,
  deleteVendorLineItemAction,
  updateVendorLineItemAction,
} from "@/server/actions/vendors";

export function LineItems({
  vendorId,
  items,
}: {
  vendorId: string;
  items: VendorLineItem[];
}) {
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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

      setEditingIndex(null);
      setIsAdding(false);
      setDescription("");
      setPrice("");
      router.refresh();
    });
  }

  function startEdit(index: number, item: VendorLineItem) {
    setIsAdding(false);
    setEditingIndex(index);
    setDescription(item.description);
    setPrice(String(item.price));
  }

  function Fields({ onSave }: { onSave: () => void }) {
    return (
      <div className="space-y-2.5 rounded-[1.25rem] border border-border/80 bg-white/70 p-3">
        <Input
          aria-label="Covers"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What this covers"
          value={description}
        />
        <div className="flex gap-2">
          <Input
            aria-label="Price"
            className="flex-1"
            inputMode="decimal"
            onChange={(event) => setPrice(event.target.value)}
            placeholder="£"
            value={price}
          />
          <Button
            disabled={isPending || !description}
            onClick={onSave}
            size="sm"
            type="button"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={() => {
              setEditingIndex(null);
              setIsAdding(false);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={`${item.description}-${index}`}>
            {editingIndex === index ? (
              <Fields
                onSave={() =>
                  run(() =>
                    updateVendorLineItemAction(vendorId, index, {
                      description,
                      price: Number(price),
                    }),
                  )
                }
              />
            ) : (
              <div className="flex items-start justify-between gap-3 text-sm">
                <button
                  className="min-w-0 flex-1 whitespace-pre-line text-left text-muted-foreground hover:text-primary"
                  onClick={() => startEdit(index, item)}
                  title="Edit this item"
                  type="button"
                >
                  {item.description || "Item"}
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    className="font-medium text-primary underline decoration-dotted underline-offset-4"
                    onClick={() => startEdit(index, item)}
                    type="button"
                  >
                    {formatCurrency(item.price)}
                  </button>
                  <Button
                    aria-label="Delete item"
                    disabled={isPending}
                    onClick={() =>
                      run(() => deleteVendorLineItemAction(vendorId, index))
                    }
                    size="icon"
                    title="Delete item"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isAdding ? (
        <Fields
          onSave={() =>
            run(() =>
              addVendorLineItemAction(vendorId, {
                description,
                price: Number(price),
              }),
            )
          }
        />
      ) : (
        <Button
          onClick={() => {
            setEditingIndex(null);
            setIsAdding(true);
            setDescription("");
            setPrice("");
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add item
        </Button>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
