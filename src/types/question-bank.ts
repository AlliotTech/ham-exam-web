export interface QuestionBankInfo {
  path: string;
  description: string;
}

export interface QuestionVersion {
  id: string;
  name: string;
  description: string;
  isLatest: boolean;
  banks: {
    A: QuestionBankInfo;
    B: QuestionBankInfo;
    C: QuestionBankInfo;
  };
  updatedAt: string;
}

export interface QuestionBankConfig {
  versions: QuestionVersion[];
}

export type QuestionVersionId = string;
export type QuestionBankType = "A" | "B" | "C";
