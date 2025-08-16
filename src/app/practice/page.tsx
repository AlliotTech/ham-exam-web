"use client";

import * as React from "react";
import { Suspense, useEffect, useState, useRef, useDeferredValue, useMemo } from "react";
import { loadQuestions, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Search, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { BottomBar } from "@/components/exam/bottom-bar";
import { useNoSiteFooter } from "@/hooks/useNoSiteFooter";
import { useQuestionShortcuts } from "@/hooks/useQuestionShortcuts";
import { QuestionProgressHeader } from "@/components/common/question-progress-header";
import { PracticeResumeDialog } from "@/components/practice/PracticeResumeDialog";
import { PracticeSettingsDialog } from "@/components/practice/PracticeSettingsDialog";
import { PracticeSearchDialog } from "@/components/practice/PracticeSearchDialog";
import { MessageDialog } from "@/components/common/MessageDialog";
import {
  clearSavedState,
  loadLastMode,
  loadNoResume,
  loadSavedState,
  normalizeJ,
  saveLastMode,
  saveNoResume,
  saveState,
  shouldResume,
  type SavedState,
} from "@/lib/practice-storage";
import { usePracticeStore, type AnswersMap } from "@/store/practice";

const getKeyByStrategy = (q: QuestionItem | undefined, pos: number) => {
  if (!q) return `pos:${pos}`;
  return (q.id || q.codes?.J || `pos:${pos}`).toString();
};

function PracticeClient() {
  useNoSiteFooter();
  // Component-level UI state
  const [jumpInput, setJumpInput] = useState("");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState<null | SavedState>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noPromptThisBank, setNoPromptThisBank] = useState(false);
  const autoHelpShownRef = useRef(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorText, setErrorText] = useState<string>("");

  const search = useSearchParams();
  const bankParam = (search.get("bank") as QuestionBank | null) ?? "A";

  const {
    allQuestions,
    questions,
    currentIndex,
    answers,
    order,
    showAnswer,
    isLoading,
    loadBank,
    setOrder,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    answer,
    toggleShowAnswer,
    reset,
    applySavedState,
  } = usePracticeStore();

  // Initialize 'no prompt for this bank' checkbox from storage
  useEffect(() => {
    setNoPromptThisBank(!!loadNoResume(bankParam));
  }, [bankParam]);

  // Load questions for the bank
  useEffect(() => {
    (async () => {
      try {
        const qs = await loadQuestions(bankParam, { strict: true });
        loadBank(bankParam, qs);
      } catch {
        setErrorText(`题库 ${bankParam} 暂不可用`);
        setErrorOpen(true);
      }
    })();
    
    return () => {
      reset();
    }
  }, [bankParam, loadBank, reset]);

  // Initialize order from last saved preference
  useEffect(() => {
    if (isLoading) return;
    const last = loadLastMode();
    if (last && last !== order) {
      setOrder(last);
    }
  }, [isLoading, order, setOrder]);

  // Check for saved progress to resume
  useEffect(() => {
    if (isLoading || order !== "sequential" || loadNoResume(bankParam)) return;
    const lastMode = loadLastMode();
    if (lastMode === "random") return;
    
    const saved = loadSavedState(bankParam);
    if (saved && saved.total === allQuestions.length && saved.order === "sequential" && shouldResume(saved)) {
      setPendingResume(saved);
      setResumeOpen(true);
    }
  }, [bankParam, allQuestions.length, order, isLoading]);

  const currentQuestion = questions[currentIndex];
  const selectedAnswers = currentQuestion ? answers.get(getKeyByStrategy(currentQuestion, currentIndex)) || [] : [];
  const percent = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  function handleSetOrder(nextOrder: "sequential" | "random") {
    setOrder(nextOrder);
    saveLastMode(nextOrder);
    // Prompt for resume if switching to sequential and a valid save exists
    if (nextOrder === "sequential") {
      const saved = loadSavedState(bankParam);
      if (saved && saved.order === "sequential" && saved.total === allQuestions.length && !loadNoResume(bankParam) && shouldResume(saved)) {
        setPendingResume(saved);
        setResumeOpen(true);
      }
    }
  }

  function handleSetCurrentAnswer(newAnswer: string[]) {
    if (!currentQuestion) return;
    const key = getKeyByStrategy(currentQuestion, currentIndex);
    answer(key, newAnswer);
  }

  // Persist progress (sequential mode only)
  useEffect(() => {
    if (isLoading || order !== "sequential") return;

    const answersByPosition: (string[] | null)[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const key = getKeyByStrategy(q, i);
      const ans = answers.get(key);
      answersByPosition.push(ans && ans.length > 0 ? [...ans] : null);
    }

    if (currentIndex === 0 && answersByPosition.filter(Boolean).length === 0) return;

    // Build order indices relative to original question set; if any missing, skip saving to avoid misalignm
    const orderIndices = questions.map((q) => allQuestions.indexOf(q));
    if (orderIndices.some((i) => i < 0)) return;

    const payload: SavedState = {
      version: 1,
      bank: bankParam,
      timestamp: Date.now(),
      index: currentIndex,
      order,
      showAnswer,
      orderIndices,
      answersByPosition,
      total: allQuestions.length,
    };
    saveState(payload);
  }, [allQuestions, questions, currentIndex, answers, order, showAnswer, bankParam, isLoading]);

  // Search functionality
  const deferredJump = useDeferredValue(jumpInput);
  const jumpQueryUpper = useMemo(() => {
    if (order !== "sequential") return "";
    return deferredJump.trim().toUpperCase();
  }, [order, deferredJump]);

  const computedMatches = useMemo(() => {
    if (!jumpQueryUpper) return [] as { pos: number; j: string; text: string }[];
    const results: { pos: number; j: string; text: string }[] = [];
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      const jraw = (item.codes?.J || "").toUpperCase();
      const jParts = jraw ? jraw.split(",").map((s: string) => s.trim()) : [];
      const byJ = jParts.some((p: string) => p.includes(jumpQueryUpper));
      const byText = item.question.toUpperCase().includes(jumpQueryUpper);
      if (byJ || byText) {
        results.push({ pos: i, j: jParts[0] || "-", text: item.question });
      }
      if (results.length > 50) break;
    }
    return results;
  }, [jumpQueryUpper, questions]);

  const jumpLoading = useMemo(() => {
    if (order !== "sequential") return false;
    const raw = jumpInput.trim();
    return raw ? deferredJump.trim() !== raw : false;
  }, [order, jumpInput, deferredJump]);

  function handleJump() {
    if (order !== "sequential") return;
    const raw = normalizeJ(jumpInput);
    if (!raw) return;
    let pos = questions.findIndex((q) => {
      const j = (q.codes?.J || "").toUpperCase();
      if (!j) return false;
      if (j === raw || j.split(",").map((s: string) => s.trim()).includes(raw)) return true;
      return false;
    });
    if (pos < 0) pos = questions.findIndex((q) => (q.codes?.J || "").toUpperCase().includes(raw));
    if (pos < 0) pos = questions.findIndex((q) => q.question.toUpperCase().includes(jumpInput.trim().toUpperCase()));
    
    if (pos >= 0) {
      jumpToQuestion(pos);
    } else {
      alert(`未找到题号：${raw}`);
    }
  }

  function handleResume() {
    if (!pendingResume) return;
    const { orderIndices, answersByPosition, index: savedIndex, showAnswer: savedShowAnswer } = pendingResume;
    
    const reconstructed = orderIndices.map((origIdx) => allQuestions[origIdx]).filter(Boolean) as QuestionItem[];
    const restoredAnswers: AnswersMap = new Map();
    reconstructed.forEach((q, pos) => {
      const key = getKeyByStrategy(q, pos);
      const val = answersByPosition[pos];
      if (val && val.length) restoredAnswers.set(key, val);
    });

    applySavedState({
      order: 'sequential',
      questions: reconstructed,
      answers: restoredAnswers,
      currentIndex: Math.min(Math.max(savedIndex, 0), reconstructed.length - 1),
      showAnswer: savedShowAnswer,
    });

    if (noPromptThisBank) saveNoResume(bankParam, true);
    setResumeOpen(false);
    setPendingResume(null);
  }

  function handleRestart() {
    clearSavedState(bankParam);
    setOrder(order); // re-apply current order to reset questions
    if (noPromptThisBank) saveNoResume(bankParam, true);
    setResumeOpen(false);
    setPendingResume(null);
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
          handleSetCurrentAnswer([opt.key]);
        } else {
          const newSelection = new Set(selectedAnswers);
          if (newSelection.has(opt.key)) newSelection.delete(opt.key);
          else newSelection.add(opt.key);
          handleSetCurrentAnswer(Array.from(newSelection));
        }
      } else {
        handleSetCurrentAnswer([opt.key]);
      }
    },
    enableEnterSearch: order === "sequential",
    onEnterSearch: () => setSearchOpen(true),
  });

  useEffect(() => {
    if (autoHelpShownRef.current || typeof window === "undefined") return;
    const seen = window.localStorage.getItem("ui:shortcutsHelpSeen:practice") === "1";
    if (seen) {
      autoHelpShownRef.current = true;
      return;
    }
    if (!resumeOpen && !isLoading) {
      autoHelpShownRef.current = true;
      const timer = setTimeout(() => {
        setSettingsOpen(true);
        try {
          window.localStorage.setItem("ui:shortcutsHelpSeen:practice", "1");
        } catch {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, resumeOpen]);

  if (isLoading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4 pb-24 sm:pb-20">
      <PracticeResumeDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        noPromptThisBank={noPromptThisBank}
        setNoPromptThisBank={setNoPromptThisBank}
        onRestart={handleRestart}
        onResume={handleResume}
      />
      <QuestionProgressHeader
        percent={percent}
        right={
          <>
            {order === "sequential" ? (
              <Button
                size="icon"
                variant="outline"
                aria-label="搜索"
                title="搜索"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="outline"
              aria-label="设置"
              title="设置"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </>
        }
      />
      <PracticeSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        order={order}
        onChangeOrder={handleSetOrder}
        showAnswer={showAnswer}
        onChangeShowAnswer={toggleShowAnswer}
      />
      <PracticeSearchDialog
        open={order === "sequential" && searchOpen}
        onOpenChange={setSearchOpen}
        jumpInput={jumpInput}
        setJumpInput={setJumpInput}
        computedMatches={computedMatches}
        jumpLoading={jumpLoading}
        onPick={jumpToQuestion}
        onJump={handleJump}
      />

      <QuestionCard
        index={currentIndex}
        total={questions.length}
        question={currentQuestion}
        selected={selectedAnswers}
        onChange={handleSetCurrentAnswer}
        showImmediateAnswer={showAnswer}
      />

      <BottomBar
        statsNode={
            <>
                题库：{bankParam} 类｜模式：{order === 'sequential' ? '顺序练习' : '随机练习'}｜进度：{currentIndex + 1} / {questions.length}
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
          <Button
            onClick={nextQuestion}
            disabled={currentIndex === questions.length - 1}
            className="active:scale-[0.98] transition-transform"
          >
            下一题
          </Button>
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

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6">加载中...</div>}>
      <PracticeClient />
    </Suspense>
  );
}
