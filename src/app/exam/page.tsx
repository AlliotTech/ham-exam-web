"use client";

import * as React from "react";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { formatMs } from "@/lib/utils";

import { useSearchParams } from "next/navigation";
import { BottomBar } from "@/components/exam/bottom-bar";
import { useNoSiteFooter } from "@/hooks/useNoSiteFooter";
import { useQuestionShortcuts } from "@/hooks/useQuestionShortcuts";
import { AnswerCardSheet } from "@/components/exam/answer-card-sheet";
import { QuestionProgressHeader } from "@/components/common/question-progress-header";
import { useCountdown } from "@/hooks/useCountdown";
import { useQuestionNavigator } from "@/hooks/useQuestionNavigator";
import { ExamSettingsDialog } from "@/components/exam/ExamSettingsDialog";
import { ExamResultDialog } from "@/components/exam/ExamResultDialog";
import { ExamSubmitConfirmDialog } from "@/components/exam/ExamSubmitConfirmDialog";
import { MessageDialog } from "@/components/common/MessageDialog";
import { getRule } from "@/lib/exam-rules";
import { calculateScore, isPassed } from "@/lib/exam";
import {
  clearExamSavedState,
  loadExamSavedState,
  saveExamState,
  shouldResumeExam,
  type ExamSavedState,
} from "@/lib/exam-storage";
import { ExamResumeDialog } from "@/components/exam/ExamResumeDialog";

// Rules centralized in lib/exam-rules

