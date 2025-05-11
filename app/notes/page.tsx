'use client';

import React, { useState, useEffect, ChangeEvent, useCallback, memo, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, AlertCircle, Wand2, Info, Upload, Tag, Folder, Search, Edit, Save, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateNotesFromPdf, type GenerateNotesInput } from '@/ai/flows/generate-notes';
import Link from 'next/link';
import { StudyMaterial, Note, NoteData } from '@/types';
import ReactMarkdown from 'react-markdown';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, parseISO, isValid } from 'date-fns';
import { SummarizeWidget } from '@/components/ai/summarize-widget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { loadUserData, saveUserData } from '@/lib/local-storage';

const MATERIALS_SUFFIX = 'materials';
const NOTES_SUFFIX = 'notes';

interface SelectOption {
    id: string;
    name: string;
    type: 'material' | 'note';
    isImported?: boolean;
    dataUri?: string;
}

// Helper: Convert date strings in an object to Date objects
const parseItemDates = <T extends { [key: string]: any }>(item: T, dateFields: (keyof T)[]): T => {
    const newItem = { ...item };
    dateFields.forEach(field => {
        if (newItem[field] && typeof newItem[field] === 'string') {
            const date = parseISO(newItem[field]);
            if (isValid(date)) {
                newItem[field] = date;
            } else {
                console.warn(`Invalid date string for field ${String(field)} in item:`, item);
                newItem[field] = new Date(); // Fallback
            }
        } else if (newItem[field] && typeof newItem[field] === 'number') { // Handle timestamps
            newItem[field] = new Date(newItem[field]);
        }
    });
    return newItem;
};


