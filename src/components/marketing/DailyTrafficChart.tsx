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

export interface TrafficPoint {
  day: string;
  pageviews: number;
  visitors: number;
}

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Website pageviews per day (bars) and visitors (line). */
export function DailyTrafficChart({ data }: { data: TrafficPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E6E7F0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#6B6B7B" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6B6B7B" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            formatter={(value, name) => [fmt(Number(value)), name]}
            contentStyle={{ borderRadius: 12, borderColor: "#E6E7F0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "#3D3D4D" }}>{value}</span>} />
          <Bar dataKey="pageviews" name="Seitenaufrufe" fill="#EEEDFF" stroke="#C9C7FF" radius={[4, 4, 0, 0]} />
          <Line dataKey="visitors" name="Besucher" stroke="#2926E5" strokeWidth={2.5} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
