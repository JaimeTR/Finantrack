"use client";
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

interface ExpensesPieProps {
  expensesByCategory: { name: string; value: number; fill: string }[];
  chartConfig: ChartConfig;
}

export function ExpensesPie({ expensesByCategory, chartConfig }: ExpensesPieProps) {
  const data = useMemo(() => expensesByCategory, [expensesByCategory]);
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
