
'use client';

import React, { useState, useRef, useEffect, FormEvent, useCallback, memo } from 'react'; // Added memo, useCallback
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Removed AvatarImage as it wasn't used
import { Send, Loader2, Key, Bot as BotIcon, User, AlertTriangle } from 'lucide-react'; // Renamed Bot to BotIcon, added User, AlertTriangle
import { answerQuestion, type AnswerQuestionInput, type AnswerQuestionOutput } from '@/ai/flows/answer-question';
import { generateGeminiKey, type GenerateGeminiKeyInput, type GenerateGeminiKeyOutput } from '@/ai/flows/generate-gemini-key';
import { useToast } from "@/hooks/use-toast";


interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  isError?: boolean; // Flag for error messages
}

// Memoized Message Bubble Component
const MessageBubble = memo(({ message }: { message: Message }) => {
    // Helper to render message content with potential markdown/code formatting
    const renderMessageContent = useCallback((content: string) => {
        // Basic markdown for bold and code blocks
        let htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        htmlContent = htmlContent.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>'); // Inline code
        // Handle newlines
        htmlContent = htmlContent.replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }, []); // No dependencies, safe to memoize

    const isUser = message.role === 'user';

    return (
        <div
            className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}
        >
            {!isUser && (
                <Avatar className={`w-8 h-8 border ${message.isError ? 'border-destructive' : 'border-primary'}`}>
                    <AvatarFallback className={`${message.isError ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
                        {message.isError ? <AlertTriangle className="w-4 h-4" /> : message.role === 'assistant' ? <BotIcon className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                    </AvatarFallback>
                </Avatar>
            )}
            <div
                className={`p-3 rounded-lg max-w-[75%] shadow-md ${ // Added shadow
                    isUser
                    ? 'bg-primary text-primary-foreground'
                    : message.isError ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
                }`}
            >
                {renderMessageContent(message.content)}
            </div>
            {isUser && (
                <Avatar className="w-8 h-8 border border-muted">
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
            )}
        </div>
    );
});
MessageBubble.displayName = 'MessageBubble'; // Add display name

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null); // Ref for the viewport element
  const inputRef = useRef<HTMLInputElement>(null);

  // Get viewport element reference for scrolling
  useEffect(() => {
    if (scrollAreaRef.current) {
        // Shadcn ScrollArea viewport has data attribute data-radix-scroll-area-viewport
        const viewportElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewportElement) {
            viewportRef.current = viewportElement as HTMLDivElement;
        }
    }
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
    // Focus input after message update or loading stops
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]);


   // Check if the user message indicates a request for a Gemini key
  const requiresGeminiKey = useCallback((text: string): boolean => {
    const keywords = ['gemini key', 'api key', 'generate key', 'need a key', 'create key'];
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }, []); // No dependencies

  const handleSendMessage = useCallback(async (e?: FormEvent) => { // Make event optional for potential programmatic send
    if (e) e.preventDefault();
    const currentInput = input.trim();
    if (!currentInput || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let assistantResponse: Message;

      if (requiresGeminiKey(userMessage.content)) {
        const toolInput: GenerateGeminiKeyInput = { userDescription: userMessage.content };
        
        // Add a message indicating key generation is in progress
        const generatingMessageId = (Date.now() + 1).toString();
        const generatingMessage: Message = { 
            id: generatingMessageId, 
            role: 'tool', 
            content: 'Generating Gemini API Key...' 
        };
        setMessages(prev => [...prev, generatingMessage]);

        const result: GenerateGeminiKeyOutput = await generateGeminiKey(toolInput);

        // Replace the "generating" message with the actual result
        const toolResultMessageContent = `Okay, I've "generated" a Gemini API key for you (this is a simulation):\n\n**API Key:** \`${result.geminiApiKey}\`\n\n**Instructions:**\n${result.instructions}\n\n**Important:** This is a FAKE key for demonstration purposes and will not work with actual Google AI services. To use real AI features, you need a valid Google AI API key set in your .env file.`;
        const toolResultMessage: Message = {
            id: generatingMessageId, 
            role: 'assistant', // Display as an assistant message
            content: toolResultMessageContent
        };
         setMessages(prev => prev.map(msg => msg.id === generatingMessageId ? toolResultMessage : msg));

         toast({
            title: "Simulated Gemini Key Generated",
            description: "The API key and instructions are in the chat. Remember, this is a FAKE key.",
          });

      } else {
        const aiInput: AnswerQuestionInput = { question: userMessage.content };
        // Add placeholder immediately
        const placeholderMessageId = (Date.now() + 1).toString();
        const placeholderMessage: Message = { id: placeholderMessageId, role: 'assistant', content: '...' };
        setMessages(prev => [...prev, placeholderMessage]);

        const result: AnswerQuestionOutput = await answerQuestion(aiInput);

        assistantResponse = {
             id: placeholderMessageId, // Use same ID to replace
             role: 'assistant',
             content: result.answer || 'Sorry, I could not get an answer.' // Handle empty answer
         };
         setMessages(prev => prev.map(msg => msg.id === placeholderMessageId ? assistantResponse : msg));
      }

    } catch (error) {
      console.error("AI Flow Error:", error);
      const errorResponseMessageId = (Date.now() + Date.now().toString().slice(-3)).toString(); 
      let errorMessageContent = `Sorry, I encountered an error processing your request.`;
      let toastDescription = "Failed to get response from AI.";
      let isApiKeyError = false;

      if (error instanceof Error) {
          errorMessageContent += ` Details: ${error.message}`;
          if (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("api_key_invalid")) {
            isApiKeyError = true;
            errorMessageContent = "It seems there's an issue with the AI API key. Please ensure a valid `GOOGLE_GENAI_API_KEY` is set in your project's `.env` file and that the key has access to the Gemini models. You can obtain a key from Google AI Studio.";
            toastDescription = "Invalid or missing AI API Key. Check your .env file.";
          }
      }
      
      const errorMessageUi: Message = {
        id: errorResponseMessageId,
        role: 'assistant',
        content: errorMessageContent,
        isError: true, // Mark as an error message for styling
      };
      
       setMessages(prev => {
            const lastMessage = prev[prev.length -1];
            // If the last message was a placeholder or tool message, replace it with the error.
            if(lastMessage && (lastMessage.role === 'assistant' || lastMessage.role === 'tool') && (lastMessage.content === '...' || lastMessage.content.includes('Generating'))) {
                return prev.map((msg, index) => index === prev.length - 1 ? {...errorMessageUi, id: lastMessage.id } : msg);
            }
            // Otherwise, add the new error message.
            return [...prev, errorMessageUi];
       });

       toast({
        title: isApiKeyError ? "API Key Error" : "Error",
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, requiresGeminiKey, toast]); // Dependencies


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
     setInput(e.target.value);
  }, []); // No dependencies

  return (
    <div className="panel-slide-fade-in h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-3xl font-bold mb-8 text-primary">AI Assistant</h1>
      <Card className="glassmorphism flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-lg text-primary">Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                 <MessageBubble key={message.id} message={message} />
              ))}
               {isLoading && messages.length > 0 && messages[messages.length -1]?.content === '...' && (
                <div className="flex items-start gap-4">
                  <Avatar className="w-8 h-8 border border-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground"><BotIcon className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t border-border/50 p-4">
          <form onSubmit={handleSendMessage} className="flex w-full gap-4">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything or type 'generate gemini key'..."
              className="flex-1 text-base"
              disabled={isLoading}
              aria-label="Chat input"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="hover-glow">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

