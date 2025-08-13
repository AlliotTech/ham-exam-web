"use client";

import * as React from "react";
import { Suspense, useEffect, useState, useCallback, useRef, useDeferredValue, useMemo } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchParams } from "next/navigation";
import { Search, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function PracticeClient() {
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});
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
        alert(`题库 ${bankParam} 暂不可用`);
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

  const current = questions[index];
  const selected = current ? answers[current.id ?? String(index)] ?? [] : [];
  const percent = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  const setCurrentAnswer = useCallback((keys: string[]) => {
    if (!current) return;
    const key = current.id ?? String(index);
    setAnswers((prev) => ({ ...prev, [key]: keys }));
  }, [current, index]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

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
      if (j.includes(",")) return j.split(",").map((s) => s.trim()).includes(raw);
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
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (node as HTMLElement).isContentEditable === true;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'Enter' && order === 'sequential') { setSearchOpen(true); }
      else if (/^[1-9]$/.test(e.key) && current && current.type !== 'multiple') {
        const n = Number(e.key);
        const opt = current.options?.[n - 1];
        if (opt) setCurrentAnswer([opt.key]);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, order, next, prev, setCurrentAnswer]);

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
        try { window.localStorage.setItem("ui:shortcutsHelpSeen:practice", "1"); } catch { /* noop */ }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [allQuestions.length, resumeOpen]);

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
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Checkbox id="no-prompt-this-bank" checked={noPromptThisBank} onCheckedChange={(v) => setNoPromptThisBank(!!v)} />
              <Label htmlFor="no-prompt-this-bank">本题库不再提示</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRestart}>重新开始</Button>
            <Button onClick={handleResume}>继续上次</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        <div className="flex items-center gap-3">
          {order === "sequential" ? (
            <Button size="icon" variant="outline" aria-label="搜索" title="搜索" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          ) : null}
          <Button size="icon" variant="outline" aria-label="设置" title="设置" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>题序、显示答案与快捷键说明</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">顺序/随机</div>
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
            <Separator />
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
              <div className="flex items-center justify-between">
                <span>打开搜索（仅顺序模式）</span>
                <code className="px-2 py-0.5 rounded border bg-muted">Enter</code>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Search Dialog */}
      <Dialog open={order === "sequential" && searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>搜索题目</DialogTitle>
            <DialogDescription>输入题号或关键词（如 LK0501 / 天线），回车或点击跳转</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              id="jump"
              className="h-9"
              placeholder="题号或关键词，如 LK0501 / 天线"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJump();
                  setSearchOpen(false);
                }
              }}
            />
            {jumpInput.trim() ? (
              <div className="text-xs text-muted-foreground">{jumpLoading ? "搜索中..." : `匹配 ${computedMatches.length} 条`}</div>
            ) : null}
            <div className="rounded-md border">
              {computedMatches.length ? (
                <ul className="divide-y">
                  {computedMatches.slice(0, 10).map((m) => (
                    <li key={`${m.j}-${m.pos}`} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setIndex(m.pos); setSearchOpen(false); }}>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-gray-50">{m.j}</span>
                        <MatchSnippet text={m.text} query={jumpQueryUpper} />
                        <span className="ml-auto text-xs text-muted-foreground">第 {m.pos + 1} 题</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">{jumpInput.trim() ? "未找到匹配" : "输入以开始搜索"}</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJumpInput("")}>清除</Button>
            <Button onClick={() => { handleJump(); setSearchOpen(false); }}>跳转</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
function MatchSnippet({ text, query }: { text: string; query: string }) {
  const maxLen = 120;
  if (!query) return <span className="truncate">{text.slice(0, maxLen)}{text.length > maxLen ? '…' : ''}</span>;
  const up = text.toUpperCase();
  const idx = up.indexOf(query);
  if (idx < 0) return <span className="truncate">{text.slice(0, maxLen)}{text.length > maxLen ? '…' : ''}</span>;
  const context = 40;
  const start = Math.max(0, idx - context);
  const end = Math.min(text.length, idx + query.length + context);
  const prefixEllipsis = start > 0 ? '…' : '';
  const suffixEllipsis = end < text.length ? '…' : '';
  const before = text.slice(start, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length, end);
  return (
    <span className="inline-flex items-center gap-1 max-w-[46ch]">
      <span className="truncate">
        {prefixEllipsis}{before}
        <mark className="bg-yellow-200 text-yellow-900 px-0.5 rounded-sm">{match}</mark>
        {after}{suffixEllipsis}
      </span>
    </span>
  );
}
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

// ---------- User preference: last mode ----------
function lastModeKey(): string {
  return "practice:lastMode";
}

function loadLastMode(): "sequential" | "random" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(lastModeKey());
    if (v === "sequential" || v === "random") return v;
    return null;
  } catch {
    return null;
  }
}

function saveLastMode(mode: "sequential" | "random") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastModeKey(), mode);
  } catch {
    // ignore
  }
}

// ---------- Resume prompt gating ----------
const RESUME_MIN_ANSWERED = 3;
const RESUME_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function shouldResume(saved: SavedState): boolean {
  // order already validated by caller
  const now = Date.now();
  if (now - saved.timestamp > RESUME_EXPIRY_MS) return false;
  const answeredCount = (saved.answersByPosition || []).filter(Boolean).length;
  if (answeredCount < RESUME_MIN_ANSWERED) return false;
  // avoid prompting if at very start or very end
  if (saved.index <= 0) return false;
  if (saved.index >= (saved.total || 0) - 1) return false;
  return true;
}

// ---------- Per-bank 'no resume prompt' preference ----------
function noResumeKey(bank: string | null): string {
  return `practice:noResumePrompt:${bank ?? "default"}`;
}

function loadNoResume(bank: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(noResumeKey(bank)) === "1";
  } catch {
    return false;
  }
}

function saveNoResume(bank: string | null, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(noResumeKey(bank), "1");
    else window.localStorage.removeItem(noResumeKey(bank));
  } catch {
    // ignore
  }
}

// ---------- Jump by J code (sequential only) ----------
function normalizeJ(input: string): string {
  return (input || "").trim().toUpperCase();
}

// Place this inside component scope above return



