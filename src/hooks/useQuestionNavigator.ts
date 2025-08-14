import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuestionItem, UserAnswer } from "@/types/question";

export type KeyStrategy = "position" | "id-prefer";

export type UseQuestionNavigatorOptions = {
  questions: QuestionItem[];
  keyStrategy: KeyStrategy;
};

export type UseQuestionNavigatorResult = {
  index: number;
  setIndex: (i: number) => void;
  selected: string[];
  setCurrentAnswer: (keys: string[]) => void;
  answers: UserAnswer;
  setAnswers: React.Dispatch<React.SetStateAction<UserAnswer>>;
  answeredCount: number;
  next: () => void;
  prev: () => void;
  reset: () => void;
  getKeyByStrategy: (q: QuestionItem | undefined, pos: number) => string;
};

export function useQuestionNavigator(
  opts: UseQuestionNavigatorOptions,
): UseQuestionNavigatorResult {
  const { questions, keyStrategy } = opts;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});

  // Keep index within bounds if questions change
  useEffect(() => {
    setIndex((i) => {
      if (!questions.length) return 0;
      return Math.min(Math.max(i, 0), questions.length - 1);
    });
  }, [questions.length]);

  const current = questions[index];

  const keyOf = useCallback(
    (q: QuestionItem | undefined, pos: number): string => {
      if (keyStrategy === "position") return String(pos);
      const id = q?.id;
      return id ? String(id) : String(pos);
    },
    [keyStrategy],
  );

  const selected = useMemo(() => {
    if (!current) return [] as string[];
    const key = keyOf(current, index);
    return answers[key] ?? [];
  }, [answers, current, index, keyOf]);

  const setCurrentAnswer = useCallback(
    (keys: string[]) => {
      if (!current) return;
      const key = keyOf(current, index);
      setAnswers((prev) => ({ ...prev, [key]: keys }));
    },
    [current, index, keyOf],
  );

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const answeredCount = useMemo(() => {
    if (!questions.length) return 0;
    let c = 0;
    for (let i = 0; i < questions.length; i++) {
      const k = keyOf(questions[i], i);
      if ((answers[k] ?? []).length > 0) c += 1;
    }
    return c;
  }, [answers, questions, keyOf]);

  const reset = useCallback(() => {
    setIndex(0);
    setAnswers({});
  }, []);

  return {
    index,
    setIndex,
    selected,
    setCurrentAnswer,
    answers,
    setAnswers,
    answeredCount,
    next,
    prev,
    reset,
    getKeyByStrategy: keyOf,
  };
}
