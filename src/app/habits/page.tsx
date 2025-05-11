'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent, useMemo, memo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Trash2, Plus, Flame, Edit, X, Check as CheckIcon, Loader2 } from 'lucide-react'; // Removed CalendarDays, CheckCircle
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays, parseISO, startOfDay, isValid } from 'date-fns';
import { Habit, HabitLog } from '@/types';
import { loadUserData, saveUserData } from '@/lib/local-storage';

const HABITS_SUFFIX = 'habits';
const LOGS_SUFFIX = 'habitLogs';

// Helper: Convert date strings in an array of objects to Date objects
const parseDatesInArray = <T extends Record<string, any>>(items: T[], dateFields: (keyof T)[]): T[] => {
    return items.map(item => {
        const newItem = { ...item };
        dateFields.forEach(field => {
            if (newItem[field] && typeof newItem[field] === 'string') {
                const date = parseISO(newItem[field]);
                if (isValid(date)) {
                    newItem[field] = date;
                } else {
                    newItem[field] = new Date(); // Fallback
                }
            } else if (newItem[field] && typeof newItem[field] === 'number') { // Handle timestamps
                newItem[field] = new Date(newItem[field]);
            }
        });
        return newItem;
    });
};


const HabitItem = memo(({ habit, todayLog, streak, onToggle, onEdit, onDelete, isSavingCurrent }: {
    habit: Habit; todayLog?: HabitLog | null; streak: number;
    onToggle: (habitId: string, date: Date, currentCompleted: boolean) => void;
    onEdit: (habit: Habit) => void; onDelete: (id: string, name: string) => void;
    isSavingCurrent: boolean;
}) => {
    const today = startOfDay(new Date());
    const isCompletedToday = todayLog?.completed ?? false;
    return (
        <div className={cn("flex items-center justify-between p-4 bg-secondary/50 rounded-lg group", isSavingCurrent && "opacity-70 pointer-events-none")}>
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <Checkbox id={`habit-${habit.id}`} checked={isCompletedToday} onCheckedChange={() => onToggle(habit.id, today, isCompletedToday)}
                    className={cn("h-6 w-6 rounded-full", isCompletedToday ? 'border-primary bg-primary' : 'border-muted-foreground')} disabled={isSavingCurrent} >
                    {isCompletedToday && <CheckIcon className="w-4 h-4 text-primary-foreground" />}
                </Checkbox>
                <label htmlFor={`habit-${habit.id}`} className={cn("flex-1 font-medium truncate cursor-pointer", isCompletedToday && "line-through text-muted-foreground")}>{habit.name}</label>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {isSavingCurrent && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {streak > 0 && !isSavingCurrent && <div className="flex items-center text-xs text-orange-400 bg-orange-900/50 px-2 py-1 rounded-full"><Flame className="w-3 h-3 mr-1" />{streak}</div>}
                 {!isSavingCurrent && <>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8" onClick={() => onEdit(habit)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 h-8 w-8" onClick={() => onDelete(habit.id, habit.name)}><Trash2 className="w-4 h-4" /></Button>
                 </>}
            </div>
        </div>
    );
});
HabitItem.displayName = 'HabitItem';

const WeeklyHeatmap = memo(({ logs }: { logs: HabitLog[] }) => {
    const today = startOfDay(new Date());
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start, end });
    const logMap = useMemo(() => {
        const map = new Map<string, HabitLog[]>();
        logs.forEach(log => {
             const logDate = log.date && isValid(new Date(log.date)) ? startOfDay(new Date(log.date)) : null;
             if (logDate) {
                 const dateString = format(logDate, 'yyyy-MM-dd');
                 map.set(dateString, [...(map.get(dateString) || []), log]);
             }
        });
        return map;
    }, [logs]);
    const intensityClasses = ["bg-muted/40", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"];
    return (
        <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
            <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-medium text-primary">This Week</h3><span className="text-xs text-muted-foreground">{format(start, 'MMM d')} - {format(end, 'MMM d')}</span></div>
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                    const dayLogs = logMap.get(format(day, 'yyyy-MM-dd')) || [];
                    const completedCount = dayLogs.filter(l => l.completed).length;
                    const intensity = Math.min(5, Math.ceil(completedCount / 1.5)); // Adjusted scaling
                    return (<div key={day.toISOString()} className="flex flex-col items-center gap-1"><span className="text-xs text-muted-foreground">{format(day, 'E')[0]}</span><div title={`${format(day,'PP')}: ${completedCount} completed`} className={cn("w-6 h-6 rounded", day > today ? 'bg-muted/20' : intensityClasses[intensity])}/></div>);
                })}
            </div>
        </div>
    );
});
WeeklyHeatmap.displayName = 'WeeklyHeatmap';

