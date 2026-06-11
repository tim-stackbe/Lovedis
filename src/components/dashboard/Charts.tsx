"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartDatum {
  name: string;
  value: number;
}

export function DistributionChart({
  data,
  accentIndex = -1,
}: {
  data: ChartDatum[];
  accentIndex?: number;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#E5E5EE" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#6B6B7B", fontSize: 11 }}
            axisLine={{ stroke: "#E5E5EE" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#6B6B7B", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#F4F4F8" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E5E5EE",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === accentIndex ? "#FF5736" : "#2926E5"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
