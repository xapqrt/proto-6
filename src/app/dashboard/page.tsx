// src/app/dashboard/page.tsx
'use client';

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Target, Activity, CreditCard, Bot, Clock3, ListChecks, Users as UsersIcon, RefreshCw } from "lucide-react";
import { StudyHeatmap } from "@/components/dashboard/study-heatmap";
import { TimeDistributionChart } from "@/components/dashboard/time-distribution-chart";
import { RecentActivityList, type ActivityItem } from "@/components/dashboard/recent-activity-list";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout, type DashboardWidgetConfig } from '@/components/dashboard/dashboard-layout';
import { DailyProgressSummary } from '@/components/dashboard/daily-progress-summary';
import { useAuth } from '@/hooks/use-auth';
import { Task, TimerSession, Goal, HabitLog, Deck, Note } from '@/types';
import { formatDistanceToNow, parseISO, isValid, isSameDay, startOfDay, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadUserData } from '@/lib/local-storage'; // Still used for app data
import { useRouter } from 'next/navigation'; // Import useRouter for prefetching

// --- Suffix Constants for localStorage application data ---
const TASKS_SUFFIX = 'tasks';
const SESSIONS_SUFFIX = 'timerSessions';
const GOALS_SUFFIX = 'goals';
const LOGS_SUFFIX = 'habitLogs';
const DECKS_SUFFIX = 'flashcardDecks';
const NOTES_SUFFIX = 'notes';

