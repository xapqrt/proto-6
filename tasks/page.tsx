'use client';

import React, { useState, ChangeEvent, FormEvent, useCallback, useMemo, memo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, ListChecks, Loader2, Calendar as CalendarIcon, Edit, X, Check as CheckIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Task } from '@/types';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadUserData, saveUserData } from '@/lib/local-storage';

const TASKS_SUFFIX = 'tasks';

const TaskItem = memo(({
    task, onToggle, onDelete, onEdit, isEditing, editText, onEditInputChange, onSaveEdit, onCancelEdit, isSavingCurrent
}: {
    task: Task, onToggle: (id: string, completed: boolean) => void, onDelete: (id: string) => void,
    onEdit: (task: Task) => void, isEditing: boolean, editText: string,
    onEditInputChange: (e: ChangeEvent<HTMLInputElement>) => void, onSaveEdit: () => void, onCancelEdit: () => void,
    isSavingCurrent: boolean
}) => {
    const dueDate = task.dueDate && isValid(new Date(task.dueDate)) ? new Date(task.dueDate) : null;
    return (
        <div className={cn("flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors group min-h-[58px]", isSavingCurrent && "opacity-70 pointer-events-none")}>
           {isEditing ? (
                <>
                    <Input value={editText} onChange={onEditInputChange} className="flex-1 mr-2 h-9" autoFocus onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }} disabled={isSavingCurrent} />
                    <Button onClick={onSaveEdit} size="icon" className="bg-green-600 hover:bg-green-700 h-8 w-8" disabled={isSavingCurrent || !editText.trim() || editText.trim() === task.text}><CheckIcon /></Button>
                    <Button onClick={onCancelEdit} variant="ghost" size="icon" className="h-8 w-8" disabled={isSavingCurrent}><X /></Button>
                </>
           ) : (
                <>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                         <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => onToggle(task.id, task.completed)} className="flex-shrink-0 h-5 w-5" disabled={isSavingCurrent} />
                         <label htmlFor={`task-${task.id}`} className={cn("flex-1 font-medium truncate cursor-pointer", task.completed && "line-through text-muted-foreground")}>{task.text}</label>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {isSavingCurrent && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        {task.priority && !isSavingCurrent && <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full", task.priority === 'high' && 'bg-red-500/20 text-red-400', task.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400', task.priority === 'low' && 'bg-blue-500/20 text-blue-400')}>{task.priority[0].toUpperCase()}</span>}
                         {dueDate && !isSavingCurrent && <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{format(dueDate, 'MMM d')}</span>}
                        {!isSavingCurrent && <>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => onEdit(task)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => onDelete(task.id)}><Trash2 className="w-4 h-4" /></Button>
                        </>}
                    </div>
               </>
            )}
        </div>
    );
});
TaskItem.displayName = 'TaskItem';

