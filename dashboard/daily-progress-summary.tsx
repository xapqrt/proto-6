'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from '@/hooks/use-auth';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadUserData } from '@/lib/local-storage';
import { Task, TimerSession, HabitLog } from '@/types';
import { isSameDay, startOfDay, parseISO, isValid } from 'date-fns'; // Added parseISO, isValid

const TASKS_SUFFIX = 'tasks';
const SESSIONS_SUFFIX = 'timerSessions';
const LOGS_SUFFIX = 'habitLogs';

interface DailyActivityData {
    tasksCompleted: number;
    focusTimeMinutes: number;
    habitsCompleted: number;
}

function generateManualSummary(data: DailyActivityData): string {
    if (data.tasksCompleted === 0 && data.focusTimeMinutes === 0 && data.habitsCompleted === 0) {
        return "No activity logged yet today. Ready to start fresh?";
    }
    let summaryParts: string[] = [];
    if (data.tasksCompleted > 0) summaryParts.push(`Completed ${data.tasksCompleted} task${data.tasksCompleted > 1 ? 's' : ''}`);
    if (data.focusTimeMinutes > 0) summaryParts.push(`Logged ${data.focusTimeMinutes} minute${data.focusTimeMinutes > 1 ? 's' : ''} of focus`);
    if (data.habitsCompleted > 0) summaryParts.push(`Tracked ${data.habitsCompleted} habit${data.habitsCompleted > 1 ? 's' : ''}`);

    let summary = "Great job today! ";
    if (summaryParts.length === 1) summary += summaryParts[0] + '.';
    else if (summaryParts.length === 2) summary += summaryParts[0] + ' and ' + summaryParts[1].toLowerCase() + '.';
    else if (summaryParts.length > 2) summary += summaryParts.slice(0, -1).join(', ') + ', and ' + summaryParts.slice(-1)[0].toLowerCase() + '.';
    return summary;
}

export function DailyProgressSummary() {
    const { userId, loading: authLoading } = useAuth();
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAndSummarize = useCallback(() => {
        if (!userId) return;
        setIsLoading(true); setError(null);
        try {
            const today = startOfDay(new Date());
            const tasks = loadUserData<Task[]>(userId, TASKS_SUFFIX) || [];
            const sessions = loadUserData<TimerSession[]>(userId, SESSIONS_SUFFIX) || [];
            const habitLogs = loadUserData<HabitLog[]>(userId, LOGS_SUFFIX) || [];

            const tasksCompletedToday = tasks.filter(task =>
                task.completed && task.completedAt && isValid(parseISO(task.completedAt)) && isSameDay(parseISO(task.completedAt), today)
            ).length;

            const focusTimeTodaySeconds = sessions
                 .filter(s => s.mode === 'pomodoro' && s.endTime && isValid(parseISO(s.endTime)) && isSameDay(parseISO(s.endTime), today))
                 .reduce((sum, s) => sum + s.duration, 0);
             const focusTimeMinutesToday = Math.round(focusTimeTodaySeconds / 60);

             const habitsCompletedToday = habitLogs.filter(log =>
                 log.completed && log.date && isValid(parseISO(log.date)) && isSameDay(parseISO(log.date), today)
             ).length;

            const activityData: DailyActivityData = { tasksCompleted: tasksCompletedToday, focusTimeMinutes: focusTimeMinutesToday, habitsCompleted: habitsCompletedToday };
            setSummary(generateManualSummary(activityData));
        } catch (e: any) {
            console.error("Error fetching daily summary from localStorage:", e);
            setError(e.message || "Failed to generate summary"); setSummary(null);
        } finally { setIsLoading(false); }
    }, [userId]);

    useEffect(() => {
        if (!authLoading && userId) {
            fetchAndSummarize();
            const intervalId = setInterval(fetchAndSummarize, 5 * 60 * 1000); // Refresh every 5 mins
            return () => clearInterval(intervalId);
        } else if (!authLoading && !userId) {
             setSummary(null); setError(null); setIsLoading(false);
        }
    }, [userId, authLoading, fetchAndSummarize]);

    if (authLoading && !userId) return null; // Don't render if auth is loading and no user yet

    return (
        <Card className="glassmorphism hover-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-primary">Today's Summary</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchAndSummarize} disabled={isLoading || authLoading} className="h-7 w-7"><RefreshCw className={isLoading ? "animate-spin" : ""} /></Button>
            </CardHeader>
            <CardContent className="h-16 flex items-center"> {/* Fixed height for content area */}
                {isLoading && !summary ? (
                    <div className="flex items-center"><Loader2 className="w-5 h-5 animate-spin text-primary mr-2" /><span>Generating...</span></div>
                ) : error ? (
                    <div className="flex items-center text-destructive"><AlertCircle className="w-5 h-5 mr-2" /><span>Error: {error}</span></div>
                ) : summary ? (
                    <p className="text-sm text-muted-foreground">{summary}</p>
                ) : (
                     <p className="text-sm text-muted-foreground">No activity yet. Let's get started!</p>
                )}
            </CardContent>
        </Card>
    );
}

