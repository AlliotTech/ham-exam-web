"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { loadQuestions, shuffle } from "@/lib/load-questions";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

const DEFAULT_EXAM_SIZE = 50;

export default function ExamPage() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      const qs = await loadQuestions();
      const picked = shuffle(qs).slice(0, DEFAULT_EXAM_SIZE);
      setQuestions(picked);
      setLoading(false);
    })();
  }, []);

  const current = questions[index];
  const selected = current ? answers[current.id ?? String(index)] ?? [] : [];
  const percent = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  function setCurrentAnswer(keys: string[]) {
    if (!current) return;
    const key = current.id ?? String(index);
    setAnswers((prev) => ({ ...prev, [key]: keys }));
  }

  function next() {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }
  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  function submit() {
    setFinished(true);
  }

  const score = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const key = q.id ?? String(i);
      const s = answers[key] ?? [];
      if (arraysEqual(sorted(s), sorted(q.answer_keys))) correct += 1;
    }
    return { correct, total: questions.length };
  }, [answers, questions]);

  if (loading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">暂无题目</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="min-w-24 text-sm text-muted-foreground">进度 {percent}%</div>
        <Progress value={percent} className="h-2" />
      </div>

      <QuestionCard
        index={index}
        total={questions.length}
        question={current}
        selected={selected}
        onChange={setCurrentAnswer}
      />

      <div className="flex justify-between">
        <Button onClick={prev} disabled={index === 0} variant="secondary">
          上一题
        </Button>
        <div className="text-sm text-muted-foreground">
          已作答 {Object.keys(answers).length} / {questions.length}
        </div>
        <div className="flex gap-2">
          <Button onClick={next} disabled={index === questions.length - 1}>
            下一题
          </Button>
          <Button onClick={submit} variant="outline">
            交卷
          </Button>
        </div>
      </div>

      <Dialog open={finished} onOpenChange={setFinished}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>成绩</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              得分：{score.correct} / {score.total}
            </div>
            <div className="text-sm text-muted-foreground">正确率：{Math.round((score.correct / score.total) * 100)}%</div>
            <div className="text-xs text-muted-foreground">交卷后可继续浏览题目查看答案。</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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


