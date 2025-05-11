'use client';

import React, { useState, useEffect, memo, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { startOfDay, addDays, format, isSameDay, parseISO, isValid } from 'date-fns';
import type { HabitLog } from '@/types';

const intensityClasses = ["bg-secondary/30", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"];

const calculateIntensity = (date: Date, logs: HabitLog[]): number => {
    const completedCount = logs.filter(log => {
        // Ensure log.date is a string before parsing, and it's valid
        const logDate = typeof log.date === 'string' && isValid(parseISO(log.date)) ? parseISO(log.date) : null;
        return log.completed && logDate && isSameDay(startOfDay(logDate), date);
    }).length;
    if (completedCount === 0) return 0; if (completedCount === 1) return 1;
    if (completedCount <= 3) return 2; if (completedCount <= 5) return 3;
    if (completedCount <= 7) return 4; return 5;
};

const generateHeatmapData = (logs: HabitLog[], days = 30 * 5): { date: Date; intensity: number }[] => {
  const data = [];
  const today = startOfDay(new Date());
  const startDate = addDays(today, -(days - 1));
  for (let i = 0; i < days; i++) {
    const date = startOfDay(addDays(startDate, i));
    const intensity = calculateIntensity(date, logs);
    data.push({ date, intensity });
  }
  return data;
};

const HeatmapCell = memo(({ date, intensity }: { date: Date; intensity: number }) => {
    const safeIntensity = Math.max(0, Math.min(intensity, intensityClasses.length - 1));
    return (<div className={cn("aspect-square rounded-[2px]", intensityClasses[safeIntensity])} title={`${format(date, 'PP')}: Activity Lvl ${safeIntensity}`}/>);
});
HeatmapCell.displayName = 'HeatmapCell';

export function StudyHeatmap({ logs }: { logs: HabitLog[] }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const heatmapData = useMemo(() => {
      if (isClient && Array.isArray(logs)) {
          // Ensure logs are properly parsed if they come directly from localStorage as strings
          const parsedLogs = logs.map(log => ({
              ...log,
              date: typeof log.date === 'string' ? log.date : new Date(log.date).toISOString() // Ensure date is string for generateHeatmapData
          }));
          return generateHeatmapData(parsedLogs);
      }
      return [];
  }, [isClient, logs]);

  if (!isClient) return <div className="grid grid-cols-7 gap-1 aspect-[4/1]">{[...Array(35)].map((_,i)=><div key={i} className="bg-muted animate-pulse"/>)}</div>;
  const dayLabels = ["Mon", "Wed", "Fri", "Sun"];
  return (
    <div className="flex gap-3">
        <div className="flex flex-col justify-between text-xs text-muted-foreground pt-1 pb-1" style={{ gap: '4.5rem' }}>{dayLabels.map(l=><span key={l}>{l}</span>)}</div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 flex-1 overflow-hidden">
          {heatmapData.length > 0 ? heatmapData.map((data, i)=>(<HeatmapCell key={i} date={data.date} intensity={data.intensity} />)) : <p className="col-span-full row-span-7 flex items-center justify-center text-sm">No activity data.</p>}
        </div>
    </div>
  );
}
