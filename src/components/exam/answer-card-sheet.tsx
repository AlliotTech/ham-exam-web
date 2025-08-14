"use client";

import * as React from "react";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { arraysEqual, sorted } from "@/lib/utils";

export type AnswerCardFilter = "all" | "unanswered" | "flagged";

export type AnswerCardSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  questions: QuestionItem[];
  answers: UserAnswer;
  flags: Record<string, boolean>;
  finished: boolean;
  filter: AnswerCardFilter;
  onChangeFilter: (f: AnswerCardFilter) => void;
  onJumpTo: (index: number) => void;
  currentIndex?: number;
};

export function AnswerCardSheet({
  open,
  onOpenChange,
  questions,
  answers,
  flags,
  finished,
  filter,
  onChangeFilter,
  onJumpTo,
  currentIndex = 0,
}: AnswerCardSheetProps) {
  const answeredCount = React.useMemo(() => {
    let c = 0;
    for (let i = 0; i < questions.length; i++) {
      const key = String(i);
      if ((answers[key] ?? []).length > 0) c += 1;
    }
    return c;
  }, [answers, questions]);

  const flaggedCount = React.useMemo(() => Object.values(flags).filter(Boolean).length, [flags]);

  function firstUnansweredIndex(): number {
    for (let i = 0; i < questions.length; i++) {
      const key = String(i);
      if (!(answers[key] && answers[key].length)) return i;
    }
    return -1;
  }

  function nextUnansweredIndex(from: number): number {
    for (let i = from + 1; i < questions.length; i++) {
      const key = String(i);
      if (!(answers[key] && answers[key].length)) return i;
    }
    return -1;
  }

  function nextFlaggedIndex(from: number): number {
    for (let i = from + 1; i < questions.length; i++) {
      const key = String(i);
      if (!!flags[key]) return i;
    }
    return -1;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>答题卡</SheetTitle>
        </SheetHeader>
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="text-muted-foreground">
              已答 {answeredCount} / {questions.length}｜标记 {flaggedCount}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => onChangeFilter("all")}
              >
                全部
              </Button>
              <Button
                size="sm"
                variant={filter === "unanswered" ? "default" : "outline"}
                onClick={() => onChangeFilter("unanswered")}
              >
                未答
              </Button>
              <Button
                size="sm"
                variant={filter === "flagged" ? "default" : "outline"}
                onClick={() => onChangeFilter("flagged")}
              >
                标记
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">点击题号跳转</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const i = firstUnansweredIndex();
                  if (i >= 0) {
                    onJumpTo(i);
                    onOpenChange(false);
                  }
                }}
              >
                首个未答
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const i = nextUnansweredIndex(currentIndex ?? -1);
                  if (i >= 0) {
                    onJumpTo(i);
                    onOpenChange(false);
                  }
                }}
              >
                下一个未答
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const i = nextFlaggedIndex(currentIndex ?? -1);
                  if (i >= 0) {
                    onJumpTo(i);
                    onOpenChange(false);
                  }
                }}
              >
                下一个标记
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {questions.map((q, i) => {
               const key = String(i);
              const isAnswered = (answers[key] ?? []).length > 0;
              const isFlagged = !!flags[key];
              const selectedForFilter =
                filter === "all" ||
                (filter === "unanswered" && !isAnswered) ||
                (filter === "flagged" && isFlagged);
              if (!selectedForFilter) return null;
              const userSel = answers[key] ?? [];
              const correct = arraysEqual(sorted(userSel), sorted(q.answer_keys));
              return (
                <button
                  key={`q-${i}`}
                  className={
                    "relative h-9 rounded-md border text-sm font-medium transition-colors " +
                    (isAnswered ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
                  }
                  onClick={() => {
                    onJumpTo(i);
                    onOpenChange(false);
                  }}
                >
                   <span>{i + 1}</span>
                  {isFlagged ? (
                    <span className="absolute -top-1 -right-1 inline-block size-3 rounded-full bg-yellow-400" />
                  ) : null}
                   {finished ? (
                    <Badge
                      variant="secondary"
                      className={
                        "absolute -bottom-1 -right-1 px-1 py-0 text-[10px] " +
                        (correct ? "bg-green-600 text-white" : "bg-red-600 text-white")
                      }
                    >
                      {correct ? "✓" : "✗"}
                    </Badge>
                   ) : null}
                </button>
              );
            })}
          </div>
          {finished ? (
            <div className="pt-2 text-xs text-muted-foreground flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-green-600" /> 正确</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-red-600" /> 错误</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-yellow-400" /> 已标记</span>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
