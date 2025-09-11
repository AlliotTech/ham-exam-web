
import { create } from 'zustand';
import type { QuestionBank, QuestionItem } from '@/lib/load-questions';
import { shuffle } from '@/lib/load-questions';

export type PracticeMode = 'sequential' | 'random';
export type AnswersMap = Map<string, string[]>;

export interface PracticeState {
  bank: QuestionBank | null;
  allQuestions: QuestionItem[];
  questions: QuestionItem[];
  currentIndex: number;
  answers: AnswersMap;
  order: PracticeMode;
  showAnswer: boolean;
  showExplanation: boolean;
  isLoading: boolean;
}

export interface PracticeActions {
  loadBank: (bank: QuestionBank, questions: QuestionItem[]) => void;
  setOrder: (order: PracticeMode) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;
  answer: (questionKey: string, answer: string[]) => void;
  toggleShowAnswer: () => void;
  toggleShowExplanation: () => void;
  reset: () => void;
  applySavedState: (saved: {
    order: PracticeMode;
    questions: QuestionItem[];
    answers: AnswersMap;
    currentIndex: number;
    showAnswer: boolean;
    showExplanation: boolean;
  }) => void;
}

export type PracticeStore = PracticeState & PracticeActions;

const initialState: PracticeState = {
  bank: null,
  allQuestions: [],
  questions: [],
  currentIndex: 0,
  answers: new Map(),
  order: 'sequential',
  showAnswer: true,
  showExplanation: true,
  isLoading: true,
};

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  ...initialState,

  loadBank: (bank, questions) => {
    set({
      ...initialState,
      bank,
      allQuestions: questions,
      questions: questions, // Default to sequential
      isLoading: false,
    });
  },

  setOrder: (order) => {
    const { allQuestions } = get();
    const newQuestions = order === 'random' ? shuffle([...allQuestions]) : [...allQuestions];
    set({
      order,
      questions: newQuestions,
      currentIndex: 0,
      answers: new Map(),
    });
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

  answer: (questionKey, answer) => {
    set((state) => ({
      answers: new Map(state.answers).set(questionKey, answer),
    }));
  },

  toggleShowAnswer: () => {
    set((state) => ({ showAnswer: !state.showAnswer }));
  },

  toggleShowExplanation: () => {
    set((state) => ({ showExplanation: !state.showExplanation }));
  },

  applySavedState: (saved) => {
    set({
      order: saved.order,
      questions: saved.questions,
      answers: saved.answers,
      currentIndex: saved.currentIndex,
      showAnswer: saved.showAnswer,
      showExplanation: saved.showExplanation,
    });
  },

  reset: () => {
    set(initialState);
  },
}));
