'use client';

import React, { useState, useEffect, useCallback, useRef, memo, ChangeEvent, KeyboardEvent } from 'react';
// import { useAuth } from '@/hooks/use-auth'; // Already imported below
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, ChevronLeft, ChevronRight, Loader2, Info, Upload, BookOpen, ArrowLeft, AlertCircle, Share2, UploadCloud, Copy, Edit, Save, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateFlashcardsFromPdf, type GenerateFlashcardsInput, type GenerateFlashcardsOutput, type Flashcard as AIFlashcardType } from '@/ai/flows/generate-flashcards';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea";
import { Input } from '@/components/ui/input';
import { StudyMaterial, Deck, Flashcard as DBFlashcardType } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from "@/components/ui/badge";
import { loadUserData, saveUserData } from '@/lib/local-storage';
import { parseISO, isValid, format } from 'date-fns'; // Added parseISO, isValid, format

const MATERIALS_SUFFIX = 'materials';
const DECKS_SUFFIX = 'flashcardDecks';
const CARDS_SUFFIX_PREFIX = 'flashcards_';

type ViewMode = 'decks' | 'loadingReview' | 'review';
const REVIEW_TRANSITION_DELAY = 700;
type DisplayFlashcard = DBFlashcardType & AIFlashcardType; // AIFlashcardType has question/answer

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
                    console.warn(`Invalid date string for field ${String(field)}: ${newItem[field]}`);
                    newItem[field] = new Date(); // Fallback
                }
            } else if (newItem[field] && typeof newItem[field] === 'number') { // Handle timestamps
                newItem[field] = new Date(newItem[field]);
            }
        });
        return newItem;
    });
};


// --- Local Storage Data Management ---
const loadDecksFromStorage = (userId: string): Deck[] => {
    const storedDecks = loadUserData<Deck[]>(userId, DECKS_SUFFIX) || [];
    return parseDatesInArray(storedDecks, ['createdAt', 'updatedAt']);
};

const saveDecksToStorage = (userId: string, decks: Deck[]): void => {
    const decksToSave = decks.map(deck => ({
        ...deck,
        createdAt: new Date(deck.createdAt).toISOString(),
        updatedAt: new Date(deck.updatedAt).toISOString(),
        flashcards: undefined, // Do not store full flashcards array on deck object
    }));
    saveUserData(userId, DECKS_SUFFIX, decksToSave);
};

const loadFlashcardsFromStorage = (userId: string, deckId: string): DBFlashcardType[] => {
    const storedCards = loadUserData<DBFlashcardType[]>(userId, `${CARDS_SUFFIX_PREFIX}${deckId}`) || [];
    return parseDatesInArray(storedCards, ['createdAt', 'updatedAt']);
};

const saveFlashcardsToStorage = (userId: string, deckId: string, flashcards: DBFlashcardType[]): void => {
    const cardsToSave = flashcards.map(card => ({
        ...card,
        createdAt: new Date(card.createdAt).toISOString(),
        updatedAt: new Date(card.updatedAt).toISOString(),
    }));
    saveUserData(userId, `${CARDS_SUFFIX_PREFIX}${deckId}`, cardsToSave);
};

const deleteFlashcardsFromStorage = (userId: string, deckId: string): void => {
    localStorage.removeItem(`${APP_PREFIX}${userId}_${CARDS_SUFFIX_PREFIX}${deckId}`);
};
const APP_PREFIX = 'lifeOS_'; // Ensure this matches the prefix in local-storage.ts


