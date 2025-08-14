export type QuestionOption = {
  key: string;
  text: string;
};

export type QuestionItem = {
  id: string | null;
  codes: { J: string | null; P: string | null };
  question: string;
  options: QuestionOption[];
  answer_keys: string[];
  type: "single" | "multiple";
  pages?: { start: number | null; end: number | null };
  imageUrl?: string | null;
};

// Removed unused ExamSettings

export type UserAnswer = {
  [questionId: string]: string[]; // keys of selected options
};



