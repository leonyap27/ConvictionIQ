import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useHoldings } from "@/hooks/use-data";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const sectors = [
  "Technology",
  "Financials",
  "Healthcare",
  "Energy",
  "Consumer Discretionary",
  "Consumer Staples",
  "Communication",
  "Industrials",
  "Utilities",
  "Materials",
  "Real Estate",
  "Index ETF",
  "Commodity ETF",
];

const schema = z.object({
  ticker: z.string().trim().min(1, "Ticker required").max(6).transform((s) => s.toUpperCase()),
  positionSize: z.number({ error: "Must be a number" }).positive("Must be > 0"),
  sector: z.string().min(1, "Select a sector"),
  entryPrice: z.number({ error: "Must be a number" }).positive("Must be > 0"),
});
type FormData = z.infer<typeof schema>;

export function PortfolioScreen() {
  const { data: holdings = [], isLoading } = useHoldings();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ticker: "", positionSize: 0, sector: "", entryPrice: 0 },
  });

  const onSubmit = async (data: FormData) => {
    const id = editingId ?? crypto.randomUUID();
    await db.holdings.put({
      id,
      ticker: data.ticker,
      positionSize: data.positionSize,
      sector: data.sector,
      entryPrice: data.entryPrice,
    });
    await queryClient.invalidateQueries({ queryKey: ["holdings"] });
    await queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    toast.success(editingId ? "Holding updated" : "Holding added");
    reset({ ticker: "", positionSize: 0, sector: "", entryPrice: 0 });
    setEditingId(null);
  };

  const del = async (id: string) => {
    await db.holdings.delete(id);
    await queryClient.invalidateQueries({ queryKey: ["holdings"] });
    await queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    toast.success("Holding removed");
  };

  const totalValue = holdings.reduce(
    (s, h) => s + h.positionSize * h.entryPrice,
    0,
  );

  const currentSector = watch("sector");

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Portfolio Exposure
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manually entered holdings — used by the Decision Quality Gate to enforce
        sector concentration limits.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {editingId ? "Edit holding" : "Add holding"}
        </h2>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-3 md:grid-cols-5"
        >
          <div>
            <Label htmlFor="ticker" className="text-xs">
              Ticker
            </Label>
            <Input id="ticker" {...register("ticker")} placeholder="AAPL" />
            {errors.ticker && (
              <p className="mt-1 text-xs text-destructive">
                {errors.ticker.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="positionSize" className="text-xs">
              Shares
            </Label>
            <Input
              id="positionSize"
              type="number"
              step="1"
              {...register("positionSize", { valueAsNumber: true })}
            />
            {errors.positionSize && (
              <p className="mt-1 text-xs text-destructive">
                {errors.positionSize.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="sector" className="text-xs">
              Sector
            </Label>
            <select
              id="sector"
              value={currentSector}
              onChange={(e) => setValue("sector", e.target.value, { shouldValidate: true })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Select…</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.sector && (
              <p className="mt-1 text-xs text-destructive">
                {errors.sector.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="entryPrice" className="text-xs">
              Entry price
            </Label>
            <Input
              id="entryPrice"
              type="number"
              step="0.01"
              {...register("entryPrice", { valueAsNumber: true })}
            />
            {errors.entryPrice && (
              <p className="mt-1 text-xs text-destructive">
                {errors.entryPrice.message}
              </p>
            )}
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" />
              {editingId ? "Update" : "Add"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset({ ticker: "", positionSize: 0, sector: "", entryPrice: 0 });
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-border">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
          <span className="font-semibold">Current holdings</span>
          <span className="text-xs text-muted-foreground">
            Total value:{" "}
            <span className="tabular text-foreground">
              ${totalValue.toLocaleString()}
            </span>
          </span>
        </header>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : holdings.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No holdings entered — add positions to enable portfolio exposure
            checks.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-right">Shares</th>
                <th className="px-3 py-2 text-left">Sector</th>
                <th className="px-3 py-2 text-right">Entry Price</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holdings.map((h) => (
                <tr key={h.id} className="hover:bg-accent/30">
                  <td className="px-3 py-2 font-mono font-semibold">
                    {h.ticker}
                  </td>
                  <td className="px-3 py-2 text-right tabular">
                    {h.positionSize}
                  </td>
                  <td className="px-3 py-2 text-xs">{h.sector}</td>
                  <td className="px-3 py-2 text-right tabular">
                    ${h.entryPrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right tabular">
                    ${(h.positionSize * h.entryPrice).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(h.id);
                        reset({
                          ticker: h.ticker,
                          positionSize: h.positionSize,
                          sector: h.sector,
                          entryPrice: h.entryPrice,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => del(h.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