// --- Memoized Components ---
const DeckCard = memo(({ deck, cardCount, onClick, onExport, onDelete, onEditName }: {
    deck: Deck,
    cardCount: number,
    onClick: (id: string) => void,
    onExport: (id: string, name: string) => void,
    onDelete: (id: string, name: string) => void,
    onEditName: (deck: Deck) => void,
}) => (
    <Card
        key={deck.id}
        className="bg-secondary/70 hover:bg-secondary transition-colors cursor-pointer hover-glow flex flex-col justify-between relative group"
        onClick={() => onClick(deck.id)}
        role="button"
        aria-label={`Review deck: ${deck.name}`}
    >
        <CardHeader>
            <CardTitle className="text-lg text-secondary-foreground truncate">{deck.name}</CardTitle>
             {deck.sourceType === 'import' && <Badge variant="outline" className="text-xs absolute top-2 right-2">Imported</Badge>}
             {deck.sourceType === 'material' && <Badge variant="outline" className="text-xs absolute top-2 right-2">Generated</Badge>}
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{cardCount} card{cardCount !== 1 ? 's' : ''}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
            <Button variant="ghost" size="sm" className="justify-start text-primary hover:text-primary px-2">
                <BookOpen className="w-4 h-4 mr-2"/> Review Deck
            </Button>
             <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onEditName(deck); }}
                    aria-label={`Edit deck name: ${deck.name}`}
                    title="Edit Name"
                 >
                    <Edit className="w-4 h-4" />
                 </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onExport(deck.id, deck.name); }}
                    aria-label={`Export deck: ${deck.name}`}
                    title="Export Deck"
                >
                    <Share2 className="w-4 h-4" />
                </Button>
                 <Button
                     variant="ghost"
                     size="icon"
                     className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8"
                     onClick={(e) => { e.stopPropagation(); onDelete(deck.id, deck.name); }}
                     aria-label={`Delete deck: ${deck.name}`}
                     title="Delete Deck"
                 >
                     <Trash2 className="w-4 h-4" />
                 </Button>
             </div>
        </CardFooter>
    </Card>
));
DeckCard.displayName = 'DeckCard';

const FlipCard = memo(({ card, isFlipped, onFlip }: { card: DisplayFlashcard, isFlipped: boolean, onFlip: () => void }) => (
    <div
        className={cn(
            "flip-card w-full max-w-2xl h-96 perspective",
            isFlipped ? 'flipped' : ''
        )}
        onClick={onFlip}
        role="button"
        aria-label={`Flashcard. ${isFlipped ? 'Showing Answer' : 'Showing Question'}. Click or press Space/Enter to flip.`}
        title="Click or press Space/Enter to flip"
    >
        <div className="flip-card-inner glassmorphism">
            <div className="flip-card-front">
                <ScrollArea className="h-full w-full">
                    <CardContent className="flex items-center justify-center h-full min-h-[24rem] text-2xl p-8 text-center">
                        {card.question}
                    </CardContent>
                </ScrollArea>
            </div>
            <div className="flip-card-back">
                <ScrollArea className="h-full w-full">
                    <CardContent className="flex items-center justify-center h-full min-h-[24rem] text-xl p-8 text-center">
                        {card.answer}
                    </CardContent>
                </ScrollArea>
            </div>
        </div>
    </div>
));
FlipCard.displayName = 'FlipCard';


