"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  correct: number;
  total: number;
  passed: boolean;
  passLine: number;
};

export function ExamResultDialog({ open, onOpenChange, correct, total, passed, passLine }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>成绩</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            得分：{correct} / {total}
          </div>
          <div className="text-sm text-muted-foreground">
            正确率：{Math.round((correct / total) * 100)}%
          </div>
          <div className={`text-sm ${passed ? "text-green-600" : "text-red-600"}`}>
            {passed ? "合格" : "不合格"}（合格线：{passLine} 题）
          </div>
          <div className="text-xs text-muted-foreground">交卷后可继续浏览题目查看答案。</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
