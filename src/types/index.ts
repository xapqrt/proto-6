// All dates are stored as ISO strings in localStorage for simplicity.
// Conversion to Date objects happens in components when needed.

export interface Goal {
  id: string;
  name: string;
  description?: string | null;
  type: 'long-term' | 'short-term'; // Consider string if enums are problematic with some DBs
  targetDate?: string | null; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  userId: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  dueDate?: string | null; // ISO string
  priority?: 'low' | 'medium' | 'high' | null; // Consider string
  goalId?: string | null;
  completedAt?: string | null; // ISO string
  userId: string;
}

export interface TimerSession {
  id: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  duration: number;  // Seconds
  mode: 'pomodoro' | 'shortBreak' | 'longBreak'; // Consider string
  associatedTaskId?: string | null;
  userId: string;
}

export interface StudyMaterial {
  id: string;
  name: string;
  dataUri?: string | null; // For localStorage
  fileType?: string | null;
  fileSize?: number | null;
  uploadDate: string; // ISO string
  tags: string[];
  isImported: boolean; // True if from JSON import, false if uploaded PDF
  userId: string;
}

export interface HabitLog {
  id: string;       // Usually habitId + date string for uniqueness
  date: string;     // ISO string (YYYY-MM-DD or full ISO)
  completed: boolean;
  userId: string;
  habitId: string;
}

export interface Habit {
  id: string;
  name: string;
  createdAt: string; // ISO string
  userId: string;
}

export interface Note {
  id: string;
  name?: string | null;
  content: string; // Markdown content
  tags: string[];
  category: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  userId: string;
  materialId?: string | null; // Link to StudyMaterial ID if generated from PDF
}

// Used by AI flows for generated notes, transient structure
export interface NoteData {
  content: string;
  tags: string[];
  category: string;
  generatedAt: number; // Timestamp (number)
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deckId: string;
  // userId?: string; // Optional: If cards can be owned independently of decks later
}

export interface Deck {
    id: string;
    name: string;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    userId: string;
    sourceId?: string | null; // e.g., StudyMaterial.id if generated from it
    sourceType?: 'material' | 'note' | 'import' | 'manual' | null;
    // For localStorage, avoid storing the full flashcards array here.
    // Instead, flashcards will be stored under a separate key like `flashcards_deckId`.
    // We can store a count if needed for quick display.
    cardCount?: number; // Optional: maintain count of cards
}
