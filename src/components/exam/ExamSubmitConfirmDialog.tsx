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
};

export function ExamSubmitConfirmDialog({ open, onOpenChange, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认交卷？</DialogTitle>
          <DialogDescription>
            交卷后将停止计时，答案将不可修改，但可以浏览查看正确答案与成绩。
          </DialogDescription>
        </DialogHeader>
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
