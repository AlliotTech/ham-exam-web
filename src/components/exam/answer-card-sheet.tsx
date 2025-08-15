"use client";

import * as React from "react";
import type { QuestionItem } from "@/types/question";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { arraysEqual, sorted } from "@/lib/utils";
import { PreviewableImage } from "@/components/common/PreviewableImage";

export type AnswerCardFilter = "all" | "unanswered" | "flagged";

import type { AnswersMap, FlagsMap } from "@/store/exam";

export type AnswerCardSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  questions: QuestionItem[];
  answers: AnswersMap;
  flags: FlagsMap;
  finished: boolean;
  filter: AnswerCardFilter;
  onChangeFilter: (f: AnswerCardFilter) => void;
  onJumpTo: (index: number) => void;
  currentIndex?: number;
  getKey: (q: QuestionItem, i: number) => string;
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
  getKey,
}: AnswerCardSheetProps) {
  // image preview handled by PreviewableImage
  const answeredCount = React.useMemo(() => {
    let c = 0;
    answers.forEach((ans) => {
      if (ans && ans.length > 0) c++;
    });
    return c;
  }, [answers]);

  const flaggedCount = React.useMemo(() => {
    let c = 0;
    flags.forEach((flagged) => {
      if (flagged) c++;
    });
    return c;
  }, [flags]);

  function firstUnansweredIndex(): number {
    for (let i = 0; i < questions.length; i++) {
      const key = getKey(questions[i], i);
      if (!answers.has(key) || (answers.get(key) || []).length === 0) return i;
    }
    return -1;
  }

  function nextUnansweredIndex(from: number): number {
    for (let i = from + 1; i < questions.length; i++) {
      const key = getKey(questions[i], i);
      if (!answers.has(key) || (answers.get(key) || []).length === 0) return i;
    }
    return -1;
  }

  function nextFlaggedIndex(from: number): number {
    for (let i = from + 1; i < questions.length; i++) {
      const key = getKey(questions[i], i);
      if (flags.get(key)) return i;
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
              const key = getKey(q, i);
              const userAnswer = answers.get(key) || [];
              const isAnswered = userAnswer.length > 0;
              const isFlagged = !!flags.get(key);
              const selectedForFilter =
                filter === "all" ||
                (filter === "unanswered" && !isAnswered) ||
                (filter === "flagged" && isFlagged);
              if (!selectedForFilter) return null;
              const correct = arraysEqual(sorted(userAnswer), sorted(q.answer_keys));
              return (
                <div key={`q-${i}`} className="relative">
                  <button
                    className={
                      "relative h-9 w-full rounded-md border text-sm font-medium transition-colors " +
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
                  {q.imageUrl ? (
                    <PreviewableImage
                      src={q.imageUrl}
                      alt={q.codes?.J ? `题号 ${q.codes.J} 题图` : "题目附图"}
                      title={q.codes?.J ? `题号 ${q.codes.J} 题图` : "题目附图"}
                      renderTrigger={(open) => (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="预览题图"
                          className="absolute -top-1 -left-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded bg-background/90 border text-[10px] leading-none cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            open();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              open();
                            }
                          }}
                        >
                          图
                        </span>
                      )}
                    />
                  ) : null}
                </div>
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
