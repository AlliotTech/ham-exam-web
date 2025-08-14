"use client";

import * as React from "react";
import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { arraysEqual, sorted } from "@/lib/utils";
 
import { useSearchParams } from "next/navigation";
import { BottomBar } from "@/components/exam/bottom-bar";
import { useNoSiteFooter } from "@/hooks/useNoSiteFooter";
import { useQuestionShortcuts } from "@/hooks/useQuestionShortcuts";
import { AnswerCardSheet } from "@/components/exam/answer-card-sheet";
import { QuestionProgressHeader } from "@/components/common/question-progress-header";
import { useCountdown } from "@/hooks/useCountdown";

type ExamRule = { total: number; singles: number; multiples: number; minutes: number; pass: number };
const RULES: Record<QuestionBank, ExamRule> = {
  A: { total: 40, singles: 32, multiples: 8, minutes: 40, pass: 30 },
  B: { total: 60, singles: 45, multiples: 15, minutes: 60, pass: 45 },
  C: { total: 90, singles: 70, multiples: 20, minutes: 90, pass: 70 },
};

function ExamClient() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});
  const [finished, setFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoHelpShownRef = useRef(false);
  const [endAtMs, setEndAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [resultOpen, setResultOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answerCardOpen, setAnswerCardOpen] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "unanswered" | "flagged">("all");

  const search = useSearchParams();
  const bankParam = (search.get("bank") as QuestionBank | null) ?? "A";
  const rule = RULES[bankParam] ?? RULES.A;

  // Load persisted filter preference per bank
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = `exam:answerCardFilter:${bankParam}`;
      const v = window.localStorage.getItem(key) as typeof filter | null;
      if (v === "all" || v === "unanswered" || v === "flagged") setFilter(v);
      else setFilter("all");
    } catch {}
  }, [bankParam]);

  useEffect(() => {
    // no-op retained to preserve hook ordering if needed
    return;
  }, []);
  useNoSiteFooter();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const qs = await loadQuestions(bankParam as QuestionBank, { strict: true });
        const singles = qs.filter((q) => q.type === "single");
        const multiples = qs.filter((q) => q.type === "multiple");
        const takeSingles = Math.min(rule.singles, singles.length);
        const takeMultiples = Math.min(rule.multiples, multiples.length);
        const pickedSingles = shuffle(singles).slice(0, takeSingles);
        const pickedMultiples = shuffle(multiples).slice(0, takeMultiples);
        let picked = [...pickedSingles, ...pickedMultiples];
        // If total not met (unlikely), fill from remaining pool
        if (picked.length < rule.total) {
          const remainingPool = shuffle(
            qs.filter((q) => !picked.includes(q))
          );
          picked = picked.concat(remainingPool.slice(0, Math.max(0, rule.total - picked.length)));
        }
        // Randomize order for the exam
        picked = shuffle(picked).slice(0, rule.total);
        setQuestions(picked);
        setIndex(0);
        setAnswers({});
        setFlags({});
        // Setup timer
        const duration = rule.minutes * 60 * 1000;
        const end = Date.now() + duration;
        setEndAtMs(end);
        setRemainingMs(duration);
      } catch {
        alert(`题库 ${bankParam} 暂不可用`);
      } finally {
        setLoading(false);
      }
    })();
  }, [bankParam, rule.minutes, rule.multiples, rule.singles, rule.total]);

  const current = questions[index];
  const selected = current ? answers[String(index)] ?? [] : [];
  const percent = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  const setCurrentAnswer = useCallback((keys: string[]) => {
    if (!current) return;
    const key = String(index);
    setAnswers((prev) => ({ ...prev, [key]: keys }));
  }, [current, index]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  function submit() {
    setFinished(true);
    setResultOpen(true);
  }

  const remaining = useCountdown(endAtMs, () => {
    setFinished(true);
    setResultOpen(true);
  });
  useEffect(() => { setRemainingMs(remaining); }, [remaining]);

  function formatMs(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Keyboard shortcuts: Left/Right to navigate; 1-9 to pick option
  useQuestionShortcuts({
    onPrev: prev,
    onNext: next,
    onSelectDigit: (n) => {
      const opt = current?.options?.[n - 1];
      if (opt) setCurrentAnswer([opt.key]);
    },
  });

  // One-time settings auto prompt
  useEffect(() => {
    if (autoHelpShownRef.current) return;
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem('ui:shortcutsHelpSeen:exam') === '1';
    if (seen) { autoHelpShownRef.current = true; return; }
    if (questions.length) {
      autoHelpShownRef.current = true;
      const timer = setTimeout(() => {
        setSettingsOpen(true);
        try { window.localStorage.setItem('ui:shortcutsHelpSeen:exam', '1'); } catch {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [questions.length]);

  const score = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const key = String(i);
      const s = answers[key] ?? [];
      if (arraysEqual(sorted(s), sorted(q.answer_keys))) correct += 1;
    }
    return { correct, total: questions.length };
  }, [answers, questions]);
  const passed = score.correct >= rule.pass;

  // Derived helpers
  const answeredCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < questions.length; i++) {
      const key = String(i);
      if ((answers[key] ?? []).length > 0) c += 1;
    }
    return c;
  }, [answers, questions]);

  function keyOf(pos: number): string {
    return String(pos);
  }

  function toggleFlagCurrent() {
    const q = current;
    if (!q) return;
    const key = keyOf(index);
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  

  function setFilterAndPersist(v: typeof filter) {
    setFilter(v);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(`exam:answerCardFilter:${bankParam}`, v); } catch {}
    }
  }

  if (loading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4 pb-28 sm:pb-20">
      <QuestionProgressHeader
        percent={percent}
        right={(
          <Button size="icon" variant="outline" aria-label="设置" title="设置" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
        meta={(
          <>考试类别：{bankParam} 类｜试题数：{rule.total}（单选 {rule.singles}，多选 {rule.multiples}）｜限时：{rule.minutes} 分钟｜剩余时间：<span className={remainingMs <= 60_000 ? "text-red-600" : ""}>{formatMs(remainingMs)}</span></>
        )}
      />
      {/* Mobile info grid */}
      <div className="sm:hidden grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div>考试类别：{bankParam} 类</div>
        <div>试题数：{rule.total}（单选 {rule.singles}，多选 {rule.multiples}）</div>
        <div>限时：{rule.minutes} 分钟</div>
        <div>剩余：<span className={remainingMs <= 60_000 ? "text-red-600" : ""}>{formatMs(remainingMs)}</span></div>
      </div>

      <QuestionCard
        index={index}
        total={questions.length}
        question={current}
        selected={selected}
        onChange={setCurrentAnswer}
        showImmediateAnswer={finished}
        readOnly={finished}
      />

      <BottomBar
        statsNode={<>已作答 {answeredCount} / {questions.length}｜标记 {Object.values(flags).filter(Boolean).length}</>}
        left={<Button onClick={prev} disabled={index === 0} variant="secondary" className="active:scale-[0.98] transition-transform">上一题</Button>}
        right={(
          <>
            <Button variant="outline" onClick={toggleFlagCurrent} className="active:scale-[0.98] transition-transform">{flags[String(index)] ? "取消标记" : "标记"}</Button>
            <Button variant="outline" onClick={() => { setAnswerCardOpen(true); }} className="active:scale-[0.98] transition-transform">答题卡</Button>
            <Button onClick={next} disabled={index === questions.length - 1} className="active:scale-[0.98] transition-transform">下一题</Button>
            <Button onClick={() => setConfirmOpen(true)} variant="destructive" disabled={finished} className="active:scale-[0.98] transition-transform">交卷</Button>
          </>
        )}
        mobileTop={(
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full active:scale-[0.98] transition-transform" onClick={prev} disabled={index === 0} variant="secondary">上一题</Button>
            <Button className="w-full active:scale-[0.98] transition-transform" onClick={next} disabled={index === questions.length - 1}>下一题</Button>
          </div>
        )}
        mobileBottom={(
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button className="w-full active:scale-[0.98] transition-transform" variant="outline" onClick={toggleFlagCurrent}>{flags[String(index)] ? "取消标记" : "标记"}</Button>
            <Button className="w-full active:scale-[0.98] transition-transform" variant="outline" onClick={() => { setAnswerCardOpen(true); }}>答题卡</Button>
            <Button className="w-full active:scale-[0.98] transition-transform" onClick={() => { setConfirmOpen(true); }} variant="destructive" disabled={finished}>交卷</Button>
          </div>
        )}
      />

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>成绩</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              得分：{score.correct} / {score.total}
            </div>
            <div className="text-sm text-muted-foreground">正确率：{Math.round((score.correct / score.total) * 100)}%</div>
            <div className={`text-sm ${passed ? "text-green-600" : "text-red-600"}`}>
              {passed ? "合格" : "不合格"}（合格线：{rule.pass} 题）
            </div>
            <div className="text-xs text-muted-foreground">交卷后可继续浏览题目查看答案。</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Answer Card Sheet */}
      <AnswerCardSheet
        open={answerCardOpen}
        onOpenChange={setAnswerCardOpen}
        questions={questions}
        answers={answers}
        flags={flags}
        finished={finished}
        filter={filter}
        onChangeFilter={setFilterAndPersist}
        onJumpTo={(i) => setIndex(i)}
      />

      {/* Submit Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认交卷？</DialogTitle>
            <DialogDescription>交卷后将停止计时，答案将不可修改，但可以浏览查看正确答案与成绩。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => { setConfirmOpen(false); submit(); }}>确认交卷</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>快捷键与考试说明</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground">快捷键</div>
              <div className="flex items-center justify-between">
                <span>上一题 / 下一题</span>
                <code className="px-2 py-0.5 rounded border bg-muted">← / →</code>
              </div>
              <div className="flex items-center justify-between">
                <span>选择选项（单选）</span>
                <code className="px-2 py-0.5 rounded border bg-muted">1-9</code>
              </div>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              考试规则：A 类 40 题（单选 32，多选 8），40 分钟，30 题合格；B 类 60 题（单选 45，多选 15），60 分钟，45 题合格；C 类 90 题（单选 70，多选 20），90 分钟，70 题合格。多选题需与标准答案完全一致，否则不得分。
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

 

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="p-6">加载中...</div>}>
      <ExamClient />
    </Suspense>
  );
}