const GeneratedNotesDisplay = memo(({ noteData, isLoading, itemName, onContentChange, isEditing }: {
    noteData: Note | null;
    isLoading: boolean;
    itemName: string;
    onContentChange?: (newContent: string) => void;
    isEditing: boolean;
}) => {
    if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    if (!noteData) {
        return <p className="text-center text-muted-foreground mt-4">{itemName === 'Select an item...' ? 'Select or create a note.' : `No notes for "${itemName}".`}</p>;
    }
    const updatedAtDate = noteData.updatedAt && isValid(new Date(noteData.updatedAt)) ? new Date(noteData.updatedAt) : new Date();
    return (
        <div className="space-y-4">
             <div className="flex flex-wrap gap-2 items-center border-b border-border/50 pb-3 mb-4">
                {noteData.category && <Badge variant="secondary" className="flex items-center gap-1"><Folder /> {noteData.category}</Badge>}
                 {noteData.tags?.map(tag => <Badge key={tag} variant="outline" className="flex items-center gap-1"><Tag /> {tag}</Badge>)}
             </div>
             {isEditing && onContentChange ? (
                 <Textarea value={noteData.content} onChange={(e) => onContentChange(e.target.value)} rows={15} className="min-h-[300px] w-full text-base" autoFocus />
             ) : ( <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-secondary-foreground">{noteData.content || ''}</ReactMarkdown> )}
             <CardFooter className="text-xs text-muted-foreground border-t border-border/50 pt-4 mt-4 px-0">Last updated: {format(updatedAtDate, 'PPp')}</CardFooter>
        </div>
    );
});
GeneratedNotesDisplay.displayName = 'GeneratedNotesDisplay';


export default function NotesPage() {
  const { userId, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentNoteContentForEdit, setCurrentNoteContentForEdit] = useState<string>(''); // Separate state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

   useEffect(() => {
       const loadInitialData = () => {
           if (!authLoading && userId && !hasFetched) {
               setIsPageLoading(true);
               try {
                   const loadedMaterials = loadUserData<StudyMaterial[]>(userId, MATERIALS_SUFFIX) || [];
                   setMaterials(loadedMaterials.map(m => parseItemDates(m, ['uploadDate'])));

                   const loadedNotesArray = loadUserData<Note[]>(userId, NOTES_SUFFIX) || [];
                   const notesRecord: Record<string, Note> = {};
                   loadedNotesArray.forEach(note => {
                       notesRecord[note.id] = parseItemDates(note, ['createdAt', 'updatedAt']);
                   });
                   setNotes(notesRecord);
                   setHasFetched(true);
               } catch (error) {
                   console.error("Error loading data:", error);
                   toast({ title: "Error Loading Data", variant: "destructive" });
               } finally {
                   setIsPageLoading(false);
               }
           } else if (!authLoading && !userId) {
               setMaterials([]); setNotes({}); setHasFetched(false); setIsPageLoading(false);
           } else if (hasFetched) {
               setIsPageLoading(false);
           }
       };
       loadInitialData();
   }, [userId, authLoading, hasFetched, toast]);

   const saveNotesToStorage = useCallback((updatedNotes: Record<string, Note>) => {
        if (!userId) return;
        // Convert Dates to ISO strings for storage
        const notesToSave = Object.values(updatedNotes).map(note => ({
            ...note,
            createdAt: new Date(note.createdAt).toISOString(),
            updatedAt: new Date(note.updatedAt).toISOString(),
        }));
        saveUserData(userId, NOTES_SUFFIX, notesToSave);
        setNotes(updatedNotes); // Keep Date objects in state
   }, [userId]);


   const handleSelectItem = useCallback((itemId: string | null) => {
        if (itemId === selectedItemId && !isEditing) return; // Prevent re-selection unless exiting edit mode

        if (isEditing && selectedItemId && notes[selectedItemId]?.content !== currentNoteContentForEdit) {
            // Basic confirmation if content changed
            if (confirm("You have unsaved changes. Are you sure you want to switch? Changes will be lost.")) {
                setIsEditing(false); // Discard changes by exiting edit mode
            } else {
                return; // Don't switch
            }
        }

       setSelectedItemId(itemId);
       setCustomInstructions('');
       setIsEditing(false); // Always exit edit mode when selecting a new item

       const selectedNote = itemId ? notes[itemId] : null;
       setCurrentNoteContentForEdit(selectedNote?.content || ''); // Load content for potential editing
   }, [selectedItemId, isEditing, notes, currentNoteContentForEdit]);


  const handleGenerateNotes = useCallback(async () => {
    if (!selectedItemId || isGenerating[selectedItemId] || !userId) return;
    const selectedMaterial = materials.find(m => m.id === selectedItemId);
    if (!selectedMaterial?.dataUri?.startsWith('data:application/pdf;base64,')) {
      toast({ title: "Invalid PDF", variant: "destructive" }); return;
    }
    setIsGenerating(prev => ({ ...prev, [selectedItemId]: true }));
    toast({ title: "Generating Notes..." });
    try {
      const input: GenerateNotesInput = { pdfDataUri: selectedMaterial.dataUri, instructions: customInstructions || undefined };
      const generatedNoteData = await generateNotesFromPdf(input);
      if (generatedNoteData?.content) {
           const now = new Date();
           const newNoteId = `note_${Date.now()}_gen_${Math.random().toString(16).slice(2)}`;
           const newNote: Note = {
              id: newNoteId, name: `Notes for ${selectedMaterial.name}`,
              content: generatedNoteData.content, tags: generatedNoteData.tags, category: generatedNoteData.category,
              createdAt: now, updatedAt: now, userId, materialId: selectedMaterial.id,
           };
           const updatedNotes = { ...notes, [newNote.id]: newNote };
           saveNotesToStorage(updatedNotes);
           toast({ title: "Notes Generated & Saved" });
           setSelectedItemId(newNote.id); setCurrentNoteContentForEdit(newNote.content); setIsEditing(false);
      } else throw new Error("AI returned invalid data.");
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    } finally {
       setIsGenerating(prev => ({ ...prev, [selectedItemId]: false }));
    }
  }, [userId, selectedItemId, isGenerating, materials, customInstructions, toast, notes, saveNotesToStorage]);

   const handleCustomInstructionsChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => setCustomInstructions(e.target.value), []);
   const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value.toLowerCase());

    const handleSummarySaved = useCallback((newNoteData: NoteData) => {
        if (!userId) return;
        setIsSaving(true);
        try {
             const now = new Date();
             const newNoteId = `note_${Date.now()}_summary_${Math.random().toString(16).slice(2)}`;
             const newNote: Note = {
                 id: newNoteId, name: `Summary: ${newNoteData.category || 'Untitled'}`,
                 content: newNoteData.content, tags: newNoteData.tags, category: newNoteData.category,
                 createdAt: now, updatedAt: now, userId, materialId: null,
            };
            const updatedNotes = { ...notes, [newNote.id]: newNote };
            saveNotesToStorage(updatedNotes);
            toast({ title: "Summary Saved" });
            setSelectedItemId(newNote.id); setCurrentNoteContentForEdit(newNote.content); setIsEditing(false);
        } finally { setIsSaving(false); }
    }, [userId, toast, notes, saveNotesToStorage]);

    const handleNoteContentChange = useCallback((newContent: string) => {
       if (!isEditing) return; // Only allow changes in edit mode
       setCurrentNoteContentForEdit(newContent);
    }, [isEditing]);

     const handleCreateNewNote = () => {
        if (!newNoteName.trim() || !userId) { toast({ title: "Name Required", variant: "destructive" }); return; }
        setIsSaving(true);
        try {
            const now = new Date();
            const newNoteId = `note_${Date.now()}_manual_${Math.random().toString(16).slice(2)}`;
            const initialContent = `# ${newNoteName.trim()}\n\nStart writing here...`;
            const newNote: Note = {
                id: newNoteId, name: newNoteName.trim(), content: initialContent,
                tags: ['manual'], category: 'Uncategorized', createdAt: now, updatedAt: now, userId, materialId: null,
            };
            const updatedNotes = { ...notes, [newNote.id]: newNote };
            saveNotesToStorage(updatedNotes);
            toast({ title: "Note Created" });
            setNewNoteName(''); setSelectedItemId(newNote.id); setCurrentNoteContentForEdit(initialContent); setIsEditing(true);
        } finally { setIsSaving(false); }
     };

    const handleSaveNote = () => {
        if (!isEditing || !selectedItemId || !userId) return;
        const noteToSave = notes[selectedItemId];
        if (!noteToSave || noteToSave.content === currentNoteContentForEdit) { setIsEditing(false); return; }
        setIsSaving(true);
        try {
             const updatedNote = { ...noteToSave, content: currentNoteContentForEdit, updatedAt: new Date() };
             const updatedNotes = { ...notes, [selectedItemId]: updatedNote };
             saveNotesToStorage(updatedNotes);
             setIsEditing(false); toast({title: "Note Saved"});
        } finally { setIsSaving(false); }
    };

     const handleDeleteNote = useCallback(() => {
         if (!selectedItemId || !userId || isEditing) {
             if(isEditing) toast({title: "Save or Cancel Edit", description: "Please save or cancel your current edits before deleting.", variant: "default"});
             return;
         }
         const noteToDelete = notes[selectedItemId];
         if (!noteToDelete) return;
         if (!confirm(`Are you sure you want to delete "${noteToDelete.name || 'this note'}"? This cannot be undone.`)) return;
         setIsSaving(true);
         try {
             const updatedNotes = { ...notes };
             delete updatedNotes[selectedItemId];
             saveNotesToStorage(updatedNotes);
             setSelectedItemId(null); setCurrentNoteContentForEdit('');
             toast({ title: "Note Deleted" });
         } finally { setIsSaving(false); }
     }, [selectedItemId, userId, notes, isEditing, toast, saveNotesToStorage]);

    const handleToggleEdit = () => {
         if (isEditing) {
             handleSaveNote(); // This will also set isEditing to false
         } else if (selectedItemId && notes[selectedItemId]) {
              setCurrentNoteContentForEdit(notes[selectedItemId].content); // Ensure editor has latest saved content
              setIsEditing(true);
         } else {
              toast({title: "Cannot Edit", description: "Select or create a note to edit."})
         }
    };

    const combinedSelectOptions = useMemo(() => {
        const materialOptions: SelectOption[] = materials
            .filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm) || (m.tags || []).join(' ').toLowerCase().includes(searchTerm))
            .map(m => ({ id: m.id, name: m.name, type: 'material', isImported: m.isImported, dataUri: m.dataUri }));
        const noteOptions: SelectOption[] = Object.values(notes)
             .filter(n => !searchTerm || (n.name||'').toLowerCase().includes(searchTerm) || n.content.toLowerCase().includes(searchTerm) || (n.category||'').toLowerCase().includes(searchTerm) || (n.tags||[]).join(' ').toLowerCase().includes(searchTerm))
             .map(n => ({ id: n.id, name: n.name || `${n.category}: ${n.content.substring(0,30)}...`, type: 'note' }));
        return [...materialOptions, ...noteOptions].sort((a,b)=> a.name.localeCompare(b.name));
    }, [materials, notes, searchTerm]);

   const displayNoteData = selectedItemId ? notes[selectedItemId] : null;
   const selectedItem = combinedSelectOptions.find(opt => opt.id === selectedItemId);
   const selectedItemName = selectedItem?.name || 'Select an item...';
   const isGeneratingCurrent = selectedItemId ? isGenerating[selectedItemId] : false;
   const isSelectedMaterialValidForGen = selectedItem?.type === 'material' && !selectedItem.isImported && !!selectedItem.dataUri;
   const isNoteSelected = selectedItem?.type === 'note';

   if (authLoading || isPageLoading) return (<div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="animate-spin text-primary" /><span className="ml-2">Loading...</span></div>);
   if (!userId) return (<div className="p-4 text-center">Please log in.</div>);

  return (
    <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-primary">Notes & Summaries</h1>
       <Alert variant="default" className="border-primary/50 bg-primary/10"><Info /><AlertTitle>Data Storage</AlertTitle><AlertDescription>Notes & PDFs saved in browser localStorage.</AlertDescription></Alert>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search materials & notes..." value={searchTerm} onChange={handleSearchChange} className="pl-10" disabled={isSaving || isGeneratingCurrent} />
        </div>
       <Tabs defaultValue="viewer" className="flex-1 flex flex-col gap-8">
          <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="viewer">Note Viewer / Editor</TabsTrigger>
              <TabsTrigger value="generator">PDF Note Generator</TabsTrigger>
              <TabsTrigger value="summarizer">Text Summarizer</TabsTrigger>
          </TabsList>
            <TabsContent value="viewer" className="flex-1 flex flex-col gap-8 mt-0">
                 <Card className="glassmorphism">
                     <CardHeader><CardTitle className="text-xl text-primary">Select or Create Note</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                         <Select value={selectedItemId ?? ""} onValueChange={handleSelectItem} disabled={isSaving || isGeneratingCurrent}>
                             <SelectTrigger><SelectValue placeholder="Select material or note..." /></SelectTrigger>
                             <SelectContent>
                                 {combinedSelectOptions.length === 0 ? <div className="p-2 text-center text-sm">{searchTerm ? 'No matches.' : 'No items.'}</div>
                                   : combinedSelectOptions.map(item => (<SelectItem key={item.id} value={item.id}>{item.name} {item.type === 'material' ? '(PDF)' : '(Note)'}</SelectItem>))}
                             </SelectContent>
                         </Select>
                         <div className="flex flex-col sm:flex-row gap-2">
                              <Input placeholder="New note name..." value={newNoteName} onChange={e => setNewNoteName(e.target.value)} disabled={isSaving} />
                             <Button onClick={handleCreateNewNote} disabled={!newNoteName.trim() || isSaving} className="hover-glow">
                                {isSaving ? <Loader2 className="animate-spin mr-2"/> : <FileText className="mr-2" />} Create Note
                              </Button>
                         </div>
                     </CardContent>
                 </Card>
                 <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
                     <CardHeader>
                         <CardTitle className="text-xl text-primary flex items-center justify-between">
                             <span className="truncate">{selectedItemName}</span>
                             {isNoteSelected && (
                                <div className="flex gap-2">
                                     <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={handleToggleEdit} className="hover-glow" disabled={isSaving || !selectedItemId}>
                                        {isEditing ? <Save className="mr-1" /> : <Edit className="mr-1" />} {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
                                     </Button>
                                     <Button variant="destructive" size="sm" onClick={handleDeleteNote} className="hover-glow" disabled={isSaving || isEditing || !selectedItemId}>
                                        {isSaving && selectedItemId === notes[selectedItemId!]?.id ? <Loader2 className="animate-spin"/> : <Trash2 />}
                                     </Button>
                                </div> )}
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="flex-1 overflow-hidden p-0">
                         <ScrollArea className="h-full p-6">
                             <GeneratedNotesDisplay noteData={displayNoteData} isLoading={isSaving} itemName={selectedItemName} onContentChange={handleNoteContentChange} isEditing={isEditing} />
                         </ScrollArea>
                     </CardContent>
                 </Card>
            </TabsContent>
           <TabsContent value="generator" className="flex-1 flex flex-col gap-8 mt-0">
              <Card className="glassmorphism">
                <CardHeader><CardTitle className="text-xl text-primary">Generate Notes from PDF</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   {materials.filter(m => !m.isImported).length === 0 ? (
                         <div className="text-muted-foreground flex items-center gap-2">No PDFs. <Link href="/materials" passHref legacyBehavior><Button variant="outline" size="sm"><Upload /> Upload</Button></Link></div>
                    ) : combinedSelectOptions.filter(opt => opt.type === 'material' && !opt.isImported && opt.dataUri).length === 0 && searchTerm ? (
                         <p>No PDF materials match search.</p>
                    ) : (
                        <Select value={selectedItemId ?? ""} onValueChange={handleSelectItem} disabled={isGeneratingCurrent || isSaving}>
                            <SelectTrigger><SelectValue placeholder="Select uploaded PDF..." /></SelectTrigger>
                            <SelectContent>
                                {combinedSelectOptions.filter(opt => opt.type === 'material' && !opt.isImported && opt.dataUri).map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}
                            </SelectContent>
                        </Select>)}
                   <Textarea placeholder="Optional: Custom instructions for AI..." value={customInstructions} onChange={handleCustomInstructionsChange} disabled={!isSelectedMaterialValidForGen || isGeneratingCurrent || isSaving} />
                </CardContent>
                <CardFooter>
                   <Button onClick={handleGenerateNotes} disabled={!isSelectedMaterialValidForGen || isGeneratingCurrent || isSaving} className="hover-glow">
                     {isGeneratingCurrent ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />} Generate
                   </Button>
                </CardFooter>
              </Card>
           </TabsContent>
            <TabsContent value="summarizer" className="flex-1 flex flex-col gap-8 mt-0">
                 <SummarizeWidget className="glassmorphism w-full" onSummaryGenerated={handleSummarySaved} />
           </TabsContent>
       </Tabs>
    </div>
  );
}

