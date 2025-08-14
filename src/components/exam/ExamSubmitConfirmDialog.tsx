"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  total: number;
  answeredCount: number;
  flaggedCount: number;
};

export function ExamSubmitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  total,
  answeredCount,
  flaggedCount,
}: Props) {
  const unanswered = Math.max(0, total - answeredCount);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认交卷？</DialogTitle>
          <DialogDescription>
            交卷后将停止计时，答案将不可修改，但可以浏览查看正确答案与成绩。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>已作答</span>
            <span>
              {answeredCount} / {total}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>未作答</span>
            <span className={unanswered > 0 ? "text-red-600" : undefined}>{unanswered}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>已标记</span>
            <span>{flaggedCount}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            确认交卷
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
