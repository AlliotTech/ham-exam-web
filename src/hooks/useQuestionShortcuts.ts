import { useEffect } from "react";
export type QuestionShortcutsOptions = {
  onPrev: () => void;
  onNext: () => void;
  onSelectDigit?: (n: number) => void;
  enableEnterSearch?: boolean;
  onEnterSearch?: () => void;
  isTypingTarget?: (el: EventTarget | null) => boolean;
};

function defaultIsTypingTarget(el: EventTarget | null): boolean {
  const node = el as unknown as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || (node as HTMLElement).isContentEditable === true;
}

export function useQuestionShortcuts(opts: QuestionShortcutsOptions): void {
  const { onPrev, onNext, onSelectDigit, enableEnterSearch, onEnterSearch, isTypingTarget } = opts;

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKeyDown(e: KeyboardEvent) {
      const typingTarget = (isTypingTarget ?? defaultIsTypingTarget)(e.target);
      if (typingTarget) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
        return;
      }
      if (enableEnterSearch && e.key === "Enter") {
        e.preventDefault();
        onEnterSearch?.();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key);
        onSelectDigit?.(n);
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPrev, onNext, onSelectDigit, enableEnterSearch, onEnterSearch, isTypingTarget]);
}
