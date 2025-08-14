"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expiresInMs: number; // remaining ms until exam ends
  answeredCount: number;
  total: number;
  onResume: () => void;
  onRestart: () => void;
};

export function ExamResumeDialog({
  open,
  onOpenChange,
  expiresInMs,
  answeredCount,
  total,
  onResume,
  onRestart,
}: Props) {
  const minutes = Math.max(0, Math.floor(expiresInMs / 60000));
  const seconds = Math.max(0, Math.floor((expiresInMs % 60000) / 1000));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>恢复考试</DialogTitle>
          <DialogDescription>
            检测到未完成的考试。已答 {answeredCount} / {total}，剩余时间约 {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}。
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onRestart}>
            重新开始
          </Button>
          <Button onClick={onResume}>继续考试</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


