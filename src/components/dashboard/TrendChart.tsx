"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/mock/aggregate";
import { formatMonthLabel } from "@/lib/mock/aggregate";

// spec §4.5「期間推移グラフ」。主要KPI3種の月次推移。
// 配色は dataviz skill の色検証を通した3色（--navy / --accent と調和する低彩度セット、
// spec §12.3）。カテゴリカル配色のため凡例を常設し、テキストはトークン色のまま固定する。
const SERIES = [
  { key: "leads", label: "反響数", color: "#3B6EA5" },
  { key: "visits", label: "来場数", color: "#A61A72" },
  { key: "contracts", label: "契約数", color: "#A67C1E" },
] as const;

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const data = points.map((p) => ({ ...p, month: formatMonthLabel(p.periodStart) }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#D9DCDF" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6D6E71" }} axisLine={{ stroke: "#C6CBCF" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#6D6E71" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#D9DCDF" }}
            labelStyle={{ fontWeight: 600, color: "#101820" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#6D6E71" }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4, fill: s.color, strokeWidth: 2, stroke: "#FFFFFF" }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
