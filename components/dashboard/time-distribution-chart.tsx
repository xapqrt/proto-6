'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { useEffect, useState, useMemo } from "react";
// TimerSession type is not directly used here as `data` prop has specific structure
// import type { TimerSession } from "@/types";

const useChartConfig = () => useMemo<ChartConfig>(() => ({
  time: { label: "Time (minutes)" },
  focus: { label: "Focus", color: "hsl(var(--chart-1))" },
  shortbreak: { label: "Short Break", color: "hsl(var(--chart-2))" },
  longbreak: { label: "Long Break", color: "hsl(var(--chart-3))" },
}), []);

interface ChartDataPoint {
    activity: string; // e.g., "Focus", "Short Break"
    time: number;     // in minutes
    fill?: string;    // Optional: fill color for the bar
}

interface TimeDistributionChartProps {
    data: ChartDataPoint[];
}

export function TimeDistributionChart({ data: chartDataInput }: TimeDistributionChartProps) {
   const [isClient, setIsClient] = useState(false);
   const chartConfig = useChartConfig();

   useEffect(() => { setIsClient(true); }, []);

  const processedChartData = useMemo(() => {
     if (!Array.isArray(chartDataInput)) return []; // Handle cases where data might not be an array yet
     return chartDataInput.map(item => ({
       ...item,
       fill: chartConfig[item.activity.toLowerCase().replace(' ', '') as keyof typeof chartConfig]?.color || 'hsl(var(--chart-5))',
     }));
   }, [chartDataInput, chartConfig]);

  if (!isClient) return <div className="h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-md">Loading Chart...</div>;
  if (processedChartData.length === 0) return <div className="h-[200px] w-full flex items-center justify-center">No timer data for chart.</div>;

  return (
    <div className="h-[200px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer data={processedChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="activity" type="category" tickLine={false} tickMargin={10} axisLine={false}
                        tickFormatter={value => chartConfig[value.toLowerCase().replace(' ', '') as keyof typeof chartConfig]?.label || value}
                        className="fill-muted-foreground text-xs" width={80} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="time" layout="vertical" radius={4} barSize={15} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    </div>
  )
}
