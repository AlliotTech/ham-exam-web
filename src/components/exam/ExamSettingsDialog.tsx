"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ExamSettingsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <span>选择 / 切换选项（单选/多选）</span>
              <code className="px-2 py-0.5 rounded border bg-muted">1-9</code>
            </div>
            <div className="flex items-center justify-between">
              <span>严格选择（多选，仅该项）</span>
              <code className="px-2 py-0.5 rounded border bg-muted">Shift 或 Cmd（macOS） + 1-9</code>
            </div>
          </div>
          <Separator />
          <div className="text-xs text-muted-foreground">
            考试规则：A 类 40 题（单选 32，多选 8），40 分钟，30 题合格；B 类 60 题（单选 45，多选
            15），60 分钟，45 题合格；C 类 90 题（单选 70，多选 20），90 分钟，70
            题合格。多选题需与标准答案完全一致，否则不得分。
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
