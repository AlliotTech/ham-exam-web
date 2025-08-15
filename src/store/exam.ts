
import { create } from 'zustand';
import type { QuestionBank } from '@/lib/load-questions';
import type { QuestionItem } from '@/types/question';

// Using a Map for answers for easier manipulation and potentially better performance with many questions.
export type AnswersMap = Map<string, string[]>;
export type FlagsMap = Map<string, boolean>;

export interface ExamState {
  bank: QuestionBank | null;
  questions: QuestionItem[];
  answers: AnswersMap;
  flags: FlagsMap;
  currentIndex: number;
  finished: boolean;
  endAtMs: number | null;
  startTime: number | null;

  // Derived state selectors
  currentQuestion: () => QuestionItem | undefined;
  answeredCount: () => number;
  flaggedCount: () => number;
  isCurrentFlagged: () => boolean;
}

export interface ExamActions {
  startExam: (bank: QuestionBank, questions: QuestionItem[], durationMinutes: number) => void;
  answer: (questionKey: string, answer: string[]) => void;
  toggleFlag: (questionKey: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;
  submit: () => void;
  loadSavedState: (state: Partial<ExamState>) => void;
  reset: () => void;
}

export type ExamStore = ExamState & ExamActions;

const initialState: Omit<ExamState, 'currentQuestion' | 'answeredCount' | 'flaggedCount' | 'isCurrentFlagged'> = {
  bank: null,
  questions: [],
  answers: new Map(),
  flags: new Map(),
  currentIndex: 0,
  finished: false,
  endAtMs: null,
  startTime: null,
};

export const useExamStore = create<ExamStore>((set, get) => ({
  ...initialState,

  // Derived state selectors
  currentQuestion: () => get().questions[get().currentIndex],
  answeredCount: () => {
    let count = 0;
    get().answers.forEach((ans) => {
      if (ans && ans.length > 0) {
        count++;
      }
    });
    return count;
  },
  flaggedCount: () => {
    let count = 0;
    get().flags.forEach((flagged) => {
      if (flagged) {
        count++;
      }
    });
    return count;
  },
  isCurrentFlagged: () => {
    const current = get().currentQuestion();
    if (!current) return false;
    // Assuming questionKey is based on index for simplicity here.
    // This might need to be adjusted based on the actual keying strategy.
    const key = (current.id || current.codes?.J || get().currentIndex).toString();
    return !!get().flags.get(key);
  },

  // Actions
  startExam: (bank, questions, durationMinutes) => {
    const startTime = Date.now();
    const endAtMs = startTime + durationMinutes * 60 * 1000;
    set({
      ...initialState,
      bank,
      questions,
      startTime,
      endAtMs,
    });
  },

  answer: (questionKey, answer) => {
    set((state) => ({
      answers: new Map(state.answers).set(questionKey, answer),
    }));
  },

  toggleFlag: (questionKey) => {
    set((state) => ({
      flags: new Map(state.flags).set(questionKey, !state.flags.get(questionKey)),
    }));
  },

  nextQuestion: () => {
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    }));
  },

  prevQuestion: () => {
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    }));
  },

  jumpToQuestion: (index) => {
    set((state) => ({
      currentIndex: Math.max(0, Math.min(index, state.questions.length - 1)),
    }));
  },

  submit: () => {
    set({ finished: true });
  },

  loadSavedState: (saved) => {
    set({ ...saved });
  },

  reset: () => {
    set(initialState);
  },
}));
