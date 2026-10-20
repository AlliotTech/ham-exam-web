"use client";

import * as React from "react";
import type { QuestionItem } from "@/types/question";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  question: QuestionItem | undefined;
  title?: string;
};

export function ExplanationCard({ question, title }: Props) {
  const text = question?.explanation?.trim();
  const mnemonic = question?.mnemonic?.trim();
  if (!text && !mnemonic) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "答案解析"}</CardTitle>
      </CardHeader>
      <CardContent>
        {text ? (
          <div className="whitespace-pre-line text-sm leading-6">{text}</div>
        ) : null}
        {mnemonic ? (
          <div className="mt-3 rounded-md border border-dashed px-3 py-2 text-sm leading-6">
            <span className="font-medium">💡 助记：</span>
            <span className="whitespace-pre-line">{mnemonic}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


