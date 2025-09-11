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
  if (!text) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "答案解析"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-line text-sm leading-6">{text}</div>
      </CardContent>
    </Card>
  );
}


