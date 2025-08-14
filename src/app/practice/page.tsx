"use client";

import * as React from "react";
import { Suspense, useEffect, useState, useRef, useDeferredValue, useMemo } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Search, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { BottomBar } from "@/components/exam/bottom-bar";
import { useNoSiteFooter } from "@/hooks/useNoSiteFooter";
import { useQuestionShortcuts } from "@/hooks/useQuestionShortcuts";
import { QuestionProgressHeader } from "@/components/common/question-progress-header";
import { useQuestionNavigator } from "@/hooks/useQuestionNavigator";
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

function PracticeClient() {
  useNoSiteFooter();
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [order, setOrder] = useState<"sequential" | "random">("sequential");
  const [jumpInput, setJumpInput] = useState("");
  const [showAnswer, setShowAnswer] = useState<boolean>(true);
  // Debounced search state derived via useDeferredValue/useMemo
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

  // Initialize 'no prompt for this bank' checkbox from storage
  useEffect(() => {
    setNoPromptThisBank(!!loadNoResume(bankParam));
  }, [bankParam]);

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
        setErrorText(`题库 ${bankParam} 暂不可用`);
        setErrorOpen(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankParam]);

  // Initialize order from last saved preference once questions are loaded
  useEffect(() => {
    if (!allQuestions.length) return;
    const last = loadLastMode();
    if (last && last !== order) {
      applyOrder(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQuestions]);

  // After loading questions, check if there is a saved progress to optionally resume (only for sequential)
  useEffect(() => {
    if (!allQuestions.length) return;
    if (order !== "sequential") return;
    const lastMode = loadLastMode();
    if (lastMode === "random") return; // if user last used random, do not prompt
    if (loadNoResume(bankParam)) return; // user opted out for this bank
    const saved = loadSavedState(bankParam);
    if (!saved) return;
    // Validate saved state
    if (saved.total !== allQuestions.length) return;
    if (saved.order !== "sequential") return;
    if (shouldResume(saved)) {
      setPendingResume(saved);
      setResumeOpen(true);
    }
    // do not auto-apply; wait for user choice
  }, [bankParam, allQuestions, order]);

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
  } = useQuestionNavigator({ questions, keyStrategy: "id-prefer" });
  const current = questions[index];
  const selected = current ? selectedFromHook : [];
  const percent = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

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
    saveLastMode(nextOrder);
    // When switching to sequential, if there is a saved record, prompt to resume
    if (nextOrder === "sequential") {
      const saved = loadSavedState(bankParam);
      if (
        saved &&
        saved.order === "sequential" &&
        saved.total === allQuestions.length &&
        !loadNoResume(bankParam) &&
        shouldResume(saved)
      ) {
        setPendingResume(saved);
        setResumeOpen(true);
      }
    }
  }

  function handleJump() {
    if (order !== "sequential") return;
    const raw = normalizeJ(jumpInput);
    if (!raw) return;
    // 1) exact/partial J match
    let pos = questions.findIndex((q) => {
      const j = (q.codes?.J || "").toUpperCase();
      if (!j) return false;
      if (j === raw) return true; // exact
      if (j.includes(","))
        return j
          .split(",")
          .map((s) => s.trim())
          .includes(raw);
      return false;
    });
    // 2) fallback: partial J contains, e.g., input "LK05" should navigate to first match
    if (pos < 0) {
      pos = questions.findIndex((q) => {
        const j = (q.codes?.J || "").toUpperCase();
        return j.includes(raw);
      });
    }
    // 3) fallback: keyword in question text
    if (pos < 0) {
      const keyword = jumpInput.trim().toUpperCase();
      pos = questions.findIndex((q) => q.question.toUpperCase().includes(keyword));
    }
    if (pos >= 0) {
      setIndex(pos);
    } else {
      alert(`未找到题号：${raw}`);
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
    const answeredCount = answersByPosition.filter(Boolean).length;
    // Avoid saving empty progress (initial load)
    if (index === 0 && answeredCount === 0) return;
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

  // live suggestions based on J code or question text (sequential mode only)
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
      const jParts = jraw ? jraw.split(",").map((s) => s.trim()) : [];
      const byJ = jParts.some((p) => p.includes(jumpQueryUpper));
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
    if (!raw) return false;
    return deferredJump.trim() !== raw;
  }, [order, jumpInput, deferredJump]);

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
    if (noPromptThisBank) saveNoResume(bankParam, true);
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
    if (noPromptThisBank) saveNoResume(bankParam, true);
    setResumeOpen(false);
    setPendingResume(null);
  }

  // Keyboard shortcuts: Left/Right to navigate; 1-9 to pick option (single-choice); Enter to open search in sequential
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
    enableEnterSearch: order === "sequential",
    onEnterSearch: () => setSearchOpen(true),
  });

  // One-time settings auto prompt (do not interfere with resume dialog)
  useEffect(() => {
    if (autoHelpShownRef.current) return;
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("ui:shortcutsHelpSeen:practice") === "1";
    if (seen) {
      autoHelpShownRef.current = true;
      return;
    }
    if (!resumeOpen && allQuestions.length) {
      autoHelpShownRef.current = true;
      const timer = setTimeout(() => {
        setSettingsOpen(true);
        try {
          window.localStorage.setItem("ui:shortcutsHelpSeen:practice", "1");
        } catch {
          /* noop */
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allQuestions.length, resumeOpen]);

  if (loading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4 pb-24 sm:pb-20">
      <PracticeResumeDialog
        open={resumeOpen}
        onOpenChange={setResumeOpen}
        noPromptThisBank={noPromptThisBank}
        setNoPromptThisBank={(v) => setNoPromptThisBank(v)}
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
        onChangeOrder={(v) => applyOrder(v)}
        showAnswer={showAnswer}
        onChangeShowAnswer={(v) => setShowAnswer(v)}
      />
      <PracticeSearchDialog
        open={order === "sequential" && searchOpen}
        onOpenChange={setSearchOpen}
        jumpInput={jumpInput}
        setJumpInput={setJumpInput}
        computedMatches={computedMatches}
        jumpLoading={jumpLoading}
        onPick={(pos) => setIndex(pos)}
        onJump={() => handleJump()}
      />

      <QuestionCard
        index={index}
        total={questions.length}
        question={current}
        selected={selected}
        onChange={setCurrentAnswer}
        showImmediateAnswer={showAnswer}
      />

      <BottomBar
        answeredCount={answeredCount}
        total={questions.length}
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
          <Button
            onClick={next}
            disabled={index === questions.length - 1}
            className="active:scale-[0.98] transition-transform"
          >
            下一题
          </Button>
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