const AdminDataView = () => {
    const { isAdmin, getAllUsers, loading: authLoading } = useAuth();
    const [userCount, setUserCount] = useState<number | null>(null);
    const [adminDataLoading, setAdminDataLoading] = useState(false);
    const [adminError, setAdminError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchAdminData = useCallback(async () => {
        if (!isAdmin || !getAllUsers) {
            setUserCount(null);
            return;
        }
        setAdminDataLoading(true);
        setAdminError(null);
        try {
            const usersList = await getAllUsers(); // Fetches from API
            if (usersList) {
                setUserCount(usersList.length);
            } else {
                setUserCount(0); // Or handle as an error
                setAdminError("Could not load user list for admin.");
            }
        } catch (err) {
            console.error("Failed to fetch user count for admin:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error loading admin data.";
            setAdminError(errorMessage);
            setUserCount(null);
            toast({ title: "Admin Data Error", description: errorMessage, variant: "destructive" });
        } finally {
            setAdminDataLoading(false);
        }
    }, [isAdmin, getAllUsers, toast]);

    useEffect(() => {
        if (isAdmin && !authLoading) { // Fetch only if admin and auth state is resolved
             fetchAdminData();
        }
    }, [isAdmin, authLoading, fetchAdminData]);

    if (!isAdmin) return null;

    return (
        <Card className="glassmorphism col-span-1 sm:col-span-2 lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-primary flex items-center gap-2">
                    <UsersIcon className="w-5 h-5" /> Admin Overview
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchAdminData} disabled={adminDataLoading || authLoading} className="h-7 w-7 text-muted-foreground hover:text-primary">
                    {adminDataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
            </CardHeader>
            <CardContent>
                {adminDataLoading ? (
                    <div className="flex items-center text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading admin data...</div>
                ) : adminError ? (
                    <p className="text-sm text-destructive">{adminError}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Total Registered Users (MongoDB): <span className="font-bold text-foreground">{userCount ?? 'N/A'}</span></p>
                )}
            </CardContent>
        </Card>
    );
};


// --- Widget Components (Conceptual, data passed as props) ---
const FocusWidget = ({ totalFocusTime = 0 }: { totalFocusTime: number }) => (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Today's Focus</CardTitle>
        <Clock3 className="w-5 h-5 text-primary" />
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-3xl font-bold mb-1">
           {Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m
        </div>
        <p className="text-xs text-muted-foreground pt-1">Total focus minutes logged</p>
      </CardContent>
    </>
);

const FlashcardsWidget = ({ deckCount }: { deckCount: number }) => (
    <>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flashcard Decks</CardTitle>
            <CreditCard className="w-5 h-5 text-primary" />
        </CardHeader>
        <CardContent className="pt-2">
            <div className="text-3xl font-bold mb-1">{deckCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Total decks created/imported</p>
        </CardContent>
    </>
);

const NotesWidget = ({ noteCount }: { noteCount: number }) => (
     <>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes Created</CardTitle>
            <FileText className="w-5 h-5 text-primary" />
        </CardHeader>
        <CardContent className="pt-2">
            <div className="text-3xl font-bold mb-1">{noteCount}</div>
            <p className="text-xs text-muted-foreground pt-1">Total notes and summaries</p>
        </CardContent>
    </>
);

const GoalsWidget = ({ goalCount, completedGoals }: { goalCount: number, completedGoals: number }) => {
    const progress = goalCount > 0 ? Math.round((completedGoals / goalCount) * 100) : 0;
    return (
        <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Goals Progress</CardTitle>
                <Target className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-2">
                <div className="text-3xl font-bold mb-1">{completedGoals} / {goalCount}</div>
                <p className="text-xs text-muted-foreground pt-1">Goals completed</p>
                <Progress value={progress} className="mt-3 h-2" />
            </CardContent>
        </>
    );
};

const HeatmapWidget = ({ habitLogs }: { habitLogs: HabitLog[] }) => (
    <>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-primary flex items-center justify-between">
          Study/Habit Heatmap
          <span className="text-sm text-muted-foreground">Last ~5 months</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
         <StudyHeatmap logs={habitLogs} />
      </CardContent>
    </>
);

const TimeDistributionWidget = ({ sessions }: { sessions: TimerSession[] }) => {
    const chartData = useMemo(() => {
        const distribution = sessions.reduce((acc, session) => {
            const mode = session.mode === 'pomodoro' ? 'Focus' : (session.mode === 'shortBreak' ? 'Short Break' : 'Long Break');
            acc[mode] = (acc[mode] || 0) + session.duration;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(distribution).map(([activity, totalSeconds]) => ({
            activity,
            time: Math.round(totalSeconds / 60),
        }));
    }, [sessions]);

    return (
      <>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-primary">Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
           {chartData.length > 0 ? (
             <TimeDistributionChart data={chartData} />
           ) : (
             <p className="text-muted-foreground text-sm">No timer sessions recorded yet.</p>
           )}
        </CardContent>
      </>
    );
};

const RecentActivityWidget = ({ recentActivities }: { recentActivities: ActivityItem[] }) => {
    return (
      <>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-primary flex items-center justify-between">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList activities={recentActivities} />
        </CardContent>
      </>
    );
};

const ProgressSummaryWidget = () => <DailyProgressSummary />;


export default function DashboardPage() {
  const { userId, loading: authLoading, isAdmin } = useAuth(); // isAdmin from useAuth
  const router = useRouter(); // Initialize useRouter for prefetching
  const [dashboardData, setDashboardData] = useState<{
      tasks: Task[];
      sessions: TimerSession[];
      goals: Goal[];
      habitLogs: HabitLog[];
      decks: Deck[];
      notes: Note[];
  } | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const { toast } = useToast();

  // Parse date strings from localStorage into Date objects
  const parseItemDates = <T extends { [key: string]: any }>(item: T, dateFields: (keyof T)[]): T => {
    const newItem = { ...item };
    dateFields.forEach(field => {
        if (newItem[field] && typeof newItem[field] === 'string') {
            const date = parseISO(newItem[field]);
            if (isValid(date)) {
                newItem[field] = date;
            } else {
                console.warn(`Invalid date string found for field ${String(field)} in item:`, item);
                newItem[field] = new Date(); // Fallback or handle as needed
            }
        } else if (newItem[field] && typeof newItem[field] === 'number') { // Handle timestamp
             const date = new Date(newItem[field]);
             if (isValid(date)) {
                newItem[field] = date;
            } else {
                newItem[field] = new Date();
            }
        }
    });
    return newItem;
  };


  useEffect(() => {
    const fetchData = () => {
        if (!authLoading && userId && !hasFetched) {
            setIsPageLoading(true);
            try {
                // Application data (tasks, notes, etc.) is still loaded from localStorage
                const loadedTasks = loadUserData<Task[]>(userId, TASKS_SUFFIX) || [];
                const loadedSessions = loadUserData<TimerSession[]>(userId, SESSIONS_SUFFIX) || [];
                const loadedGoals = loadUserData<Goal[]>(userId, GOALS_SUFFIX) || [];
                const loadedHabitLogs = loadUserData<HabitLog[]>(userId, LOGS_SUFFIX) || [];
                const loadedDecks = loadUserData<Deck[]>(userId, DECKS_SUFFIX) || [];
                const loadedNotes = loadUserData<Note[]>(userId, NOTES_SUFFIX) || [];

                setDashboardData({
                    tasks: loadedTasks.map(t => parseItemDates(t, ['createdAt', 'updatedAt', 'dueDate', 'completedAt'])),
                    sessions: loadedSessions.map(s => parseItemDates(s, ['startTime', 'endTime'])),
                    goals: loadedGoals.map(g => parseItemDates(g, ['createdAt', 'updatedAt', 'targetDate'])),
                    habitLogs: loadedHabitLogs.map(l => parseItemDates(l, ['date'])),
                    decks: loadedDecks.map(d => parseItemDates(d, ['createdAt', 'updatedAt'])),
                    notes: loadedNotes.map(n => parseItemDates(n, ['createdAt', 'updatedAt'])),
                });
                setHasFetched(true);

                 // Prefetch key routes after initial data is loaded
                router.prefetch('/materials');
                router.prefetch('/goals');
                router.prefetch('/tasks');
                router.prefetch('/habits');
                router.prefetch('/timer');
                router.prefetch('/flashcards');
                router.prefetch('/notes');
                router.prefetch('/assistant');
                console.log('Dashboard: Prefetching key routes.');


            } catch (error) {
                 console.error("Failed to load dashboard data from localStorage:", error);
                 toast({ title: "Error Loading Dashboard", description: "Could not load data from local storage.", variant: "destructive" });
                 setDashboardData(null);
            } finally {
                 setIsPageLoading(false);
            }
        } else if (!authLoading && !userId) {
            setDashboardData(null);
            setHasFetched(false);
            setIsPageLoading(false);
        } else if (hasFetched) {
             setIsPageLoading(false);
        }
    };
    fetchData();
  }, [userId, authLoading, hasFetched, toast, router]); // Add router to dependencies


  const processedData = useMemo(() => {
    if (!dashboardData) {
        return {
            totalFocusTimeMinutes: 0,
            recentActivities: [],
            completedGoals: 0,
        };
    }

    const { tasks, sessions, goals } = dashboardData;
    const today = startOfDay(new Date());

    const todayFocusTimeSeconds = sessions
        .filter(s => s.mode === 'pomodoro' && s.endTime && isValid(new Date(s.endTime)) && isSameDay(new Date(s.endTime), today))
        .reduce((sum, s) => sum + s.duration, 0);
    const totalFocusTimeMinutes = Math.round(todayFocusTimeSeconds / 60);

    const taskActivities: ActivityItem[] = tasks
        .filter(task => task.completed && task.completedAt && isValid(new Date(task.completedAt!)))
        .map(task => ({
            id: `task-${task.id}`,
            iconName: 'ListChecks',
            text: `Completed: ${task.text}`,
            time: formatDistanceToNow(new Date(task.completedAt!), { addSuffix: true }),
            timestamp: new Date(task.completedAt!).getTime()
        }));

    const sessionActivities: ActivityItem[] = sessions
        .filter(session => session.endTime && isValid(new Date(session.endTime)))
        .map(session => ({
            id: `session-${session.id}`,
            iconName: session.mode === 'pomodoro' ? 'Brain' : 'Coffee',
            text: `${session.mode === 'pomodoro' ? 'Focus' : session.mode.includes('Break') ? 'Break' : session.mode} Session - ${Math.round(session.duration / 60)} min`,
            time: formatDistanceToNow(new Date(session.endTime), { addSuffix: true }),
            timestamp: new Date(session.endTime).getTime()
    }));

    const combinedActivities = [...taskActivities, ...sessionActivities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 7);

    const completedGoals = goals.filter(g => {
         const goalTasks = tasks.filter(t => t.goalId === g.id);
         return goalTasks.length > 0 && goalTasks.every(t => t.completed);
    }).length;

    return {
        totalFocusTimeMinutes,
        recentActivities: combinedActivities,
        completedGoals,
    };
  }, [dashboardData]);


  const widgetsConfig: DashboardWidgetConfig[] = useMemo(() => {
      const data = dashboardData || { tasks: [], sessions: [], goals: [], habitLogs: [], decks: [], notes: [] };
      const derived = processedData;

      return [
        { id: 'progressSummary', component: ProgressSummaryWidget, title: "Today's Progress Summary", colSpan: 4 },
        { id: 'focus', component: () => <FocusWidget totalFocusTime={derived.totalFocusTimeMinutes} />, title: "Today's Focus", colSpan: 1 },
        { id: 'flashcards', component: () => <FlashcardsWidget deckCount={data.decks.length} />, title: "Flashcard Decks", colSpan: 1 },
        { id: 'notes', component: () => <NotesWidget noteCount={data.notes.length} />, title: "Notes Created", colSpan: 1 },
        { id: 'goals', component: () => <GoalsWidget goalCount={data.goals.length} completedGoals={derived.completedGoals} />, title: "Goals Progress", colSpan: 1 },
        { id: 'heatmap', component: () => <HeatmapWidget habitLogs={data.habitLogs} />, title: "Study/Habit Heatmap", colSpan: 2 },
        { id: 'timeDistribution', component: () => <TimeDistributionWidget sessions={data.sessions} />, title: "Time Distribution", colSpan: 2 },
        { id: 'recentActivity', component: () => <RecentActivityWidget recentActivities={derived.recentActivities} />, title: "Recent Activity", colSpan: 4 },
      ];
  }, [dashboardData, processedData]);


   if (authLoading || isPageLoading) {
        return (
           <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
               <span className="ml-2 text-muted-foreground">Loading Dashboard...</span>
           </div>
        );
   }

   if (!userId && !authLoading) {
        return <div className="text-muted-foreground p-4 text-center">Please log in to view the dashboard.</div>;
   }

  return (
    <div className="panel-slide-fade-in space-y-8">
      <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
       {isAdmin && <AdminDataView />} {/* Render AdminDataView if user is admin */}
      <DashboardLayout
        initialWidgets={widgetsConfig}
        // storageKey for dnd-kit order can still use userId for localStorage, or be removed if order not persisted locally
        storageKey={`dashboardLayout_${userId || 'guest'}`} 
        className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      />
    </div>
  );
}


    