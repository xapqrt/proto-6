
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Corrected import path
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Coffee, Brain, History, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Task, TimerSession } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { loadUserData, saveUserData } from '@/lib/local-storage';

const TASKS_SUFFIX = 'tasks';
const SESSIONS_SUFFIX = 'timerSessions';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';
const WORK_DURATION = 25 * 60; const SHORT_BREAK_DURATION = 5 * 60; const LONG_BREAK_DURATION = 15 * 60;
const SESSIONS_BEFORE_LONG_BREAK = 4;

// Helper: Convert date strings in an array of objects to Date objects
const parseDatesInArray = <T extends { [key: string]: any }>(items: T[], dateFields: (keyof T)[]): T[] => {
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
            } else if (newItem[field] && typeof newItem[field] === 'number') {
                newItem[field] = new Date(newItem[field]);
            }
        });
        return newItem;
    });
};


export default function TimerPage() {
  const { userId, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsClient(true);
     const loadData = () => {
         if (!authLoading && userId && !hasFetched) {
             setIsPageLoading(true);
             try {
                 const loadedTasks = loadUserData<Task[]>(userId, TASKS_SUFFIX) || [];
                 setTasks(parseDatesInArray(loadedTasks.filter(t => !t.completed), ['createdAt', 'updatedAt', 'dueDate', 'completedAt']));
                 const loadedSessions = loadUserData<TimerSession[]>(userId, SESSIONS_SUFFIX) || [];
                 setSessions(parseDatesInArray(loadedSessions, ['startTime', 'endTime']).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0,50));
                 setHasFetched(true);
             } catch (error) { toast({ title: "Error Loading Data", variant: "destructive" });
             } finally { setIsPageLoading(false); }
         } else if (!authLoading && !userId) {
             setTasks([]); setSessions([]); setHasFetched(false); setIsPageLoading(false);
         } else if (hasFetched) { setIsPageLoading(false); }
     };
     loadData();
     if (typeof window !== 'undefined' && !audioRef.current) {
         try { audioRef.current = new Audio("/sounds/beep.wav"); audioRef.current.load(); }
         catch (error) { console.error("Failed to load audio:", error); }
     }
  }, [userId, authLoading, hasFetched, toast]);

    const saveSessionsToStorage = useCallback((updatedSessions: TimerSession[]) => {
       if (!userId) return;
       const sessionsToSave = updatedSessions
           .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
           .slice(0, 50)
           .map(s => ({ ...s, startTime: new Date(s.startTime).toISOString(), endTime: new Date(s.endTime).toISOString() }));
       saveUserData(userId, SESSIONS_SUFFIX, sessionsToSave);
       setSessions(updatedSessions.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).slice(0,50));
   }, [userId]);

   const playSound = useCallback(() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(console.warn); }}, []);
   const logSession = useCallback(async (endedMode: TimerMode, startTime: number) => {
       if (!userId || !startTime || Date.now() - startTime <= 0) { setCurrentSessionStart(null); return; }
        setIsSaving(true);
        const newSession: TimerSession = {
            id: `session_${startTime}`, startTime: new Date(startTime), endTime: new Date(),
            duration: Math.round((Date.now() - startTime) / 1000), mode: endedMode,
            associatedTaskId: endedMode === 'pomodoro' ? selectedTaskId : undefined, userId,
        };
        try { saveSessionsToStorage([newSession, ...sessions]);
        } finally { setCurrentSessionStart(null); setIsSaving(false); }
   }, [userId, selectedTaskId, sessions, saveSessionsToStorage]);

    const getDuration = useCallback((currentMode: TimerMode): number => currentMode === 'pomodoro' ? WORK_DURATION : currentMode === 'shortBreak' ? SHORT_BREAK_DURATION : LONG_BREAK_DURATION, []);

    const switchMode = useCallback(async (newMode: TimerMode) => {
        if (isActive && currentSessionStart) await logSession(mode, currentSessionStart);
        setIsActive(false); setMode(newMode); setCurrentSessionStart(null); setTimeLeft(getDuration(newMode));
    }, [isActive, currentSessionStart, mode, logSession, getDuration]);

   const handleTimerEnd = useCallback(async () => {
     playSound();
     const endedMode = mode;
     if (currentSessionStart) await logSession(endedMode, currentSessionStart);
     let nextMode: TimerMode; let toastTitle = ""; let toastDescription = "";
     if (endedMode === 'pomodoro') {
       const newSessCount = sessionCount + 1; setSessionCount(newSessCount);
       if (newSessCount % SESSIONS_BEFORE_LONG_BREAK === 0) { nextMode = 'longBreak'; toastTitle = "Long Break!"; toastDescription = `Time for a ${LONG_BREAK_DURATION/60}-min break.`; }
       else { nextMode = 'shortBreak'; toastTitle = "Short Break!"; toastDescription = `Take ${SHORT_BREAK_DURATION/60}-min.`; }
     } else { nextMode = 'pomodoro'; toastTitle = "Back to Work!"; toastDescription = `Starting ${WORK_DURATION/60}-min focus.`; }
     toast({ title: toastTitle, description: toastDescription });
     setIsActive(false); setMode(nextMode); setTimeLeft(getDuration(nextMode)); setCurrentSessionStart(null);
   }, [mode, sessionCount, toast, playSound, logSession, currentSessionStart, getDuration]);

  useEffect(() => {
    if (isActive && isClient) {
      if (!currentSessionStart) setCurrentSessionStart(Date.now());
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => { if (prev <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); handleTimerEnd(); return 0; } return prev - 1; });
      }, 1000);
    } else if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, isClient, currentSessionStart, handleTimerEnd]);

   const toggleTimer = useCallback(() => {
       const nextIsActive = !isActive; setIsActive(nextIsActive);
       if (nextIsActive && !currentSessionStart) setCurrentSessionStart(Date.now());
       else if (!nextIsActive && currentSessionStart) setCurrentSessionStart(null); // Reset on pause
   }, [isActive, currentSessionStart]);

   const resetTimer = useCallback(async () => {
       if (isActive && currentSessionStart) await logSession(mode, currentSessionStart);
       setIsActive(false); setTimeLeft(getDuration(mode)); setCurrentSessionStart(null);
   }, [isActive, currentSessionStart, mode, logSession, getDuration]); 
   
  const handleTaskSelection = (taskId: string) => setSelectedTaskId(taskId === 'none' ? undefined : taskId);
  const formatTime = (s: number): string => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const progressPercentage = useMemo(() => (getDuration(mode) - timeLeft) / getDuration(mode) * 100, [mode, timeLeft, getDuration]); 

    if (authLoading || isPageLoading) {
        return (<div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="animate-spin text-primary" /><span className="ml-2">Loading...</span></div>);
    }
    if (!userId) {
        return (<div className="p-4 text-center">Please log in.</div>);
    }

  return (
      <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col lg:flex-row items-start justify-center gap-8 p-4">
       <Card className="glassmorphism w-full max-w-md text-center flex-shrink-0">
            <CardHeader className="flex flex-row justify-center gap-2 border-b pb-4">
                 <Button variant={mode==='pomodoro'?'default':'ghost'} onClick={()=>switchMode('pomodoro')} disabled={isSaving}><Brain /> Focus</Button>
                 <Button variant={mode==='shortBreak'?'default':'ghost'} onClick={()=>switchMode('shortBreak')} disabled={isSaving}><Coffee /> Short Break</Button>
                 <Button variant={mode==='longBreak'?'default':'ghost'} onClick={()=>switchMode('longBreak')} disabled={isSaving}><Coffee /> Long Break</Button>
            </CardHeader>
            <CardContent className="py-10 space-y-6">
              <div className="text-8xl font-bold text-primary tabular-nums">
                {formatTime(timeLeft)}
              </div>
              <Progress value={progressPercentage} className="h-3" />
             {mode === 'pomodoro' && <p className="text-muted-foreground">Session {sessionCount % SESSIONS_BEFORE_LONG_BREAK + 1}/{SESSIONS_BEFORE_LONG_BREAK}</p>}
             {mode === 'pomodoro' && (
                <Select onValueChange={handleTaskSelection} value={selectedTaskId ?? 'none'} disabled={isActive || isSaving}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Link to a task..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific task</SelectItem>
                    {tasks.map(t=>(
                      <SelectItem key={t.id} value={t.id}>{t.text}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             )}
            </CardContent>
            <CardFooter className="flex justify-center gap-4 border-t pt-6">
             <Button onClick={toggleTimer} variant={isActive?'outline':'default'} size="lg" className="hover-glow" disabled={isSaving}>
               {isActive? <Pause /> : <Play /> } {isActive? 'Pause' : 'Start'}
             </Button>
             <Button onClick={resetTimer} variant="ghost" size="lg" disabled={isSaving || isActive}><RotateCcw /></Button>
            </CardFooter>
        </Card>
        <Card className="glassmorphism w-full lg:w-2/5 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-xl text-primary flex items-center gap-2"><History/> Session History</CardTitle>
            {isSaving && <Loader2 className="animate-spin text-primary" />}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4">
              {sessions.length === 0 ? (<p className="text-center text-muted-foreground mt-4">No sessions yet.</p>) : (
                <div className="space-y-3">
                {sessions.map(s => { const task = tasks.find(t=>t.id===s.associatedTaskId); const endTime = new Date(s.endTime);
                                return (
                                    <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                                        <div className="flex-1">
                                            <span className="font-medium">{formatTime(s.duration)} - {s.mode}</span>
                                            {task && s.mode==='pomodoro' && <p className="text-xs text-muted-foreground truncate">Task: {task.text}</p>}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{isValid(endTime) ? formatDistanceToNow(endTime,{addSuffix:true}) : 'Unknown'}</span>
                                    </div>
                                )})}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t pt-3">Last {sessions.length} sessions.</CardFooter>
       </Card>
    </div>
  );
}

