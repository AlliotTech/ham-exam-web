"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: "sequential" | "random";
  onChangeOrder: (v: "sequential" | "random") => void;
  showAnswer: boolean;
  onChangeShowAnswer: (v: boolean) => void;
};

export function PracticeSettingsDialog({ open, onOpenChange, order, onChangeOrder, showAnswer, onChangeShowAnswer }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>题序、显示答案与快捷键说明</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">顺序/随机</div>
            <RadioGroup className="flex items-center gap-4" value={order} onValueChange={(v) => onChangeOrder(v as "sequential" | "random")}>
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
            <Checkbox id="show-ans" checked={showAnswer} onCheckedChange={(v) => onChangeShowAnswer(!!v)} />
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
  );
}