export default function FlashcardsPage() {
  const { userId, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCardCounts, setDeckCardCounts] = useState<Record<string, number>>({});
  const [currentReviewCards, setCurrentReviewCards] = useState<DisplayFlashcard[]>([]);

  const [selectedMaterialIdForGeneration, setSelectedMaterialIdForGeneration] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importString, setImportString] = useState('');
  const [importDeckName, setImportDeckName] = useState('');
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editDeckName, setEditDeckName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const reviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reviewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
       const loadInitialData = async () => {
           if (!authLoading && userId && !hasFetched) {
                setIsPageLoading(true);
                try {
                    const loadedMaterials = loadUserData<StudyMaterial[]>(userId, MATERIALS_SUFFIX) || [];
                    const materialsWithDates = parseDatesInArray(loadedMaterials, ['uploadDate']);
                    setMaterials(materialsWithDates);

                    const loadedDecks = loadDecksFromStorage(userId);
                    setDecks(loadedDecks);

                    const counts: Record<string, number> = {};
                    for (const deck of loadedDecks) {
                        const cards = loadFlashcardsFromStorage(userId, deck.id);
                        counts[deck.id] = cards.length;
                    }
                    setDeckCardCounts(counts);

                    const firstNonImportedMaterial = materialsWithDates.find(m => !m.isImported && m.dataUri);
                    if (!selectedMaterialIdForGeneration && firstNonImportedMaterial) {
                        setSelectedMaterialIdForGeneration(firstNonImportedMaterial.id);
                    }
                    setHasFetched(true);
                } catch (error) {
                    console.error("Error loading flashcard data from localStorage:", error);
                    toast({ title: "Error Loading Data", description: "Could not load materials or decks.", variant: "destructive" });
                } finally {
                   setIsPageLoading(false);
                }
           } else if (!authLoading && !userId) { // Logged out
               setMaterials([]);
               setDecks([]);
               setDeckCardCounts({});
               setCurrentReviewCards([]);
               setHasFetched(false);
               setIsPageLoading(false);
           } else if (hasFetched) { // Already fetched data
              setIsPageLoading(false);
           }
       };
       loadInitialData();
   }, [userId, authLoading, hasFetched, toast, selectedMaterialIdForGeneration]);


   useEffect(() => {
     return () => { if (reviewTimeoutRef.current) clearTimeout(reviewTimeoutRef.current); };
   }, []);

  const handleSelectMaterialForGeneration = useCallback((materialId: string) => {
    setSelectedMaterialIdForGeneration(materialId || null);
  }, []);

  const handleGenerateFlashcards = useCallback(async () => {
    if (!userId || !selectedMaterialIdForGeneration || isGenerating[selectedMaterialIdForGeneration]) return;

    const selectedMaterial = materials.find(m => m.id === selectedMaterialIdForGeneration);
    if (!selectedMaterial || !selectedMaterial.dataUri || !selectedMaterial.dataUri.startsWith('data:application/pdf;base64,')) {
      toast({ title: "Error", description: "Please select a valid uploaded PDF.", variant: "destructive" });
      return;
    }

    setIsGenerating(prev => ({ ...prev, [selectedMaterialIdForGeneration]: true }));
    toast({ title: "Generating...", description: `AI creating flashcards for ${selectedMaterial.name}.` });

    try {
      const input: GenerateFlashcardsInput = { pdfDataUri: selectedMaterial.dataUri };
      const result = await generateFlashcardsFromPdf(input);

       if (result && Array.isArray(result.flashcards)) {
             const newCardsInput: AIFlashcardType[] = result.flashcards.filter(c => c && c.question && c.answer);
             if (newCardsInput.length > 0) {
                 setIsSaving(true);
                 const now = new Date();
                 const newDeckId = `deck_${Date.now()}_${Math.random().toString(16).slice(2)}`;
                 const newDeckData: Deck = {
                    id: newDeckId, name: selectedMaterial.name, sourceId: selectedMaterial.id,
                    sourceType: 'material', userId, createdAt: now, updatedAt: now,
                 };
                 const cardsToSave: DBFlashcardType[] = newCardsInput.map((card, index) => ({
                    id: `card_${newDeckId}_${index}`, question: card.question, answer: card.answer,
                    deckId: newDeckId, createdAt: now, updatedAt: now,
                 }));

                 const updatedDecks = [...decks, newDeckData];
                 saveDecksToStorage(userId, updatedDecks);
                 saveFlashcardsToStorage(userId, newDeckId, cardsToSave);
                 setDeckCardCounts(prev => ({...prev, [newDeckId]: cardsToSave.length}));
                 setDecks(updatedDecks.sort((a, b) => (a.sourceType === 'import' ? 1 : 0) - (b.sourceType === 'import' ? 1 : 0)));


                 setIsSaving(false);
                 toast({ title: "Generated & Saved", description: `${cardsToSave.length} cards for ${selectedMaterial.name}.` });
             } else {
                 toast({ title: "No Cards Generated", description: `AI found no content for ${selectedMaterial.name}.`, variant: "default" });
             }
       } else {
            console.error("Invalid AI response:", result);
            throw new Error("AI returned invalid response.");
       }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ title: "Generation Failed", description: error.message || "Unknown error.", variant: "destructive" });
       setIsSaving(false);
    } finally {
      setIsGenerating(prev => ({ ...prev, [selectedMaterialIdForGeneration]: false }));
    }
  }, [userId, selectedMaterialIdForGeneration, isGenerating, materials, decks, toast]);

  const handleDeckClick = useCallback((deckId: string) => {
     if (reviewTimeoutRef.current) clearTimeout(reviewTimeoutRef.current);
     if (!userId) return;

     setViewMode('loadingReview');
     setSelectedDeckId(deckId);

     try {
        const cards = loadFlashcardsFromStorage(userId, deckId);
       if (!cards || cards.length === 0) {
         toast({ title: "Empty Deck", description: "No cards to review.", variant: "default" });
         setViewMode('decks'); setSelectedDeckId(null); return;
       }
       setCurrentReviewCards(cards.map(c => ({...c, question: c.question, answer: c.answer}))); // Map to DisplayFlashcard
       reviewTimeoutRef.current = setTimeout(() => {
         setCurrentCardIndex(0); setIsFlipped(false); setViewMode('review');
         reviewTimeoutRef.current = null;
       }, REVIEW_TRANSITION_DELAY);
     } catch (error) {
       console.error("Error loading cards:", error);
       toast({ title: "Error", description: "Could not load cards.", variant: "destructive" });
       setViewMode('decks'); setSelectedDeckId(null);
     }
  }, [toast, userId]);

  useEffect(() => {
      if (viewMode === 'review' && reviewContainerRef.current) reviewContainerRef.current.focus();
  }, [viewMode]);

  const handleBackToDecks = useCallback(() => {
     if (reviewTimeoutRef.current) clearTimeout(reviewTimeoutRef.current);
    setViewMode('decks'); setSelectedDeckId(null); setCurrentReviewCards([]);
    setCurrentCardIndex(0); setIsFlipped(false);
  }, []);

  const handleFlip = useCallback(() => setIsFlipped(prev => !prev), []);
  const handleNextCard = useCallback(() => {
    if (currentCardIndex < currentReviewCards.length - 1) { setCurrentCardIndex(prev => prev + 1); setIsFlipped(false); }
  }, [currentCardIndex, currentReviewCards]);
  const handlePrevCard = useCallback(() => {
    if (currentCardIndex > 0) { setCurrentCardIndex(prev => prev - 1); setIsFlipped(false); }
  }, [currentCardIndex]);

   const handleStartEditName = useCallback((deck: Deck) => { setEditingDeck(deck); setEditDeckName(deck.name); }, []);
   const handleCancelEditName = useCallback(() => { setEditingDeck(null); setEditDeckName(''); }, []);
    const handleSaveEditName = useCallback(() => {
        if (!editingDeck || !editDeckName.trim() || !userId || editDeckName.trim() === editingDeck.name) { handleCancelEditName(); return; }
        const newName = editDeckName.trim();
        setIsSaving(true);
        try {
             const updatedDecks = decks.map(d => d.id === editingDeck.id ? { ...d, name: newName, updatedAt: new Date() } : d);
             saveDecksToStorage(userId, updatedDecks);
             setDecks(updatedDecks.sort((a, b) => (a.sourceType === 'import' ? 1 : 0) - (b.sourceType === 'import' ? 1 : 0)));
             toast({ title: "Deck Renamed", description: `Renamed to "${newName}".` });
        } finally { setIsSaving(false); handleCancelEditName(); }
    }, [editingDeck, editDeckName, userId, decks, toast, handleCancelEditName]);

    const handleDeleteDeck = useCallback((deckId: string, deckName: string) => {
        if (!userId) return;
        setIsSaving(true);
        try {
            const updatedDecks = decks.filter(d => d.id !== deckId);
            saveDecksToStorage(userId, updatedDecks);
            deleteFlashcardsFromStorage(userId, deckId);
            setDecks(updatedDecks.sort((a, b) => (a.sourceType === 'import' ? 1 : 0) - (b.sourceType === 'import' ? 1 : 0)));
            setDeckCardCounts(prev => { const newCounts = {...prev}; delete newCounts[deckId]; return newCounts;});
            toast({ title: "Deck Deleted", description: `"${deckName}" removed.` });
        } finally { setIsSaving(false); }
    }, [userId, decks, toast]);

    const handleExportDeck = useCallback((deckId: string, deckName: string) => {
        if (!userId) return;
        setIsSaving(true);
        try {
            const cards = loadFlashcardsFromStorage(userId, deckId);
            if (!cards || cards.length === 0) {
                toast({ title: "Error", description: "Cannot export: No cards found.", variant: "destructive" }); return;
            }
            const exportData = { name: deckName, cards: cards.map(({ question, answer }) => ({ question, answer })) };
            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
                .then(() => toast({ title: "Exported!", description: `"${deckName}" copied.` }))
                .catch(() => toast({ title: "Export Failed", description: "Clipboard error.", variant: "destructive" }));
        } catch (error) {
             toast({ title: "Export Failed", description: "Data error.", variant: "destructive" });
        } finally { setIsSaving(false); }
    }, [userId, toast]);

    const handleImportDeck = useCallback(() => {
         if (isImporting || !userId || !importDeckName.trim()) {
            if (!importDeckName.trim()) toast({ title: "Import Error", description: "Deck name required.", variant: "destructive" });
            return;
         }
         let parsedData: { name?: string; cards: { question: string; answer: string }[] };
         try {
             parsedData = JSON.parse(importString);
             if (!parsedData || !Array.isArray(parsedData.cards) || parsedData.cards.some(c => !c.question || !c.answer)) throw new Error("Invalid data structure.");
         } catch (error: any) {
             toast({ title: "Import Failed", description: `Invalid JSON. ${error.message}`, variant: "destructive" }); return;
         }
         setIsImporting(true);
         try {
             const now = new Date();
             const newDeckId = `deck_${Date.now()}_imp_${Math.random().toString(16).slice(2)}`;
             const newDeckData: Deck = {
                id: newDeckId, name: importDeckName.trim(), userId, sourceType: 'import',
                createdAt: now, updatedAt: now, sourceId: null,
             };
             const cardsToSave: DBFlashcardType[] = parsedData.cards.map((card, index) => ({
                 id: `card_${newDeckId}_imp_${index}`, question: card.question, answer: card.answer,
                 deckId: newDeckId, createdAt: now, updatedAt: now,
             }));
            const updatedDecks = [...decks, newDeckData];
            saveDecksToStorage(userId, updatedDecks);
            saveFlashcardsToStorage(userId, newDeckId, cardsToSave);
            setDecks(updatedDecks.sort((a, b) => (a.sourceType === 'import' ? 1 : 0) - (b.sourceType === 'import' ? 1 : 0)));
            setDeckCardCounts(prev => ({...prev, [newDeckId]: cardsToSave.length}));

            toast({ title: "Import Successful", description: `"${newDeckData.name}" imported.` });
            setImportString(''); setImportDeckName('');
         } finally { setIsImporting(false); }
    }, [isImporting, importString, importDeckName, userId, decks, toast]);

  useEffect(() => {
    if (viewMode !== 'review') return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowRight') handleNextCard();
      else if (event.key === 'ArrowLeft') handlePrevCard();
      else if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); handleFlip(); }
    };
    const container = reviewContainerRef.current;
    if (container) container.addEventListener('keydown', handleKeyDown);
    return () => { if (container) container.removeEventListener('keydown', handleKeyDown); };
  }, [viewMode, handleNextCard, handlePrevCard, handleFlip]);

  const currentReviewCard = currentReviewCards[currentCardIndex];
  const selectedDeckName = decks.find(d => d.id === selectedDeckId)?.name;
  const materialsForGeneration = materials.filter(m => !m.isImported && m.dataUri);

   if (authLoading || isPageLoading) {
     return ( <div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="ml-2">Loading...</span></div> );
   }
    if (!userId) { return <div className="text-muted-foreground p-4 text-center">Please log in.</div>; }

   if (viewMode === 'decks') {
     const currentGenerationMaterialId = selectedMaterialIdForGeneration;
     const isGeneratingCurrent = currentGenerationMaterialId ? isGenerating[currentGenerationMaterialId] : false;
     return (
       <div className="panel-slide-fade-in flex flex-col gap-8 h-full">
         <h1 className="text-3xl font-bold text-primary">Flashcards</h1>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="glassmorphism">
                 <CardHeader><CardTitle className="text-xl text-primary flex items-center gap-2"><Wand2 /> Generate Deck</CardTitle></CardHeader>
                 <CardContent className="flex flex-col items-center gap-4">
                      {materialsForGeneration.length === 0 ? (
                           <div className="text-muted-foreground flex-1 flex items-center gap-2 w-full">No PDFs found. <Link href="/materials" passHref legacyBehavior><Button variant="outline" size="sm"><Upload /> Upload</Button></Link></div>
                       ) : (
                           <Select value={selectedMaterialIdForGeneration ?? ""} onValueChange={handleSelectMaterialForGeneration} disabled={isGeneratingCurrent || isSaving}>
                               <SelectTrigger className="w-full"><SelectValue placeholder="Select a PDF..." /></SelectTrigger>
                               <SelectContent>{materialsForGeneration.map(m => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
                           </Select>
                       )}
                       <Button onClick={handleGenerateFlashcards} disabled={!selectedMaterialIdForGeneration || isGeneratingCurrent || isSaving || materialsForGeneration.length === 0} className="w-full hover-glow">
                          {isGeneratingCurrent ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />} Generate
                        </Button>
                 </CardContent>
                 <CardFooter><Alert variant="default" className="border-primary/50 bg-primary/10 text-sm p-3 w-full"><Info /><AlertTitle>How it Works</AlertTitle><AlertDescription>Select PDF, click "Generate". AI creates cards saved locally.</AlertDescription></Alert></CardFooter>
             </Card>
             <Card className="glassmorphism">
                 <CardHeader><CardTitle className="text-xl text-primary flex items-center gap-2"><UploadCloud /> Import Deck</CardTitle></CardHeader>
                 <CardContent className="flex flex-col items-center gap-4">
                      <Input placeholder="Name for imported deck" value={importDeckName} onChange={e => setImportDeckName(e.target.value)} disabled={isImporting || isSaving} />
                      <Textarea placeholder="Paste exported JSON here" value={importString} onChange={e => setImportString(e.target.value)} rows={3} disabled={isImporting || isSaving} />
                       <Button onClick={handleImportDeck} disabled={!importString.trim() || !importDeckName.trim() || isImporting || isSaving} className="w-full hover-glow">
                          {isImporting ? <Loader2 className="animate-spin mr-2" /> : <UploadCloud className="mr-2" />} Import
                        </Button>
                 </CardContent>
                 <CardFooter><Alert variant="default" className="border-secondary/50 bg-secondary/10 text-sm p-3 w-full"><Copy /><AlertTitle>Import/Export</AlertTitle><AlertDescription>Export decks (hover Share). Paste JSON here to import locally.</AlertDescription></Alert></CardFooter>
             </Card>
        </div>
         <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-xl text-primary">Your Decks</CardTitle>{isSaving && <Loader2 className="animate-spin text-primary" />}</CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                 <ScrollArea className="h-full p-6">
                      {decks.length === 0 ? (<p className="text-center text-muted-foreground mt-4">No decks yet.</p>) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {decks.map(deck => (editingDeck?.id === deck.id ? (
                                <Card key={`edit-${deck.id}`} className="glassmorphism p-4 flex flex-col gap-2">
                                     <Input value={editDeckName} onChange={e => setEditDeckName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveEditName(); if (e.key === 'Escape') handleCancelEditName(); }} disabled={isSaving} />
                                     <div className="flex justify-end gap-2">
                                          <Button variant="ghost" size="sm" onClick={handleCancelEditName} disabled={isSaving}>Cancel</Button>
                                          <Button size="sm" onClick={handleSaveEditName} disabled={isSaving || !editDeckName.trim() || editDeckName.trim() === editingDeck.name}>{isSaving ? <Loader2 className="animate-spin" /> : 'Save'}</Button>
                                     </div>
                                </Card>
                              ) : (
                                 <DeckCard key={deck.id} deck={deck} cardCount={deckCardCounts[deck.id] || 0} onClick={handleDeckClick} onExport={handleExportDeck} onDelete={handleDeleteDeck} onEditName={handleStartEditName} />
                              )))}
                         </div> )}
                 </ScrollArea>
            </CardContent>
         </Card>
       </div>
     );
   }
   if (viewMode === 'loadingReview') { return ( <div className="flex flex-col justify-center items-center h-[calc(100vh-8rem)] panel-slide-fade-in"><Loader2 className="w-12 h-12 animate-spin text-primary mb-4" /><p className="text-2xl text-muted-foreground animate-pulse">Ready: "{selectedDeckName}"?</p><Button variant="ghost" onClick={handleBackToDecks}><ArrowLeft /> Go Back</Button></div> ); }
   if (viewMode === 'review' && selectedDeckId && currentReviewCard) {
     return (
        <div ref={reviewContainerRef} tabIndex={-1} className="panel-slide-fade-in flex flex-col gap-6 h-full outline-none" aria-live="polite">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleBackToDecks}><ArrowLeft /> Back to Decks</Button>
                <h1 className="text-xl font-semibold text-primary truncate">Review: {selectedDeckName}</h1>
                 <span className="text-muted-foreground w-24 text-right">Card {currentCardIndex + 1}/{currentReviewCards.length}</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <FlipCard card={currentReviewCard} isFlipped={isFlipped} onFlip={handleFlip} />
                <div className="flex justify-between w-full max-w-2xl items-center">
                    <Button onClick={handlePrevCard} disabled={currentCardIndex === 0} variant="outline"><ChevronLeft /></Button>
                    <span className="text-muted-foreground font-medium">Card {currentCardIndex + 1} of {currentReviewCards.length}</span>
                    <Button onClick={handleNextCard} disabled={currentCardIndex === currentReviewCards.length - 1} variant="outline"><ChevronRight /></Button>
                </div>
                 <p className="text-sm text-muted-foreground">Click card or Space/Enter to flip. Use ← → arrows.</p>
            </div>
           <style jsx>{`.perspective{perspective:1500px}.flip-card{background-color:transparent;cursor:pointer;outline:none}.flip-card-inner{position:relative;width:100%;height:100%;text-align:center;transition:transform .7s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d;border-radius:var(--radius)}.flip-card.flipped .flip-card-inner{transform:rotateY(180deg)}.flip-card-front,.flip-card-back{position:absolute;width:100%;height:100%;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:var(--radius);display:flex;flex-direction:column;overflow:hidden}.flip-card-front{color:hsl(var(--card-foreground));background-color:hsl(var(--card)/.7);backdrop-filter:blur(12px);border:1px solid hsl(var(--border)/.6);box-shadow:0 6px 10px -2px #0000001a,0 3px 6px -3px #0000001a}.flip-card-back{transform:rotateY(180deg);background-color:hsl(var(--accent)/.7);backdrop-filter:blur(12px);border:1px solid hsl(var(--border)/.5);box-shadow:0 6px 10px -2px #0000001a,0 3px 6px -3px #0000001a;color:hsl(var(--accent-foreground))}.flip-card-front .flex.items-center.justify-center,.flip-card-back .flex.items-center.justify-center{min-height:100%;height:auto;box-sizing:border-box}`}</style>
        </div> );
   }
   if (viewMode === 'review') { return (<div className="flex flex-col justify-center items-center h-[calc(100vh-8rem)] panel-slide-fade-in"><Alert variant="destructive"><AlertCircle /><AlertTitle>Error</AlertTitle><AlertDescription>Could not load deck/card.</AlertDescription></Alert><Button variant="outline" onClick={handleBackToDecks}><ArrowLeft /> Back</Button></div>); }
   return (<div className="panel-slide-fade-in h-full flex items-center justify-center text-muted-foreground">Invalid state...</div>);
}

