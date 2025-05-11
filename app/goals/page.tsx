
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent, useMemo, memo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Plus, Trash2, Edit, X, Check as CheckIcon, Wand2, Loader2, Calendar as CalendarIcon } from 'lucide-react'; // Removed CheckCircle, Circle, ListChecks
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Goal, Task } from '@/types';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { breakDownGoalIntoTasks } from '@/ai/flows/goal-breakdown-flow';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from "@/components/ui/label";
// import { useAuth } from '@/hooks/use-auth'; // Remove duplicate import
import { loadUserData, saveUserData } from '@/lib/local-storage';

const GOALS_SUFFIX = 'goals';
const TASKS_SUFFIX = 'tasks';

// Helper: Convert date strings in an array of objects to Date objects
const parseDatesInArray = <T extends { [key: string]: any }>(items: T[], dateFields: (keyof T)[]): T[] => {
    return items.map(item => {
        const newItem = { ...item };
        dateFields.forEach(field => {
            if (newItem[field] && typeof newItem[field] === 'string') {
                const date = parseISO(newItem[field]);
                newItem[field] = isValid(date) ? date : null; // Set to null if invalid
            } else if (newItem[field] && typeof newItem[field] === 'number') { // Handle timestamps
                 newItem[field] = new Date(newItem[field]);
            } else if (!newItem[field]) { // Ensure null if originally null/undefined
                newItem[field] = null;
            }
        });
        return newItem;
    });
};


const getGoalProgress = (goalId: string, tasks: Task[]): number => {
  const relevantTasks = tasks.filter(task => task.goalId === goalId);
  if (relevantTasks.length === 0) return 0;
  const completedTasks = relevantTasks.filter(task => task.completed);
  return Math.round((completedTasks.length / relevantTasks.length) * 100);
};

