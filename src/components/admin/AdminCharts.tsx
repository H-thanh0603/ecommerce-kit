"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/format";

type DayPoint = { date: string; total: number };
type TopProduct = { id: string; name: string; sold: number };

function shortVnd(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

/** Biểu đồ doanh thu 7/30/90 ngày (DATA-001, DATA-005, DATA-006, DATA-008: baseline = 0). */
export function RevenueChart({ days }: { days: DayPoint[] }) {
  const useArea = days.length > 14;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {useArea ? (
          <AreaChart data={days} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--brand-line)" />
            <XAxis
              dataKey="date"
              minTickGap={24}
              tick={{ fontSize: 11, fill: "var(--brand-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, "auto"]}
              tickFormatter={shortVnd}
              tick={{ fontSize: 11, fill: "var(--brand-muted)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0]?.value ?? 0);
                return (
                  <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-md">
                    <p className="text-muted">Ngày {label}</p>
                    <p className="mt-0.5 font-medium text-primary tabular">{money(val)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--brand-primary)"
              strokeWidth={2}
              fill="url(#revFill)"
            />
          </AreaChart>
        ) : (
          <BarChart data={days} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--brand-line)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--brand-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, "auto"]}
              tickFormatter={shortVnd}
              tick={{ fontSize: 11, fill: "var(--brand-muted)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "rgba(15, 61, 46, 0.06)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0]?.value ?? 0);
                return (
                  <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-md">
                    <p className="text-muted">Ngày {label}</p>
                    <p className="mt-0.5 font-medium text-primary tabular">{money(val)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="total" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Top-N sản phẩm bán chạy dạng horizontal bar (DATA-001, DATA-003: sort sold DESC). */
export function TopProductsChart({ products }: { products: TopProduct[] }) {
  const sorted = [...products]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 6)
    .map((p) => ({
      ...p,
      shortName: p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name,
    }));

  if (!sorted.length) {
    return <p className="py-8 text-center text-sm text-muted">Chưa có dữ liệu bán hàng.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--brand-line)" />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--brand-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={130}
            tick={{ fontSize: 11, fill: "var(--brand-ink)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(196, 92, 38, 0.08)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as TopProduct;
              return (
                <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-ink">{row.name}</p>
                  <p className="mt-0.5 text-primary tabular">{row.sold} đã bán</p>
                </div>
              );
            }}
          />
          <Bar dataKey="sold" fill="var(--brand-accent)" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
