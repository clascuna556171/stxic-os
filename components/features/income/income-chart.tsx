"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyTotal } from "@/lib/income";
import { currencySymbol } from "@/lib/utils/currency";
import type { Currency } from "@/types";

export function IncomeChart({ data, currency }: { data: MonthlyTotal[]; currency: Currency }) {
  const symbol = currencySymbol(currency);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`${symbol}${Number(value)}`, "Total"]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "var(--text)" }}
            itemStyle={{ color: "var(--accent)" }}
            cursor={{ fill: "var(--surface-2)" }}
          />
          <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