export default function TasksPage() {
  const { userId, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editText, setEditText] = useState('');
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null); // For individual task saving states
  const [isAddingTask, setIsAddingTask] = useState(false); // For new task adding state

  const { toast } = useToast();

   useEffect(() => {
       const fetchTasks = () => {
           if (!authLoading && userId && !hasFetched) {
               setIsPageLoading(true);
               try {
                   const loadedTasks = loadUserData<Task[]>(userId, TASKS_SUFFIX) || [];
                   const tasksWithDates = loadedTasks.map(t => ({
                       ...t,
                       createdAt: t.createdAt ? parseISO(t.createdAt) : new Date(),
                       updatedAt: t.updatedAt ? parseISO(t.updatedAt) : new Date(),
                       dueDate: t.dueDate ? parseISO(t.dueDate) : undefined,
                       completedAt: t.completedAt ? parseISO(t.completedAt) : undefined,
                   }));
                   setTasks(tasksWithDates.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
                   setHasFetched(true);
               } catch (error) {
                   console.error("Error loading tasks:", error);
                   toast({ title: "Error Loading Tasks", variant: "destructive" });
               } finally {
                   setIsPageLoading(false);
               }
           } else if (!authLoading && !userId) {
               setTasks([]); setHasFetched(false); setIsPageLoading(false);
           } else if (hasFetched) {
               setIsPageLoading(false);
           }
       };
       fetchTasks();
   }, [userId, authLoading, hasFetched, toast]);

   const saveTasksToStorage = useCallback((updatedTasks: Task[]) => {
       if (!userId) return;
       const tasksToSave = updatedTasks.map(t => ({
           ...t,
           createdAt: new Date(t.createdAt).toISOString(),
           updatedAt: new Date(t.updatedAt).toISOString(),
           dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined,
           completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
       }));
       saveUserData(userId, TASKS_SUFFIX, tasksToSave);
       setTasks(updatedTasks.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
   }, [userId]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setNewTaskText(event.target.value), []);
  const handleAddTask = useCallback(async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (!userId || !newTaskText.trim()) return;
    setIsAddingTask(true);
    const newTask: Task = {
        id: `task_${Date.now()}`, text: newTaskText.trim(), dueDate: newTaskDueDate, priority: newTaskPriority,
        userId, completed: false, createdAt: new Date(), updatedAt: new Date(),
    };
    try {
        saveTasksToStorage([...tasks, newTask]);
        setNewTaskText(''); setNewTaskDueDate(undefined); setNewTaskPriority(undefined);
        toast({ title: "Task Added" });
    } finally { setIsAddingTask(false); }
  }, [newTaskText, newTaskDueDate, newTaskPriority, userId, tasks, saveTasksToStorage, toast]);

  const handleToggleTask = useCallback(async (id: string, currentCompletedState: boolean) => {
    if (!userId) return;
    setSavingTaskId(id);
    const newCompletedState = !currentCompletedState;
    try {
         const updatedTasks = tasks.map(task =>
            task.id === id ? { ...task, completed: newCompletedState, completedAt: newCompletedState ? new Date() : undefined, updatedAt: new Date() } : task
         );
         saveTasksToStorage(updatedTasks);
    } finally { setSavingTaskId(null); }
  }, [userId, tasks, saveTasksToStorage]);

  const handleDeleteTask = useCallback(async (id: string) => {
     if (!userId) return;
     setSavingTaskId(id);
     const taskToDelete = tasks.find(t => t.id === id);
     if (!taskToDelete) { setSavingTaskId(null); return; }
     try {
          saveTasksToStorage(tasks.filter(task => task.id !== id));
          toast({ title: "Task Deleted" });
     } finally { setSavingTaskId(null); }
  }, [userId, tasks, saveTasksToStorage, toast]);

   const handleStartEdit = useCallback((task: Task) => { setEditingTask(task); setEditText(task.text); }, []);
    const handleCancelEdit = useCallback(() => { setEditingTask(null); setEditText(''); }, []);
    const handleSaveEdit = useCallback(async () => {
        if (!editingTask || !editText.trim() || !userId || editText.trim() === editingTask.text) { handleCancelEdit(); return; }
        setSavingTaskId(editingTask.id);
        try {
            const updatedTasks = tasks.map(task =>
                task.id === editingTask.id ? { ...task, text: editText.trim(), updatedAt: new Date() } : task
            );
            saveTasksToStorage(updatedTasks);
            toast({ title: "Task Updated" });
        } finally { handleCancelEdit(); setSavingTaskId(null); }
    }, [editingTask, editText, userId, tasks, saveTasksToStorage, toast, handleCancelEdit]);

    const handleEditInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setEditText(event.target.value), []);
    const handlePriorityChange = (value: string) => setNewTaskPriority(value === 'none' ? undefined : value as 'low'|'medium'|'high');
    const handleDateSelect = (date: Date | undefined) => setNewTaskDueDate(date ? startOfDay(date) : undefined);

   const incompleteTasks = useMemo(() => tasks.filter(task => !task.completed), [tasks]);
   const completedTasks = useMemo(() => tasks.filter(task => task.completed).sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()), [tasks]);

   if (authLoading || isPageLoading) return (<div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="animate-spin text-primary" /><span className="ml-2">Loading...</span></div>);
   if (!userId) return (<div className="p-4 text-center">Please log in.</div>);

  return (
    <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><ListChecks /> Task Manager</h1>
         {(isAddingTask || savingTaskId) && <Loader2 className="animate-spin text-primary" />}
      </div>
      <Card className="glassmorphism">
        <CardHeader><CardTitle className="text-xl text-primary">Add New Task</CardTitle></CardHeader>
        <CardContent>
           <form onSubmit={handleAddTask} className="flex flex-col gap-4">
                <Input placeholder="What needs to be done?" value={newTaskText} onChange={handleInputChange} disabled={isAddingTask || !!savingTaskId} />
                <div className="flex flex-col sm:flex-row gap-4">
                    <Popover><PopoverTrigger asChild><Button variant="outline" className={cn(!newTaskDueDate && "text-muted-foreground")} disabled={isAddingTask || !!savingTaskId}><CalendarIcon className="mr-2" />{newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Due date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newTaskDueDate} onSelect={handleDateSelect} initialFocus /></PopoverContent></Popover>
                     <Select onValueChange={handlePriorityChange} value={newTaskPriority ?? 'none'} disabled={isAddingTask || !!savingTaskId}><SelectTrigger className="sm:w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="none">No Priority</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
                    <Button type="submit" disabled={!newTaskText.trim() || isAddingTask || !!savingTaskId} className="sm:flex-1 hover-glow">{isAddingTask ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2" />}Add Task</Button>
                </div>
           </form>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
        <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
            <CardHeader><CardTitle className="text-xl text-primary">To Do ({incompleteTasks.length})</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                {incompleteTasks.length === 0 ? (<p className="text-center text-muted-foreground mt-4">No tasks.</p>) : (
                  <div className="space-y-3">
                    {incompleteTasks.map(task => (<TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} onEdit={handleStartEdit} isEditing={editingTask?.id === task.id} editText={editText} onEditInputChange={handleEditInputChange} onSaveEdit={handleSaveEdit} onCancelEdit={handleCancelEdit} isSavingCurrent={savingTaskId === task.id}/>))}
                  </div>)}
              </ScrollArea>
            </CardContent>
        </Card>
         <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
            <CardHeader><CardTitle className="text-xl text-muted-foreground">Completed ({completedTasks.length})</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                 {completedTasks.length === 0 ? (<p className="text-center text-muted-foreground mt-4">No completed tasks.</p>) : (
                   <div className="space-y-3">
                     {completedTasks.map(task => (<TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} onEdit={handleStartEdit} isEditing={editingTask?.id === task.id} editText={editText} onEditInputChange={handleEditInputChange} onSaveEdit={handleSaveEdit} onCancelEdit={handleCancelEdit} isSavingCurrent={savingTaskId === task.id} />))}
                   </div>)}
              </ScrollArea>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
