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

function PracticeClient() {
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer>({});
  const [order, setOrder] = useState<"sequential" | "random">("random");
  const [showAnswer, setShowAnswer] = useState<boolean>(true);

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
      } catch (err) {
        alert(`题库 ${bankParam} 暂不可用`);
      } finally {
        setLoading(false);
      }
    })();
  }, [bankParam, order]);

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
  }

  if (loading) return <div className="p-6">加载题库中...</div>;
  if (!questions.length) return <div className="p-6">题库暂不可用或为空</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
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


