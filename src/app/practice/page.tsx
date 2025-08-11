"use client";

import * as React from "react";
import { Suspense, useEffect, useState } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function PracticeClient() {
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});
  const [order, setOrder] = useState<"sequential" | "random">("sequential");
  const [showAnswer, setShowAnswer] = useState<boolean>(true);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState<null | SavedState>(null);

  const search = useSearchParams();
  const bankParam = (search.get("bank") as QuestionBank | null) ?? "A";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const qs = await loadQuestions(bankParam as QuestionBank, { strict: true });
        setAllQuestions(qs);
        setQuestions(order === "random" ? shuffle(qs) : qs);
        setIndex(0);
        setAnswers({});
      } catch {
        alert(`题库 ${bankParam} 暂不可用`);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankParam]);

  // After loading questions, check if there is a saved progress to optionally resume (only for sequential)
  useEffect(() => {
    if (!allQuestions.length) return;
    if (order !== "sequential") return;
    const saved = loadSavedState(bankParam);
    if (!saved) return;
    // Validate saved state
    if (saved.total !== allQuestions.length) return;
    if (saved.order !== "sequential") return;
    setPendingResume(saved);
    setResumeOpen(true);
    // do not auto-apply; wait for user choice
  }, [bankParam, allQuestions, order]);

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

  function applyOrder(nextOrder: "sequential" | "random") {
    setOrder(nextOrder);
    if (!allQuestions.length) return;
    if (nextOrder === "random") {
      setQuestions(shuffle(allQuestions));
    } else {
      setQuestions(allQuestions);
    }
    setIndex(0);
    setAnswers({});
    // When switching to sequential, if there is a saved record, prompt to resume
    if (nextOrder === "sequential") {
      const saved = loadSavedState(bankParam);
      if (saved && saved.order === "sequential" && saved.total === allQuestions.length) {
        setPendingResume(saved);
        setResumeOpen(true);
      }
    }
  }

  // Persist progress (only in sequential mode)
  useEffect(() => {
    if (!questions.length) return;
    if (order !== "sequential") return;
    const orderIndices = questions.map((q) => allQuestions.indexOf(q));
    if (orderIndices.some((i) => i < 0)) return;
    const answersByPosition: (string[] | null)[] = orderIndices.map((_, pos) => {
      const q = questions[pos];
      const key = q?.id ?? String(pos);
      return answers[key] ? [...answers[key]] : null;
    });
    const payload: SavedState = {
      version: 1,
      bank: bankParam as QuestionBank,
      timestamp: Date.now(),
      index,
      order,
      showAnswer,
      orderIndices,
      answersByPosition,
      total: allQuestions.length,
    };
    saveState(payload);
  }, [allQuestions, questions, index, answers, order, showAnswer, bankParam]);

  function handleResume() {
    if (!pendingResume) return;
    const { order: savedOrder, orderIndices, answersByPosition, index: savedIndex } = pendingResume;
    // Apply order and reconstruct questions
    const qs = allQuestions;
    const reconstructed = orderIndices.map((orig) => qs[orig]).filter(Boolean) as QuestionItem[];
    setQuestions(reconstructed);
    setOrder(savedOrder);
    // Rebuild answers keyed by current position-dependent keys
    const restored: UserAnswer = {};
    reconstructed.forEach((q, pos) => {
      const key = q.id ?? String(pos);
      const val = answersByPosition[pos];
      if (val && val.length) restored[key] = val;
    });
    setAnswers(restored);
    setIndex(Math.min(Math.max(savedIndex, 0), reconstructed.length - 1));
    setShowAnswer(pendingResume.showAnswer);
    setResumeOpen(false);
    setPendingResume(null);
  }

  function handleRestart() {
    clearSavedState(bankParam);
    // Reset to current order setting
    if (order === "random") setQuestions(shuffle(allQuestions));
    else setQuestions(allQuestions);
    setIndex(0);
    setAnswers({});
    setResumeOpen(false);
    setPendingResume(null);
  }

  if (loading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发现上次练习记录</DialogTitle>
            <DialogDescription>
              是否加载到上次练习的位置，还是重新开始？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleRestart}>重新开始</Button>
            <Button onClick={handleResume}>继续上次</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">顺序/随机</span>
            <RadioGroup
              className="flex items-center gap-4"
              value={order}
              onValueChange={(v) => applyOrder((v as "sequential" | "random"))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sequential" id="order-seq" />
                <Label htmlFor="order-seq">顺序</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="random" id="order-rand" />
                <Label htmlFor="order-rand">随机</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="show-ans" checked={showAnswer} onCheckedChange={(v) => setShowAnswer(!!v)} />
            <Label htmlFor="show-ans">显示正确答案</Label>
          </div>
        </div>
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
        showImmediateAnswer={showAnswer}
      />

      <div className="flex justify-between">
        <Button onClick={prev} disabled={index === 0} variant="secondary">
          上一题
        </Button>
        <div className="text-sm text-muted-foreground">
          已作答 {Object.keys(answers).length} / {questions.length}
        </div>
        <Button onClick={next} disabled={index === questions.length - 1}>
          下一题
        </Button>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6">加载中...</div>}>
      <PracticeClient />
    </Suspense>
  );
}

// ---------- Local persistence helpers ----------
type SavedState = {
  version: 1;
  bank: QuestionBank;
  timestamp: number;
  index: number;
  order: "sequential" | "random";
  showAnswer: boolean;
  orderIndices: number[];
  answersByPosition: (string[] | null)[];
  total: number;
};

function storageKey(bank: string | null): string {
  return `practice:${bank ?? "default"}`;
}

function loadSavedState(bank: string | null): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bank));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (parsed && parsed.version === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveState(state: SavedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(state.bank), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearSavedState(bank: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(bank));
  } catch {
    // ignore
  }
}


