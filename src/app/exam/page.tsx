"use client";

import * as React from "react";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

import { formatMs } from "@/lib/utils";

import { useSearchParams } from "next/navigation";
import { BottomBar } from "@/components/exam/bottom-bar";
import { useNoSiteFooter } from "@/hooks/useNoSiteFooter";
import { useQuestionShortcuts } from "@/hooks/useQuestionShortcuts";
import { AnswerCardSheet } from "@/components/exam/answer-card-sheet";
import { QuestionProgressHeader } from "@/components/common/question-progress-header";
import { useCountdown } from "@/hooks/useCountdown";
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
import { useExamStore } from "@/store/exam";

// Helper to get a unique key for a question
const getKeyByStrategy = (q: QuestionItem | undefined, pos: number) => {
  if (!q) return `pos:${pos}`;
  return (q.id || q.codes?.J || `pos:${pos}`).toString();
};

function ExamClient() {
  const [loading, setLoading] = useState(true);
  // UI state remains in component
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answerCardOpen, setAnswerCardOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unanswered" | "flagged">("all");
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorText, setErrorText] = useState<string>("");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState<ExamSavedState | null>(null);
  const autoHelpShownRef = useRef(false);

  const search = useSearchParams();
  const bankParam = (search.get("bank") as QuestionBank | null) ?? "A";
  const rule = getRule(bankParam);

  // Zustand store selectors
  const {
    questions,
    currentIndex,
    answers,
    flags,
    finished,
    endAtMs,
    startExam,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    answer: setAnswer,
    toggleFlag,
    submit: submitExam,
    loadSavedState,
    reset: resetExam,
  } = useExamStore();

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  const answeredCount = useMemo(() => {
    let count = 0;
    answers.forEach((a) => {
      if (a && a.length > 0) count++;
    });
    return count;
  }, [answers]);
  const flaggedCount = useMemo(() => {
    let count = 0;
    flags.forEach((f) => {
      if (f) count++;
    });
    return count;
  }, [flags]);

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

  useNoSiteFooter();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const allQuestions = await loadQuestions(bankParam, { strict: true });
        const saved = loadExamSavedState(bankParam);

        if (saved && shouldResumeExam(saved)) {
          setPendingResume(saved);
          setResumeOpen(true);
          // Reconstruct questions for immediate resume
          const picked = reconstructPickedQuestions(allQuestions, saved);
          // Pre-load questions into store but wait for user confirmation to load the rest
          loadSavedState({ questions: picked, endAtMs: saved.endAtMs });
          return;
        }

        // Fresh start
        const singles = allQuestions.filter((q) => q.type === "single");
        const multiples = allQuestions.filter((q) => q.type === "multiple");
        const takeSingles = Math.min(rule.singles, singles.length);
        const takeMultiples = Math.min(rule.multiples, multiples.length);
        const pickedSingles = shuffle(singles).slice(0, takeSingles);
        const pickedMultiples = shuffle(multiples).slice(0, takeMultiples);
        let picked = [...pickedSingles, ...pickedMultiples];
        if (picked.length < rule.total) {
          const remainingPool = shuffle(allQuestions.filter((q) => !picked.includes(q)));
          picked = picked.concat(remainingPool.slice(0, Math.max(0, rule.total - picked.length)));
        }
        picked = shuffle(picked).slice(0, rule.total);
        startExam(bankParam, picked, rule.minutes);
      } catch {
        setErrorText(`题库 ${bankParam} 暂不可用`);
        setErrorOpen(true);
      } finally {
        setLoading(false);
      }
    })();
    
    return () => {
      resetExam();
    }
  }, [bankParam, rule.minutes, rule.multiples, rule.singles, rule.total, startExam, loadSavedState, resetExam]);

  function reconstructPickedQuestions(all: QuestionItem[], saved: ExamSavedState): QuestionItem[] {
    if (saved.questionIds && saved.questionIds.length > 0) {
      const byId = new Map(all.map(q => [(q.id || q.codes?.J || '').toString(), q]));
      const restored = saved.questionIds.map(id => id ? byId.get(id) : undefined).filter(Boolean) as QuestionItem[];
      if (restored.length === saved.total) return restored;
    }
    if (saved.questionsSnapshot && saved.questionsSnapshot.length > 0) {
      return saved.questionsSnapshot.slice(0, saved.total);
    }
    return all.slice(0, Math.min(saved.total, all.length));
  }

  const percent = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  function handleSubmit() {
    submitExam();
    setResultOpen(true);
    clearExamSavedState(bankParam);
  }

  const remainingMs = useCountdown(endAtMs, () => {
    if (!finished) {
      handleSubmit();
    }
  });

  const currentKey = getKeyByStrategy(currentQuestion, currentIndex);
  const selectedAnswers = answers.get(currentKey) || [];

  function setCurrentAnswer(newAnswer: string[]) {
    setAnswer(currentKey, newAnswer);
  }

  useQuestionShortcuts({
    onPrev: prevQuestion,
    onNext: nextQuestion,
    onSelectDigit: (n, detail) => {
      const opt = currentQuestion?.options?.[n - 1];
      if (!opt) return;
      if (currentQuestion?.type === "multiple") {
        const isStrict = detail?.shiftKey === true || detail?.metaKey === true;
        if (isStrict) {
          setCurrentAnswer([opt.key]);
        } else {
          const newSelection = new Set(selectedAnswers);
          if (newSelection.has(opt.key)) newSelection.delete(opt.key);
          else newSelection.add(opt.key);
          setCurrentAnswer(Array.from(newSelection));
        }
      } else {
        setCurrentAnswer([opt.key]);
      }
    },
  });

  useEffect(() => {
    if (autoHelpShownRef.current || typeof window === "undefined") return;
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

  const { score, passed } = useMemo(() => {
    const answersRecord: Record<string, string[]> = {};
    answers.forEach((value, key) => {
      answersRecord[key] = value;
    });
    const scoreResult = calculateScore(questions, answersRecord, getKeyByStrategy);
    const passedResult = isPassed(scoreResult.correct, rule.pass);
    return { score: scoreResult, passed: passedResult };
  }, [answers, questions, rule.pass]);

  function handleToggleFlag() {
    if (!currentQuestion) return;
    toggleFlag(currentKey);
  }

  function setFilterAndPersist(v: typeof filter) {
    setFilter(v);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(`exam:answerCardFilter:${bankParam}`, v);
      } catch {}
    }
  }

  useEffect(() => {
    if (!questions.length || !endAtMs || finished) return;
    
    const answersByPosition: (string[] | null)[] = [];
    const flagsByPosition: boolean[] = [];
    for(let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const key = getKeyByStrategy(q, i);
      const ans = answers.get(key);
      answersByPosition.push(ans && ans.length ? [...ans] : null);
      flagsByPosition.push(!!flags.get(key));
    }

    const state: ExamSavedState = {
      version: 1,
      bank: bankParam,
      timestamp: Date.now(),
      endAtMs: endAtMs,
      index: currentIndex,
      answersByPosition,
      flagsByPosition,
      total: questions.length,
      questionIds: questions.map((q) => (q.id || q.codes?.J || null)),
    };
    saveExamState(state);
  }, [answers, flags, currentIndex, endAtMs, questions, bankParam, finished]);

  useEffect(() => {
    if (finished || !endAtMs) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "考试仍在进行，离开将可能导致进度丢失";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [finished, endAtMs]);

  function handleResumeConfirm() {
    if (!pendingResume) return;
    const restoredAnswers = new Map<string, string[]>();
    const restoredFlags = new Map<string, boolean>();
    for (let pos = 0; pos < questions.length; pos++) {
      const q = questions[pos];
      const key = getKeyByStrategy(q, pos);
      const ans = pendingResume.answersByPosition[pos] || null;
      if (ans && ans.length) restoredAnswers.set(key, ans);
      if (pendingResume.flagsByPosition[pos]) restoredFlags.set(key, true);
    }
    loadSavedState({
      answers: restoredAnswers,
      flags: restoredFlags,
      currentIndex: Math.min(Math.max(pendingResume.index, 0), questions.length - 1),
      endAtMs: pendingResume.endAtMs,
    });
    setResumeOpen(false);
    setPendingResume(null);
  }

  function handleRestartConfirm() {
    clearExamSavedState(bankParam);
    startExam(bankParam, questions, rule.minutes);
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
        index={currentIndex}
        total={questions.length}
        question={currentQuestion}
        selected={selectedAnswers}
        onChange={setCurrentAnswer}
        showImmediateAnswer={finished}
        readOnly={finished}
      />

      <BottomBar
        statsNode={
          <>
            已作答 {answeredCount} / {questions.length}｜标记 {flaggedCount}
          </>
        }
        left={
          <Button
            onClick={prevQuestion}
            disabled={currentIndex === 0}
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
              onClick={handleToggleFlag}
              className="active:scale-[0.98] transition-transform"
            >
              {flags.get(currentKey) ? "取消标记" : "标记"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAnswerCardOpen(true)}
              className="active:scale-[0.98] transition-transform"
            >
              答题卡
            </Button>
            <Button
              onClick={nextQuestion}
              disabled={currentIndex === questions.length - 1}
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
              onClick={prevQuestion}
              disabled={currentIndex === 0}
              variant="secondary"
            >
              上一题
            </Button>
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              onClick={nextQuestion}
              disabled={currentIndex === questions.length - 1}
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
              onClick={handleToggleFlag}
            >
              {flags.get(currentKey) ? "取消标记" : "标记"}
            </Button>
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              variant="outline"
              onClick={() => setAnswerCardOpen(true)}
            >
              答题卡
            </Button>
            <Button
              className="w-full active:scale-[0.98] transition-transform"
              onClick={() => setConfirmOpen(true)}
              variant="destructive"
              disabled={finished}
            >
              交卷
            </Button>
          </div>
        }
      />

      <ExamResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        correct={score.correct}
        total={score.total}
        passed={passed}
        passLine={rule.pass}
      />

      <AnswerCardSheet
        open={answerCardOpen}
        onOpenChange={setAnswerCardOpen}
        questions={questions}
        answers={answers}
        flags={flags}
        finished={finished}
        filter={filter}
        onChangeFilter={setFilterAndPersist}
        onJumpTo={jumpToQuestion}
        currentIndex={currentIndex}
        getKey={getKeyByStrategy}
      />

      <ExamSubmitConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          handleSubmit();
        }}
        total={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
      />

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