const GoalItem = memo(({ goal, progress, onSelect, onDelete, onEdit, isSelected, isSaving }: {
    goal: Goal; progress: number; onSelect: (goal: Goal) => void;
    onDelete: (id: string, name: string) => void; onEdit: (goal: Goal) => void;
    isSelected: boolean; isSaving: boolean;
}) => {
    const targetDate = goal.targetDate && isValid(new Date(goal.targetDate)) ? new Date(goal.targetDate) : null;
    return (
    <Card className={cn("glassmorphism hover-glow cursor-pointer", isSelected && "ring-2 ring-primary", isSaving && "opacity-70")} onClick={() => !isSaving && onSelect(goal)}>
        <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-primary truncate">{goal.name}</CardTitle>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); !isSaving && onEdit(goal); }} disabled={isSaving}><Edit className="w-4 h-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => e.stopPropagation()} disabled={isSaving}><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{goal.name}"?</AlertDialogTitle><AlertDialogDescription>This unlinks tasks but doesn't delete them.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(goal.id, goal.name)} className="bg-destructive" disabled={isSaving}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
             <span className={`text-xs px-2 py-0.5 rounded-full ${goal.type === 'long-term' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{goal.type === 'long-term' ? 'Long-Term' : 'Short-Term'}</span>
        </CardHeader>
        <CardContent className="pb-4 pt-2">
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{goal.description || 'No description.'}</p>
            <div className="flex justify-between items-center text-xs mb-1"><span className="text-muted-foreground">Progress</span><span>{progress}%</span></div>
            <Progress value={progress} className="h-2" />
        </CardContent>
         {targetDate && <CardFooter className="pt-0 pb-3 text-xs text-muted-foreground"><CalendarIcon className="w-3 h-3 mr-1"/> Target: {format(targetDate, 'PP')}</CardFooter>}
    </Card>
)});
GoalItem.displayName = 'GoalItem';

const TaskSubItem = memo(({ task, onToggle, isSaving }: { task: Task, onToggle: (taskId: string, currentState: boolean) => void, isSaving: boolean }) => {
    const dueDate = task.dueDate && isValid(new Date(task.dueDate)) ? new Date(task.dueDate) : null;
    return (
    <div className={cn("flex items-center gap-2 p-2 bg-secondary/40 rounded hover:bg-secondary/60", isSaving && "opacity-70")}>
        <Checkbox id={`task-sub-${task.id}`} checked={task.completed} onCheckedChange={() => !isSaving && onToggle(task.id, task.completed)} disabled={isSaving} className="h-4 w-4"/>
        <label htmlFor={`task-sub-${task.id}`} className={cn("text-sm flex-1 truncate", task.completed && "text-muted-foreground line-through", isSaving ? "cursor-default" : "cursor-pointer")}>{task.text}</label>
        {dueDate && <span className="text-xs text-muted-foreground flex-shrink-0">{format(dueDate, 'MMM d')}</span>}
    </div>
)});
TaskSubItem.displayName = 'TaskSubItem';


export default function GoalsPage() {
  const { userId, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editGoalData, setEditGoalData] = useState<Partial<Goal>>({});
  const [newTaskText, setNewTaskText] = useState('');
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // General saving state for modal
  const [savingItemId, setSavingItemId] = useState<string | null>(null); // For individual item operations

  const { toast } = useToast();

  useEffect(() => {
      const loadData = () => {
          if (!authLoading && userId && !hasFetched) {
              setIsPageLoading(true);
              try {
                  const loadedGoals = loadUserData<Goal[]>(userId, GOALS_SUFFIX) || [];
                  setGoals(parseDatesInArray(loadedGoals, ['createdAt', 'updatedAt', 'targetDate']));
                  const loadedTasks = loadUserData<Task[]>(userId, TASKS_SUFFIX) || [];
                  setTasks(parseDatesInArray(loadedTasks, ['createdAt', 'updatedAt', 'dueDate', 'completedAt']));
                  setHasFetched(true);
              } catch (error) { toast({ title: "Error Loading Data", variant: "destructive" });
              } finally { setIsPageLoading(false); }
          } else if (!authLoading && !userId) {
              setGoals([]); setTasks([]); setSelectedGoal(null); setHasFetched(false); setIsPageLoading(false);
          } else if (hasFetched) { setIsPageLoading(false); }
      };
      loadData();
  }, [userId, authLoading, hasFetched, toast]);

  const saveGoalsToStorage = useCallback((updatedGoals: Goal[]) => {
      if (!userId) return;
      const goalsToSave = updatedGoals.map(g => ({ ...g, createdAt: new Date(g.createdAt).toISOString(), updatedAt: new Date(g.updatedAt).toISOString(), targetDate: g.targetDate ? new Date(g.targetDate).toISOString() : null }));
      saveUserData(userId, GOALS_SUFFIX, goalsToSave);
      setGoals(updatedGoals.sort((a,b)=>new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [userId]);
  const saveTasksToStorage = useCallback((updatedTasks: Task[]) => {
      if (!userId) return;
      const tasksToSave = updatedTasks.map(t => ({ ...t, createdAt: new Date(t.createdAt).toISOString(), updatedAt: new Date(t.updatedAt).toISOString(), dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined, completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined }));
      saveUserData(userId, TASKS_SUFFIX, tasksToSave);
      setTasks(updatedTasks.sort((a,b)=>new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [userId]);

  const handleAddOrUpdateGoal = async () => {
    if (!userId || !editGoalData.name?.trim()) { toast({ title: "Name Required", variant: "destructive" }); return; }
    setIsSaving(true);
    const now = new Date();
    try {
        let savedGoal: Goal;
        if (isEditingGoal && editGoalData.id) {
           savedGoal = { ...goals.find(g => g.id === editGoalData.id)!, ...editGoalData, name: editGoalData.name.trim(), description: editGoalData.description?.trim() || null, type: editGoalData.type || 'short-term', targetDate: editGoalData.targetDate || null, updatedAt: now };
           saveGoalsToStorage(goals.map(g => g.id === savedGoal.id ? savedGoal : g));
           toast({ title: "Goal Updated" });
        } else {
           savedGoal = { id: `goal_${Date.now()}`, name: editGoalData.name.trim(), description: editGoalData.description?.trim() || null, type: editGoalData.type || 'short-term', targetDate: editGoalData.targetDate || null, userId, createdAt: now, updatedAt: now };
            saveGoalsToStorage([...goals, savedGoal]);
            toast({ title: "Goal Added" });
        }
        if (selectedGoal?.id === savedGoal.id) setSelectedGoal(savedGoal);
        resetEditState();
    } finally { setIsSaving(false); }
  };

  const handleDeleteGoal = useCallback(async (id: string, name: string) => {
    if (!userId) return;
    setSavingItemId(id);
    try {
        saveGoalsToStorage(goals.filter(goal => goal.id !== id));
        saveTasksToStorage(tasks.map(task => task.goalId === id ? { ...task, goalId: undefined, updatedAt: new Date() } : task));
        if (selectedGoal?.id === id) setSelectedGoal(null);
        toast({ title: "Goal Deleted" });
    } finally { setSavingItemId(null); }
  }, [goals, tasks, selectedGoal, userId, saveGoalsToStorage, saveTasksToStorage, toast]);

  const handleAddTaskToGoal = async (event?: FormEvent) => {
      if (event) event.preventDefault();
      if (!userId || !selectedGoal || !newTaskText.trim()) return;
      setSavingItemId('new_task_for_' + selectedGoal.id);
      const now = new Date();
      const newTask: Task = { id: `task_${Date.now()}`, text: newTaskText.trim(), goalId: selectedGoal.id, userId, completed: false, createdAt: now, updatedAt: now };
      try {
          saveTasksToStorage([...tasks, newTask]);
          setNewTaskText(''); toast({ title: "Task Added" });
      } finally { setSavingItemId(null); }
  };

   const handleToggleSubTask = useCallback(async (taskId: string, currentCompletedState: boolean) => {
       if (!userId) return;
       setSavingItemId(taskId);
       try {
           saveTasksToStorage(tasks.map(task => task.id === taskId ? { ...task, completed: !currentCompletedState, completedAt: !currentCompletedState ? new Date() : undefined, updatedAt: new Date() } : task ));
       } finally { setSavingItemId(null); }
   }, [userId, tasks, saveTasksToStorage]);

  const handleAiBreakdown = async () => {
      if (!selectedGoal || isBreakingDown || !userId) return;
      setIsBreakingDown(true); toast({ title: "AI Working..." });
      try {
          const result = await breakDownGoalIntoTasks({ goalName: selectedGoal.name, goalDescription: selectedGoal.description ?? undefined });
          if (result?.tasks?.length > 0) {
              const now = new Date();
              const newAiTasks: Task[] = result.tasks.map(text => ({ id: `task_ai_${Date.now()}_${Math.random().toString(16).slice(2)}`, text, goalId: selectedGoal.id, userId, completed: false, createdAt: now, updatedAt: now }));
              setSavingItemId('ai_batch_save');
              saveTasksToStorage([...tasks, ...newAiTasks]);
              setSavingItemId(null);
              toast({ title: "AI Tasks Added", description: `${newAiTasks.length} tasks added.` });
          } else toast({ title: "AI Suggestion", description: "AI couldn't suggest tasks.", variant: "default" });
      } catch (error: any) { toast({ title: "AI Error", description: error.message, variant: "destructive" });
      } finally { setIsBreakingDown(false); setSavingItemId(null); }
  };

  const handleOpenAddModal = () => { setEditGoalData({ type: 'short-term' }); setIsAddingGoal(true); setIsEditingGoal(false); };
  const handleOpenEditModal = (goal: Goal) => { setEditGoalData({ ...goal, targetDate: goal.targetDate ? new Date(goal.targetDate) : null }); setIsAddingGoal(false); setIsEditingGoal(true); };
  const resetEditState = () => { setIsAddingGoal(false); setIsEditingGoal(false); setEditGoalData({}); };
  const handleEditInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditGoalData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleEditSelectChange = (name: keyof Goal, value: string) => setEditGoalData(prev => ({ ...prev, [name]: value }));
  const handleEditDateChange = (date: Date | undefined) => setEditGoalData(prev => ({ ...prev, targetDate: date || null }));

  const selectedGoalTasks = useMemo(() => selectedGoal ? tasks.filter(task => task.goalId === selectedGoal.id).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [], [selectedGoal, tasks]);
  const selectedGoalProgress = useMemo(() => selectedGoal ? getGoalProgress(selectedGoal.id, tasks) : 0, [selectedGoal, tasks]);

  if (authLoading || isPageLoading) return (<div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="animate-spin text-primary" /><span className="ml-2">Loading...</span></div>);
  if (!userId) return (<div className="p-4 text-center">Please log in.</div>);

  const isEditModalOpen = isAddingGoal || isEditingGoal;
  const editModalTitle = isAddingGoal ? "Add New Goal" : "Edit Goal";

  return (
    <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-8">
        <div className="flex flex-col gap-6 lg:w-1/3 h-full">
            <div className="flex justify-between items-center"><h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Target/> Goals</h1><Button onClick={handleOpenAddModal} disabled={isSaving}><Plus /> Add Goal</Button></div>
            <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-xl text-primary">Your Goals</CardTitle>{(isSaving || savingItemId) && <Loader2 className="animate-spin text-primary" />}</CardHeader>
                <CardContent className="flex-1 p-0"><ScrollArea className="h-full p-4">
                        {goals.length === 0 ? (<p className="text-center mt-4">No goals yet.</p>) : (<div className="space-y-4">{goals.map(goal => (<GoalItem key={goal.id} goal={goal} progress={getGoalProgress(goal.id, tasks)} onSelect={setSelectedGoal} onDelete={handleDeleteGoal} onEdit={handleOpenEditModal} isSelected={selectedGoal?.id === goal.id} isSaving={savingItemId === goal.id}/>))}</div>)}
                </ScrollArea></CardContent>
            </Card>
        </div>
        <div className="flex flex-col gap-6 lg:w-2/3 h-full">
            <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
                <CardHeader><CardTitle className="text-xl text-primary truncate">{selectedGoal ? `Details: ${selectedGoal.name}` : "Select a Goal"}</CardTitle>{selectedGoal && (<p className="text-sm text-muted-foreground pt-1 line-clamp-3">{selectedGoal.description || 'No description.'}</p>)}</CardHeader>
                <CardContent className="flex-1 p-0"><ScrollArea className="h-full p-4">
                        {!selectedGoal ? (<p className="text-center mt-8">Select a goal to see details.</p>) : (<div className="space-y-6">
                                <div><div className="flex justify-between items-center text-sm mb-1"><span className="text-muted-foreground">Overall Progress</span><span className="font-semibold text-primary">{selectedGoalProgress}%</span></div><Progress value={selectedGoalProgress} className="h-3" />{selectedGoal.targetDate && (<p className="text-xs text-muted-foreground mt-2 text-right">Target: {format(new Date(selectedGoal.targetDate), 'PP')}</p>)}</div>
                                <div><h3 className="text-lg font-semibold text-primary mb-3 flex justify-between items-center"><span>Tasks</span><Button variant="outline" size="sm" onClick={handleAiBreakdown} disabled={isBreakingDown || !!savingItemId}><Wand2 className="mr-1"/>AI Breakdown</Button></h3>
                                    {selectedGoalTasks.length === 0 ? (<p className="text-sm text-center py-4">No tasks for this goal.</p>) : (<div className="space-y-2">{selectedGoalTasks.map(task => (<TaskSubItem key={task.id} task={task} onToggle={handleToggleSubTask} isSaving={savingItemId === task.id || savingItemId === 'ai_batch_save'} />))}</div>)}
                                    <form onSubmit={handleAddTask} className="mt-4 flex gap-2 items-center">
                                        <Input placeholder="Add new task..." value={newTaskText} onChange={e => setNewTaskText(e.target.value)} className="h-9" disabled={!!savingItemId} />
                                        <Button type="submit" size="sm" disabled={!newTaskText.trim() || !!savingItemId}>{savingItemId === `new_task_for_${selectedGoal.id}` ? <Loader2 className="animate-spin mr-1" /> : <Plus className="mr-1" />}Add</Button>
                                    </form></div></div>)}
                </ScrollArea></CardContent>
            </Card>
        </div>
        <AlertDialog open={isEditModalOpen} onOpenChange={open => !open && resetEditState()}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{editModalTitle}</AlertDialogTitle><AlertDialogDescription>Define goal details. Short-term: weeks/months. Long-term: longer periods.</AlertDialogDescription></AlertDialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Name</Label><Input id="name" name="name" value={editGoalData.name || ''} onChange={handleEditInputChange} className="col-span-3" required disabled={isSaving} /></div>
                     <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="description" className="text-right">Description</Label><Textarea id="description" name="description" value={editGoalData.description || ''} onChange={handleEditInputChange} className="col-span-3" placeholder="(Optional)" disabled={isSaving}/></div>
                     <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="type" className="text-right">Type</Label>
                         <Select value={editGoalData.type || 'short-term'} onValueChange={value => handleEditSelectChange('type', value as 'short-term'|'long-term')} name="type" disabled={isSaving}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="short-term">Short-Term</SelectItem><SelectItem value="long-term">Long-Term</SelectItem></SelectContent>
                        </Select></div>
                     <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="targetDate" className="text-right">Target Date</Label>
                         <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("col-span-3 justify-start", !editGoalData.targetDate && "text-muted-foreground")} disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{editGoalData.targetDate ? format(new Date(editGoalData.targetDate), "PPP") : <span>Pick date (Optional)</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editGoalData.targetDate ? new Date(editGoalData.targetDate) : undefined} onSelect={handleEditDateChange} initialFocus /></PopoverContent></Popover></div>
                </div>
                <AlertDialogFooter><AlertDialogCancel onClick={resetEditState} disabled={isSaving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleAddOrUpdateGoal} disabled={isSaving || !editGoalData.name?.trim()}>{isSaving ? <Loader2 className="animate-spin mr-1" /> : (isAddingGoal ? 'Add Goal' : 'Save Changes')}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
    