function ExamClient() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  // managed by useQuestionNavigator below
  const [finished, setFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoHelpShownRef = useRef(false);
  const [endAtMs, setEndAtMs] = useState<number | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answerCardOpen, setAnswerCardOpen] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "unanswered" | "flagged">("all");
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorText, setErrorText] = useState<string>("");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState<ExamSavedState | null>(null);

  const search = useSearchParams();
  const bankParam = (search.get("bank") as QuestionBank | null) ?? "A";
  const rule = getRule(bankParam);

  const {
    index,
    setIndex,
    selected: selectedFromHook,
    setCurrentAnswer,
    answers,
    setAnswers,
    answeredCount,
    next,
    prev,
  getKeyByStrategy,
  } = useQuestionNavigator({ questions, keyStrategy: "position" });

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
        // Try resume
        const saved = loadExamSavedState(bankParam);
        if (saved && shouldResumeExam(saved)) {
          setPendingResume(saved);
          setResumeOpen(true);
          // Prepare questions to allow immediate resume when user确认
          const picked = reconstructPickedQuestions(qs, saved);
          setQuestions(picked);
          setEndAtMs(saved.endAtMs);
          // answers/flags/index will be applied on Confirm Resume
          return;
        }

        // Fresh start
        const singles = qs.filter((q) => q.type === "single");
        const multiples = qs.filter((q) => q.type === "multiple");
        const takeSingles = Math.min(rule.singles, singles.length);
        const takeMultiples = Math.min(rule.multiples, multiples.length);
        const pickedSingles = shuffle(singles).slice(0, takeSingles);
        const pickedMultiples = shuffle(multiples).slice(0, takeMultiples);
        let picked = [...pickedSingles, ...pickedMultiples];
        if (picked.length < rule.total) {
          const remainingPool = shuffle(qs.filter((q) => !picked.includes(q)));
          picked = picked.concat(remainingPool.slice(0, Math.max(0, rule.total - picked.length)));
        }
        picked = shuffle(picked).slice(0, rule.total);
        setQuestions(picked);
        setIndex(0);
        setAnswers({});
        setFlags({});
        const duration = rule.minutes * 60 * 1000;
        const end = Date.now() + duration;
        setEndAtMs(end);
      } catch {
        setErrorText(`题库 ${bankParam} 暂不可用`);
        setErrorOpen(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [bankParam, rule.minutes, rule.multiples, rule.singles, rule.total, setIndex, setAnswers]);

  function reconstructPickedQuestions(all: QuestionItem[], saved: ExamSavedState): QuestionItem[] {
    // Prefer reconstruct by questionIds
    if (saved.questionIds && saved.questionIds.length > 0) {
      const byId = new Map<string, QuestionItem>();
      for (const q of all) {
        const id = (q.id || q.codes?.J || "").toString();
        if (id) byId.set(id, q);
      }
      const restored = saved.questionIds.map((id) => {
        if (!id) return undefined;
        return byId.get(id) as QuestionItem | undefined;
      }).filter(Boolean) as QuestionItem[];
      if (restored.length === saved.total) return restored;
    }
    // Fallback: snapshot
    if (saved.questionsSnapshot && saved.questionsSnapshot.length > 0) {
      return saved.questionsSnapshot.slice(0, saved.total);
    }
    // Worst fallback: pick fresh and ignore resume
    return all.slice(0, Math.min(saved.total, all.length));
  }

  const current = questions[index];
  const selected = current ? selectedFromHook : [];
  const percent = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  // replaced by useQuestionNavigator

  function submit() {
    setFinished(true);
    setResultOpen(true);
    clearExamSavedState(bankParam);
  }

  const remaining = useCountdown(endAtMs, () => {
    setFinished(true);
    setResultOpen(true);
    clearExamSavedState(bankParam);
  });
  const remainingMs = remaining;

  // Keyboard shortcuts: Left/Right to navigate; 1-9 to pick option
  useQuestionShortcuts({
    onPrev: prev,
    onNext: next,
    onSelectDigit: (n, detail) => {
      const opt = current?.options?.[n - 1];
      if (!opt) return;
      if (current?.type === "multiple") {
        const isStrict = detail?.shiftKey === true || detail?.metaKey === true;
        if (isStrict) {
          setCurrentAnswer([opt.key]);
        } else {
          const set = new Set(selected);
          if (set.has(opt.key)) set.delete(opt.key);
          else set.add(opt.key);
          setCurrentAnswer(Array.from(set));
        }
      } else {
        setCurrentAnswer([opt.key]);
      }
    },
  });

  // One-time settings auto prompt
  useEffect(() => {
    if (autoHelpShownRef.current) return;
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("ui:shortcutsHelpSeen:exam") === "1";
    if (seen) {
      autoHelpShownRef.current = true;
      return;
    }
    if (questions.length) {
      autoHelpShownRef.current = true;
      const timer = setTimeout(() => {
        setSettingsOpen(true);
        try {
          window.localStorage.setItem("ui:shortcutsHelpSeen:exam", "1");
        } catch {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [questions.length]);

  const score = useMemo(
    () => calculateScore(questions, answers, getKeyByStrategy),
    [answers, questions, getKeyByStrategy],
  );
  const passed = isPassed(score.correct, rule.pass);

  // Derived helpers
  // provided by useQuestionNavigator

  function toggleFlagCurrent() {
    const q = current;
    if (!q) return;
    const key = getKeyByStrategy(q, index);
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setFilterAndPersist(v: typeof filter) {
    setFilter(v);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(`exam:answerCardFilter:${bankParam}`, v);
      } catch {}
    }
  }

  // Persist progress periodically and on critical changes
  useEffect(() => {
    if (!questions.length) return;
    if (!endAtMs) return;
    if (finished) return; // do not persist after finish
    const answersByPosition: (string[] | null)[] = questions.map((q, pos) => {
      const key = getKeyByStrategy(q, pos);
      const v = answers[key];
      return v && v.length ? [...v] : null;
    });
    const flagsByPosition: boolean[] = questions.map((q, pos) => {
      const key = getKeyByStrategy(q, pos);
      return !!flags[key];
    });
    const state: ExamSavedState = {
      version: 1,
      bank: bankParam as QuestionBank,
      timestamp: Date.now(),
      endAtMs: endAtMs,
      index,
      answersByPosition,
      flagsByPosition,
      total: questions.length,
      questionIds: questions.map((q) => (q.id || q.codes?.J || null)),
    };
    saveExamState(state);
  }, [answers, flags, index, endAtMs, questions, bankParam, finished, getKeyByStrategy]);

  // Intercept page unload during active exam
  useEffect(() => {
    if (finished) return;
    if (!endAtMs) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "考试仍在进行，离开将可能导致进度丢失";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [finished, endAtMs]);

  function handleResumeConfirm() {
    if (!pendingResume) return;
    // Rebuild answers/flags/index
    const restoredAnswers: Record<string, string[]> = {};
    const restoredFlags: Record<string, boolean> = {};
    for (let pos = 0; pos < questions.length; pos++) {
      const q = questions[pos];
      const key = getKeyByStrategy(q, pos);
      const ans = pendingResume.answersByPosition[pos] || null;
      if (ans && ans.length) restoredAnswers[key] = ans;
      const flagged = !!pendingResume.flagsByPosition[pos];
      if (flagged) restoredFlags[key] = true;
    }
    setAnswers(restoredAnswers);
    setFlags(restoredFlags);
    setIndex(Math.min(Math.max(pendingResume.index, 0), questions.length - 1));
    setEndAtMs(pendingResume.endAtMs);
    setResumeOpen(false);
    setPendingResume(null);
  }

  function handleRestartConfirm() {
    clearExamSavedState(bankParam);
    // Reset to current picked questions & timer
    setIndex(0);
    setAnswers({});
    setFlags({});
    const duration = rule.minutes * 60 * 1000;
    const end = Date.now() + duration;
    setEndAtMs(end);
    setResumeOpen(false);
    setPendingResume(null);
  }

  if (loading) return <div className="p-6" aria-live="polite">加载题库中...</div>;
  if (!questions.length) return <div className="p-6" role="alert">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4 pb-28 sm:pb-20">
      <QuestionProgressHeader
        percent={percent}
        right={
          <Button
            size="icon"
            variant="outline"
            aria-label="设置"
            title="设置"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        }
        meta={
          <>
            考试类别：{bankParam} 类｜试题数：{rule.total}（单选 {rule.singles}，多选{" "}
            {rule.multiples}）｜限时：{rule.minutes} 分钟｜剩余时间：
            <span className={remainingMs <= 60_000 ? "text-red-600" : ""} aria-live="polite">{formatMs(remainingMs)}</span>
          </>
        }
      />
      {/* Mobile info grid */}
      <div className="sm:hidden grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div>考试类别：{bankParam} 类</div>
        <div>
          试题数：{rule.total}（单选 {rule.singles}，多选 {rule.multiples}）
        </div>
        <div>限时：{rule.minutes} 分钟</div>
        <div>
          剩余：
          <span className={remainingMs <= 60_000 ? "text-red-600" : ""} aria-live="polite">{formatMs(remainingMs)}</span>
        </div>
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
        statsNode={
          <>
            已作答 {answeredCount} / {questions.length}｜标记{" "}
            {Object.values(flags).filter(Boolean).length}
          </>
        }
        left={
          <Button
            onClick={prev}
            disabled={index === 0}
            variant="secondary"
            className="active:scale-[0.98] transition-transform"
          >
            上一题
          </Button>
        }
        right={
          <>
            <Button
              variant="outline"
              onClick={toggleFlagCurrent}
              className="active:scale-[0.98] transition-transform"
            >
              {flags[getKeyByStrategy(current, index)] ? "取消标记" : "标记"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAnswerCardOpen(true);
              }}
              className="active:scale-[0.98] transition-transform"
            >
              答题卡
            </Button>
            <Button
              onClick={next}
              disabled={index === questions.length - 1}
              className="active:scale-[0.98] transition-transform"
            >
              下一题
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              variant="destructive"
              disabled={finished}
              className="active:scale-[0.98] transition-transform"
            >
              交卷
            </Button>
          </>
        }
        mobileTop={
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              onClick={prev}
              disabled={index === 0}
              variant="secondary"
            >
              上一题
            </Button>
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              onClick={next}
              disabled={index === questions.length - 1}
            >
              下一题
            </Button>
          </div>
        }
        mobileBottom={
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              variant="outline"
              onClick={toggleFlagCurrent}
            >
              {flags[getKeyByStrategy(current, index)] ? "取消标记" : "标记"}
            </Button>
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              variant="outline"
              onClick={() => {
                setAnswerCardOpen(true);
              }}
            >
              答题卡
            </Button>
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              onClick={() => {
                setConfirmOpen(true);
              }}
              variant="destructive"
              disabled={finished}
            >
              交卷
            </Button>
          </div>
        }
      />

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        {/* Replaced by ExamResultDialog below */}
      </Dialog>
      <ExamResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        correct={score.correct}
        total={score.total}
        passed={passed}
        passLine={rule.pass}
      />

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
        currentIndex={index}
      />

      {/* Submit Confirm Dialog */}
      <ExamSubmitConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          submit();
        }}
        total={questions.length}
        answeredCount={answeredCount}
        flaggedCount={Object.values(flags).filter(Boolean).length}
      />

      {/* Settings Dialog */}
      <ExamSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExamResumeDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        expiresInMs={Math.max(0, (pendingResume?.endAtMs ?? Date.now()) - Date.now())}
        answeredCount={(pendingResume?.answersByPosition || []).filter(Boolean).length}
        total={pendingResume?.total || questions.length}
        onResume={handleResumeConfirm}
        onRestart={handleRestartConfirm}
      />
      <MessageDialog
        open={errorOpen}
        onOpenChange={setErrorOpen}
        title="加载失败"
        description={errorText}
        confirmText="知道了"
      />
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