export default function HabitsPage() {
    const { userId, loading: authLoading } = useAuth();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [hasFetched, setHasFetched] = useState(false);
    const [newHabitText, setNewHabitText] = useState('');
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [editText, setEditText] = useState('');
    const [savingHabitId, setSavingHabitId] = useState<string | null>(null); // For individual saving states
    const [isAddingHabit, setIsAddingHabit] = useState(false); // For new habit adding
    const { toast } = useToast();

     useEffect(() => {
       const loadData = () => {
           if (!authLoading && userId && !hasFetched) {
               setIsPageLoading(true);
               try {
                   const loadedHabits = loadUserData<Habit[]>(userId, HABITS_SUFFIX) || [];
                   setHabits(parseDatesInArray(loadedHabits, ['createdAt']));
                   const loadedLogs = loadUserData<HabitLog[]>(userId, LOGS_SUFFIX) || [];
                   setHabitLogs(parseDatesInArray(loadedLogs, ['date']));
                   setHasFetched(true);
               } catch (error) {
                   console.error("Error loading habits data:", error);
                   toast({ title: "Error Loading Data", variant: "destructive" });
               } finally { setIsPageLoading(false); }
           } else if (!authLoading && !userId) {
               setHabits([]); setHabitLogs([]); setHasFetched(false); setIsPageLoading(false);
           } else if (hasFetched) { setIsPageLoading(false); }
       };
       loadData();
   }, [userId, authLoading, hasFetched, toast]);

   const saveHabitsToStorage = useCallback((updatedHabits: Habit[]) => {
        if (!userId) return;
        const habitsToSave = updatedHabits.map(h => ({ ...h, createdAt: new Date(h.createdAt).toISOString() }));
        saveUserData(userId, HABITS_SUFFIX, habitsToSave);
        setHabits(updatedHabits.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
   }, [userId]);
   const saveLogsToStorage = useCallback((updatedLogs: HabitLog[]) => {
        if (!userId) return;
        const logsToSave = updatedLogs.map(l => ({ ...l, date: startOfDay(new Date(l.date)).toISOString() }));
        saveUserData(userId, LOGS_SUFFIX, logsToSave);
        setHabitLogs(updatedLogs);
   }, [userId]);

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setNewHabitText(event.target.value), []);
    const handleAddHabit = useCallback(async (event?: FormEvent) => {
      if (event) event.preventDefault();
      if (!userId || !newHabitText.trim()) return;
      setIsAddingHabit(true);
      const newHabit: Habit = { id: `habit_${Date.now()}`, name: newHabitText.trim(), userId, createdAt: new Date() };
      try {
            saveHabitsToStorage([...habits, newHabit]);
            setNewHabitText(''); toast({ title: "Habit Added" });
      } finally { setIsAddingHabit(false); }
    }, [newHabitText, userId, habits, saveHabitsToStorage, toast]);

    const handleToggleHabit = useCallback(async (habitId: string, date: Date, currentCompletedState: boolean) => {
        if (!userId) return;
        setSavingHabitId(habitId);
        const dateOnly = startOfDay(date);
        const newCompletedState = !currentCompletedState;
        try {
             let updatedLogs: HabitLog[];
             const logIndex = habitLogs.findIndex(log => log.habitId === habitId && isSameDay(startOfDay(new Date(log.date)), dateOnly));
             if (logIndex > -1) {
                  updatedLogs = habitLogs.map((log, i) => i === logIndex ? { ...log, completed: newCompletedState } : log);
             } else {
                  updatedLogs = [...habitLogs, { id: `log_${habitId}_${dateOnly.toISOString()}`, habitId, date: dateOnly, completed: newCompletedState, userId }];
             }
             saveLogsToStorage(updatedLogs);
        } finally { setSavingHabitId(null); }
    }, [userId, habitLogs, saveLogsToStorage]);

    const handleDeleteHabit = useCallback(async (id: string, name: string) => {
         if (!userId || !confirm(`Delete "${name}"? This removes the habit and all its history.`)) return;
         setSavingHabitId(id);
         try {
             saveHabitsToStorage(habits.filter(h => h.id !== id));
             saveLogsToStorage(habitLogs.filter(log => log.habitId !== id));
             toast({ title: "Habit Deleted" });
         } finally { setSavingHabitId(null); }
    }, [userId, habits, habitLogs, saveHabitsToStorage, saveLogsToStorage, toast]);

    const handleStartEdit = useCallback((habit: Habit) => { setEditingHabit(habit); setEditText(habit.name); }, []);
    const handleCancelEdit = useCallback(() => { setEditingHabit(null); setEditText(''); }, []);
    const handleSaveEdit = useCallback(async () => {
          if (!editingHabit || !editText.trim() || !userId || editText.trim() === editingHabit.name) { handleCancelEdit(); return; }
          setSavingHabitId(editingHabit.id);
          try {
              saveHabitsToStorage(habits.map(h => h.id === editingHabit.id ? { ...h, name: editText.trim() } : h));
              toast({ title: "Habit Updated" });
          } finally { handleCancelEdit(); setSavingHabitId(null); }
      }, [editingHabit, editText, userId, habits, saveHabitsToStorage, toast, handleCancelEdit]);
    const handleEditInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setEditText(event.target.value), []);

    const getHabitStreak = useCallback((habitId: string, logs: HabitLog[]): number => {
        const relevantLogs = logs.filter(log => log.habitId === habitId && log.completed)
            .map(log => startOfDay(new Date(log.date)))
            .sort((a, b) => b.getTime() - a.getTime());
        if (relevantLogs.length === 0) return 0;
        let streak = 0; let currentDate = startOfDay(new Date());
        for (let i = 0; i < relevantLogs.length; i++) {
            if (isSameDay(relevantLogs[i], currentDate)) {
                streak++; currentDate = subDays(currentDate, 1);
            } else if (relevantLogs[i] < subDays(currentDate,1)) { // Gap in streak
                break;
            } // If relevantLogs[i] is subDays(currentDate,0) but not today, it means today is missed.
        }
        // If today is not completed but yesterday was, the loop correctly counts yesterday.
        // If today is completed, it's counted.
        // If neither today nor yesterday completed, streak is 0 (or breaks correctly).
         if (!isSameDay(relevantLogs[0], startOfDay(new Date())) && !isSameDay(relevantLogs[0], subDays(startOfDay(new Date()), 1))) {
            return 0; // No streak if not completed today or yesterday.
        }
        return streak;
    }, []);

   const habitsWithLogsAndStreaks = useMemo(() => {
       const today = startOfDay(new Date());
       return habits.map(habit => {
           const logsForHabit = habitLogs.filter(log => log.habitId === habit.id);
           const todayLog = logsForHabit.find(log => isSameDay(startOfDay(new Date(log.date)), today));
           return { ...habit, streak: getHabitStreak(habit.id, logsForHabit), todayLog };
       });
   }, [habits, habitLogs, getHabitStreak]);

    if (authLoading || isPageLoading) return (<div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="animate-spin text-primary" /><span className="ml-2">Loading...</span></div>);
    if (!userId) return (<div className="p-4 text-center">Please log in.</div>);

  return (
    <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col gap-8">
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Activity /> Habit Tracker</h1>
          {(isAddingHabit || savingHabitId) && <Loader2 className="animate-spin text-primary" />}
      </div>
      <Card className="glassmorphism">
        <CardHeader><CardTitle className="text-xl text-primary">Add New Habit</CardTitle></CardHeader>
        <CardContent>
           <form onSubmit={handleAddHabit} className="flex flex-col sm:flex-row items-center gap-4">
                <Input placeholder="e.g., Read, Exercise..." value={newHabitText} onChange={handleInputChange} disabled={isAddingHabit || !!savingHabitId} />
                <Button type="submit" disabled={!newHabitText.trim() || isAddingHabit || !!savingHabitId} className="hover-glow">
                     {isAddingHabit ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />} Add Habit
                </Button>
           </form>
        </CardContent>
      </Card>
      <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
          <CardHeader><CardTitle className="text-xl text-primary">Your Habits</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                {habitsWithLogsAndStreaks.length === 0 ? (<p className="text-center text-muted-foreground mt-4">No habits yet.</p>) : (
                  <div className="space-y-4">
                    {habitsWithLogsAndStreaks.map(hws => (editingHabit?.id === hws.id ? (
                        <div key={hws.id} className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                            <Input value={editText} onChange={handleEditInputChange} autoFocus onKeyDown={e => { if (e.key==='Enter') handleSaveEdit(); if (e.key==='Escape') handleCancelEdit();}} disabled={savingHabitId === hws.id} />
                            <Button onClick={handleSaveEdit} size="icon" className="bg-green-600 h-8 w-8" disabled={savingHabitId === hws.id || !editText.trim() || editText.trim() === editingHabit.name}>{savingHabitId === hws.id ? <Loader2 className="animate-spin"/> : <CheckIcon />}</Button>
                            <Button onClick={handleCancelEdit} variant="ghost" size="icon" className="h-8 w-8" disabled={savingHabitId === hws.id}><X /></Button>
                        </div>) : (<HabitItem key={hws.id} habit={hws} todayLog={hws.todayLog} streak={hws.streak} onToggle={handleToggleHabit} onEdit={handleStartEdit} onDelete={handleDeleteHabit} isSavingCurrent={savingHabitId === hws.id} />)))}
                  </div>)}
              </ScrollArea>
          </CardContent>
      </Card>
       {habitLogs.length > 0 && (<WeeklyHeatmap logs={habitLogs} />)}
    </div>
  );
}

