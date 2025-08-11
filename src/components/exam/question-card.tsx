"use client";

import * as React from "react";
import type { QuestionItem } from "@/types/question";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

type Props = {
  index: number;
  total: number;
  question: QuestionItem;
  selected: string[];
  onChange: (keys: string[]) => void;
  showImmediateAnswer?: boolean;
};

export function QuestionCard({ index, total, question, selected, onChange, showImmediateAnswer }: Props) {
  const isMultiple = question.type === "multiple";

  function toggleMulti(key: string) {
    const set = new Set(selected);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onChange(Array.from(set));
  }

  const showAnswer = showImmediateAnswer ?? false;
  const isCorrect = selected.length > 0 && arraysEqual(sorted(selected), sorted(question.answer_keys));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>
            第 {index + 1} / {total} 题
          </span>
          <Badge variant="secondary">{question.type === "single" ? "单选" : question.type === "multiple" ? "多选" : "判断"}</Badge>
          {question.pages?.start ? (
            <Badge variant="outline">P.{question.pages.start}{question.pages?.end && question.pages.end !== question.pages.start ? `-${question.pages.end}` : ""}</Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="whitespace-pre-line">{question.question}</div>
        <div className="space-y-2">
          {isMultiple ? (
            <div className="grid gap-2">
              {question.options.map((opt) => (
                <label key={opt.key} className="flex items-start gap-2">
                  <Checkbox
                    checked={selected.includes(opt.key)}
                    onCheckedChange={() => toggleMulti(opt.key)}
                  />
                  <span className="whitespace-pre-line">
                    <strong className="mr-2">{opt.key}.</strong>
                    {opt.text}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <RadioGroup value={selected[0] ?? ""} onValueChange={(v) => onChange(v ? [v] : [])}>
              {question.options.map((opt) => (
                <div key={opt.key} className="flex items-start gap-2">
                  <RadioGroupItem value={opt.key} id={`${question.id}-${opt.key}`} />
                  <Label htmlFor={`${question.id}-${opt.key}`} className="whitespace-pre-line cursor-pointer">
                    <strong className="mr-2">{opt.key}.</strong>
                    {opt.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {showAnswer && (
          <div className="text-sm text-muted-foreground">
            正确答案：{question.answer_keys.join(", ")}
            {selected.length > 0 ? (
              <span className={`ml-2 ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                {isCorrect ? "已答对" : `作答：${selected.join(", ")}`}
              </span>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function sorted<T>(arr: T[]): T[] {
  return [...arr].sort();
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}



