'use client';

import React, { useState, useEffect, ChangeEvent, useCallback, useRef, memo, KeyboardEvent } from 'react';
// import { useAuth } from '@/hooks/use-auth'; // Already imported below
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Trash2, FileText, Loader2, AlertCircle, Tag, X as XIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StudyMaterial } from '@/types';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns'; // Added parseISO, isValid
import { useAuth } from '@/hooks/use-auth';
import { loadUserData, saveUserData } from '@/lib/local-storage';

const MATERIALS_SUFFIX = 'materials';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const MaterialItem = memo(({ material, onDelete }: { material: StudyMaterial, onDelete: (id: string, name: string) => void }) => {
    const uploadDate = material.uploadDate && isValid(new Date(material.uploadDate)) ? new Date(material.uploadDate) : new Date();
    return (
        <div
            className="flex items-start sm:items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors flex-col sm:flex-row gap-3"
        >
            <div className="flex items-start gap-3 overflow-hidden w-full sm:w-auto">
                <FileText className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate text-secondary-foreground">{material.name}</span>
                    <span className="text-xs text-muted-foreground">Uploaded: {format(uploadDate, 'PP')}</span>
                    {material.tags && material.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {material.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive-foreground hover:bg-destructive hover-glow flex-shrink-0 mt-2 sm:mt-0 ml-auto sm:ml-0"
                onClick={() => onDelete(material.id, material.name)}
                aria-label={`Delete ${material.name}`}
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );
});
MaterialItem.displayName = 'MaterialItem';

export default function MaterialsPage() {
  const { userId, loading: authLoading } = useAuth();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     const fetchMaterials = () => {
         if (!authLoading && userId && !hasFetched) {
            setIsPageLoading(true);
            try {
                const loadedMaterials = loadUserData<StudyMaterial[]>(userId, MATERIALS_SUFFIX) || [];
                const materialsWithDates = loadedMaterials.map(m => ({
                    ...m,
                    uploadDate: m.uploadDate && isValid(parseISO(m.uploadDate)) ? parseISO(m.uploadDate) : new Date()
                }));
                setMaterials(materialsWithDates.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
                setHasFetched(true);
            } catch (error) {
                console.error("Error loading materials from localStorage:", error);
                toast({ title: "Error Loading Materials", description: "Could not fetch your study materials.", variant: "destructive" });
            } finally {
                setIsPageLoading(false);
            }
         } else if (!authLoading && !userId) {
             setMaterials([]);
             setHasFetched(false);
             setIsPageLoading(false);
         } else if (hasFetched) {
              setIsPageLoading(false);
         }
     };
     fetchMaterials();
  }, [userId, authLoading, hasFetched, toast]);

  const saveMaterialsToStorage = useCallback((updatedMaterials: StudyMaterial[]) => {
        if (!userId) return;
        // Convert Date objects to ISO strings before saving
        const materialsToSave = updatedMaterials.map(m => ({
            ...m,
            uploadDate: new Date(m.uploadDate).toISOString()
        }));
        saveUserData(userId, MATERIALS_SUFFIX, materialsToSave);
        // Update state with Date objects for display
        setMaterials(updatedMaterials.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
   }, [userId]);


  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            toast({ title: "Invalid File Type", description: "Please select a PDF file.", variant: "destructive" });
            setSelectedFile(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
         if (file.size > MAX_FILE_SIZE_BYTES) {
             toast({ title: "File Too Large", description: `Please select a PDF file smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
             setSelectedFile(null);
             if(fileInputRef.current) fileInputRef.current.value = '';
             return;
         }
      setSelectedFile(file);
    } else {
        setSelectedFile(null);
    }
  }, [toast]);

  const handleTagInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const newTag = tagInput.trim().toLowerCase();
          if (newTag && !tags.includes(newTag) && tags.length < 5) { // Limit number of tags
              setTags([...tags, newTag]);
          } else if (tags.length >= 5) {
              toast({title: "Tag Limit Reached", description: "You can add up to 5 tags.", variant: "default"});
          }
          setTagInput('');
      } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
          setTags(tags.slice(0, -1));
      }
  };

  const removeTag = (tagToRemove: string) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = useCallback(() => {
    if (!selectedFile || isUploading || !userId) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);

    reader.onload = () => {
        try {
            const newMaterial: StudyMaterial = {
                id: `mat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                name: selectedFile.name,
                dataUri: reader.result as string,
                fileType: selectedFile.type,
                fileSize: selectedFile.size,
                uploadDate: new Date(), // Use Date object here
                tags: tags.map(t => t.toLowerCase()),
                userId: userId,
                isImported: false,
            };

            const updatedMaterials = [newMaterial, ...materials];
            saveMaterialsToStorage(updatedMaterials);

            toast({
              title: "Upload Successful",
              description: `${selectedFile.name} added.`,
            });
            setSelectedFile(null);
            setTags([]);
            setTagInput('');
            if(fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
             console.error("Error processing or saving file:", error);
             toast({ title: "Upload Failed", description: `Could not save material. ${error.message || ''}`, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = (error) => {
         console.error("Error reading file:", error);
         toast({ title: "Upload Failed", description: "Could not read the file.", variant: "destructive" });
         setIsUploading(false);
    }
  }, [selectedFile, isUploading, tags, toast, userId, materials, saveMaterialsToStorage]);


  const handleDelete = useCallback((id: string, name: string) => {
    if (!userId) return;
    try {
        const updatedMaterials = materials.filter(material => material.id !== id);
        saveMaterialsToStorage(updatedMaterials);
        toast({ title: "Material Deleted", description: `${name} has been removed.` });
    } catch (error) {
         toast({ title: "Delete Failed", description: "Could not delete material.", variant: "destructive" });
    }
  }, [userId, materials, saveMaterialsToStorage, toast]);


   if (authLoading || isPageLoading) {
     return (
       <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
         <span className="ml-2 text-muted-foreground">Loading Materials...</span>
       </div>
     );
   }

    if (!userId) {
        return <div className="text-muted-foreground p-4 text-center">Please log in to manage materials.</div>;
    }

  return (
    <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-primary">Study Materials</h1>
       <Alert variant="default" className="border-primary/50 bg-primary/10">
           <AlertCircle className="h-4 w-4 text-primary" />
           <AlertTitle className="text-primary">Storage Notice</AlertTitle>
           <AlertDescription className="text-primary/90">
             PDF files are stored directly in your browser's localStorage. Max file size: {MAX_FILE_SIZE_MB}MB. Large files may impact performance.
           </AlertDescription>
       </Alert>
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <Upload className="w-5 h-5" /> Upload New PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="flex-1 file:text-primary file:font-medium cursor-pointer"
                    disabled={isUploading || isPageLoading}
                />
                <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading || isPageLoading}
                    className="w-full sm:w-auto hover-glow"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isUploading ? 'Processing...' : 'Upload'}
                </Button>
            </div>
             <div className="space-y-2">
                <label htmlFor="tags-input" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Tag className="w-4 h-4" /> Add Tags (Optional, up to 5)</label>
                 <div className={cn(
                     "flex flex-wrap gap-2 items-center rounded-md border border-input bg-background p-2 min-h-[40px]",
                     (isUploading || isPageLoading) && "opacity-50 cursor-not-allowed"
                 )}>
                    {tags.map(tag => (
                         <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <button
                                onClick={() => removeTag(tag)}
                                className="ml-1 rounded-full opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
                                disabled={isUploading || isPageLoading}
                                aria-label={`Remove tag ${tag}`}
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                         </Badge>
                     ))}
                     <Input
                         id="tags-input"
                         type="text"
                         placeholder="Type and press Enter..."
                         value={tagInput}
                         onChange={handleTagInputChange}
                         onKeyDown={handleTagInputKeyDown}
                         className="flex-1 border-none shadow-none focus-visible:ring-0 h-auto p-0 bg-transparent text-sm"
                         disabled={isUploading || isPageLoading || tags.length >=5}
                     />
                </div>
             </div>
        </CardContent>
         {selectedFile && !isUploading && (
            <CardFooter className="text-sm text-muted-foreground">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </CardFooter>
        )}
      </Card>
      <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-primary">Uploaded Materials</CardTitle>
           {isUploading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6">
            {materials.length === 0 && !isPageLoading ? (
              <p className="text-center text-muted-foreground mt-4">No materials uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {materials.map((material) => (
                  <MaterialItem
                    key={material.id}
                    material={material}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
