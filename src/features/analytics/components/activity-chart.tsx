"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ActivityChart({ data }: { data: Array<{ day: string; scans: number; redirects: number }> }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 16, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip />
          <Area type="monotone" dataKey="scans" stroke="#0f766e" fill="#0f766e" fillOpacity={0.16} />
          <Area type="monotone" dataKey="redirects" stroke="#243040" fill="#243040" fillOpacity={0.12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
