"use client";

import * as React from "react";
import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { loadQuestions, shuffle, type QuestionBank } from "@/lib/load-questions";
import type { QuestionItem, UserAnswer } from "@/types/question";
import { QuestionCard } from "@/components/exam/question-card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { arraysEqual, sorted } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const DEFAULT_EXAM_SIZE = 50;

function ExamClient() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});
  const [finished, setFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoHelpShownRef = useRef(false);

  const search = useSearchParams();
  const bankParam = (search.get("bank") as QuestionBank | null) ?? "A";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const qs = await loadQuestions(bankParam as QuestionBank, { strict: true });
        const picked = shuffle(qs).slice(0, DEFAULT_EXAM_SIZE);
        setQuestions(picked);
        setIndex(0);
        setAnswers({});
      } catch {
        alert(`题库 ${bankParam} 暂不可用`);
      } finally {
        setLoading(false);
      }
    })();
  }, [bankParam]);

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

  function submit() {
    setFinished(true);
  }

  // Keyboard shortcuts: Left/Right to navigate; 1-9 to pick option
  React.useEffect(() => {
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
      else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key);
        const opt = current?.options?.[n - 1];
        if (opt) setCurrentAnswer([opt.key]);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, next, prev, setCurrentAnswer]);

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
      const key = q.id ?? String(i);
      const s = answers[key] ?? [];
      if (arraysEqual(sorted(s), sorted(q.answer_keys))) correct += 1;
    }
    return { correct, total: questions.length };
  }, [answers, questions]);

  if (loading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        <Button size="icon" variant="outline" aria-label="设置" title="设置" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
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
            <div className="text-xs text-muted-foreground">考试期间不提供搜索功能</div>
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


