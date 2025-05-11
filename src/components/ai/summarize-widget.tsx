'use client';

import React, { useState, useCallback, ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wand2, Loader2, Clipboard, Check, Save, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { summarizeContent, type SummarizeContentInput } from '@/ai/flows/summarize-content-flow';
import { NoteData } from '@/types';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { Folder, Tag } from 'lucide-react'; // Import icons

const NOTES_LOCAL_STORAGE_PREFIX = 'notesLifeOS_'; // To save generated summaries as notes

interface SummarizeWidgetProps {
    className?: string;
    initialContent?: string;
    onSummaryGenerated?: (noteData: NoteData) => void; // Callback when summary is saved
}

export function SummarizeWidget({ className, initialContent = '', onSummaryGenerated }: SummarizeWidgetProps) {
    const [textContent, setTextContent] = useState(initialContent);
    const [sourceUrl, setSourceUrl] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [summaryResult, setSummaryResult] = useState<NoteData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const handleSummarize = useCallback(async () => {
        if (!textContent.trim() || textContent.length < 50) {
            toast({ title: "Input Required", description: "Please provide text content (at least 50 characters) to summarize.", variant: "destructive" });
            return;
        }
        if (sourceUrl && !sourceUrl.match(/^https?:\/\/.+/)) {
            toast({ title: "Invalid URL", description: "Please provide a valid URL (starting with http:// or https://).", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setSummaryResult(null); // Clear previous result
        setIsCopied(false);

        try {
            const input: SummarizeContentInput = {
                textContent,
                sourceUrl: sourceUrl || undefined,
                instructions: customInstructions || undefined,
            };
            const result = await summarizeContent(input); // Expects full NoteData
            setSummaryResult(result);
             toast({ title: "Summary Generated", description: "AI has created a summary." });
        } catch (error) {
            console.error("Summarization error:", error);
            let errorMessage = "Could not generate summary.";
            if (error instanceof Error) errorMessage += ` Error: ${error.message}`;
            toast({ title: "Summarization Failed", description: errorMessage, variant: "destructive" });
            setSummaryResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [textContent, sourceUrl, customInstructions, toast]);

    const handleCopyToClipboard = useCallback(() => {
        if (!summaryResult?.content) return;
        navigator.clipboard.writeText(summaryResult.content)
            .then(() => {
                setIsCopied(true);
                toast({ title: "Copied!", description: "Summary copied to clipboard." });
                setTimeout(() => setIsCopied(false), 2000); // Reset icon after 2 seconds
            })
            .catch(err => {
                console.error("Failed to copy:", err);
                toast({ title: "Copy Failed", description: "Could not copy summary to clipboard.", variant: "destructive" });
            });
    }, [summaryResult, toast]);

    const handleSaveAsNote = useCallback(() => {
        if (!summaryResult) return;

        // Use timestamp + 'summary' as a unique ID for the note
        const noteId = `${summaryResult.generatedAt}-summary`;

        try {
            // Directly save the NoteData object
            localStorage.setItem(`${NOTES_LOCAL_STORAGE_PREFIX}${noteId}`, JSON.stringify(summaryResult));
            toast({ title: "Summary Saved", description: "Summary saved as a new note." });
             if (onSummaryGenerated) {
                onSummaryGenerated(summaryResult); // Notify parent if needed
             }
        } catch (error) {
             console.error("Error saving summary note:", error);
             let description = "Failed to save summary as note.";
             if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                 description = "Failed to save note. Browser storage quota exceeded.";
             }
             toast({ title: "Save Failed", description, variant: "destructive" });
        }

    }, [summaryResult, toast, onSummaryGenerated]);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                    <Wand2 className="w-5 h-5" /> AI Summarizer
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Paste article text, notes, or any content here (min 50 chars)..."
                    value={textContent}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTextContent(e.target.value)}
                    rows={8}
                    className="min-h-[100px]"
                    disabled={isLoading}
                />
                <Input
                    type="url"
                    placeholder="Source URL (Optional)"
                    value={sourceUrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSourceUrl(e.target.value)}
                    disabled={isLoading}
                />
                <Textarea
                    placeholder="Custom Instructions (Optional) - e.g., 'Summarize in 3 bullet points', 'Focus on the main arguments', 'Target audience: beginners'"
                    value={customInstructions}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCustomInstructions(e.target.value)}
                    rows={2}
                    className="min-h-[40px]"
                    disabled={isLoading}
                />
                <Button onClick={handleSummarize} disabled={isLoading || textContent.length < 50} className="w-full hover-glow">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {isLoading ? 'Summarizing...' : 'Generate Summary'}
                </Button>
            </CardContent>

            {summaryResult && (
                <CardFooter className="flex flex-col items-start gap-4 border-t border-border/50 pt-4">
                    <div className="w-full">
                        <h4 className="font-semibold mb-3 text-primary">Generated Summary:</h4>
                         {/* Tags and Category Display */}
                         <div className="flex flex-wrap gap-2 items-center border-b border-border/50 pb-3 mb-3">
                            {summaryResult.category && (
                                 <Badge variant="secondary" className="flex items-center gap-1">
                                     <Folder className="w-3 h-3" />
                                     {summaryResult.category}
                                 </Badge>
                            )}
                             {summaryResult.tags.map(tag => (
                                 <Badge key={tag} variant="outline" className="flex items-center gap-1">
                                     <Tag className="w-3 h-3" />
                                     {tag}
                                 </Badge>
                             ))}
                         </div>
                        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-secondary-foreground leading-relaxed">
                            {summaryResult.content}
                        </ReactMarkdown>
                        {sourceUrl && (
                            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Source
                            </a>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyToClipboard} disabled={isLoading}>
                            {isCopied ? <Check className="w-4 h-4 mr-1" /> : <Clipboard className="w-4 h-4 mr-1" />}
                            {isCopied ? 'Copied' : 'Copy'}
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSaveAsNote} disabled={isLoading}>
                             <Save className="w-4 h-4 mr-1" />
                             Save as Note
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
