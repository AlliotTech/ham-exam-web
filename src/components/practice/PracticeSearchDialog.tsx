"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Match = { pos: number; j: string; text: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jumpInput: string;
  setJumpInput: (v: string) => void;
  computedMatches: Match[];
  jumpLoading: boolean;
  onPick: (pos: number) => void;
  onJump: () => void;
};

export function MatchSnippet({ text, query }: { text: string; query: string }) {
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

export function PracticeSearchDialog({ open, onOpenChange, jumpInput, setJumpInput, computedMatches, jumpLoading, onPick, onJump }: Props) {
  const queryUpper = React.useMemo(() => jumpInput.trim().toUpperCase(), [jumpInput]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>搜索题目</DialogTitle>
          <DialogDescription>输入题号或关键词（如 LK0501 / 天线），回车或点击跳转</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 overflow-auto pr-1 min-h-0">
          <div className="relative">
            <Input
              id="jump"
              className="h-11 text-base md:h-9 md:text-sm pr-10"
              placeholder="题号或关键词，如 LK0501 / 天线"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { onJump(); onOpenChange(false); } }}
            />
            {jumpInput.trim() ? (
              <button type="button" aria-label="清除" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setJumpInput("")}>
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {jumpInput.trim() ? (
            <div className="text-xs text-muted-foreground">{jumpLoading ? "搜索中..." : `匹配 ${computedMatches.length} 条`}</div>
          ) : null}
          <div className="rounded-md border">
            {computedMatches.length ? (
              <ul className="divide-y max-h-[40svh] overflow-auto">
                {computedMatches.slice(0, 10).map((m) => (
                  <li key={`${m.j}-${m.pos}`} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { onPick(m.pos); onOpenChange(false); }}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-gray-50">{m.j}</span>
                      <MatchSnippet text={m.text} query={queryUpper} />
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
          <Button onClick={() => { onJump(); onOpenChange(false); }}>跳转</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


