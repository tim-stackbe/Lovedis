"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekPoint } from "@/lib/marketing/metrics";

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Impressions per week (bars) and new followers (line), 12 weeks. */
export function WeeklyChart({ data }: { data: WeekPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E6E7F0" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#6B6B7B" }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="imp"
            tick={{ fontSize: 11, fill: "#6B6B7B" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={48}
          />
          <YAxis
            yAxisId="fol"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6B6B7B" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            formatter={(value, name) => [fmt(Number(value)), name]}
            contentStyle={{ borderRadius: 12, borderColor: "#E6E7F0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "#3D3D4D" }}>{value}</span>} />
          <Bar yAxisId="imp" dataKey="impressions" name="Impressionen" fill="#EEEDFF" stroke="#C9C7FF" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="fol"
            dataKey="newFollowers"
            name="Neue Follower"
            stroke="#2926E5"
            strokeWidth={2.5}
            dot={false}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
