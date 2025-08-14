"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  noPromptThisBank: boolean;
  setNoPromptThisBank: (v: boolean) => void;
  onRestart: () => void;
  onResume: () => void;
};

export function PracticeResumeDialog({ open, onOpenChange, noPromptThisBank, setNoPromptThisBank, onRestart, onResume }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={onRestart}>重新开始</Button>
          <Button onClick={onResume}>继续上次</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


