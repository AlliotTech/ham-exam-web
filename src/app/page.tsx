"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { bankAvailableWithVersion } from "@/lib/load-questions";
import { QuestionBankSelector } from "@/components/common/QuestionBankSelector";
import { Bubble } from "@/components/common/Bubble";
import { useRouter } from "next/navigation";
import type { QuestionVersionId, QuestionBankType } from "@/types/question-bank";

export default function Home() {
  const router = useRouter();
  const [versionId, setVersionId] = useState<QuestionVersionId | undefined>();
  const [bank, setBank] = useState<QuestionBankType>("A");
  const [checking, setChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnText, setWarnText] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!versionId) return;

      setChecking(true);
      const ok = await bankAvailableWithVersion(versionId, bank);
      if (!cancelled) {
        setIsAvailable(ok);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [versionId, bank]);

  // Prefetch routes when current bank is available
  useEffect(() => {
    if (!isAvailable || !versionId) return;
    const practiceHref = `/practice?version=${versionId}&bank=${bank}`;
    const examHref = `/exam?version=${versionId}&bank=${bank}`;
    try {
      router.prefetch(practiceHref);
      router.prefetch(examHref);
    } catch {
      // ignore
    }
  }, [router, versionId, bank, isAvailable]);
  function showWarn(msg: string) {
    setWarnText(msg);
    setWarnOpen(true);
  }
  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>业余无线电执照考试模拟练习</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuestionBankSelector
            selectedVersion={versionId}
            selectedBank={bank}
            onVersionChange={setVersionId}
            onBankChange={setBank}
            disabled={checking}
          />


          <div className="flex gap-3 relative">
            <Button
              asChild
              disabled={checking || !versionId}
              onMouseEnter={() => {
                if (!isAvailable || !versionId) return;
                try {
                  router.prefetch(`/practice?version=${versionId}&bank=${bank}`);
                } catch {}
              }}
              onClick={(e) => {
                if (!isAvailable || !versionId) {
                  e.preventDefault();
                  showWarn(`题库 ${bank} 暂不可用或为空，请先构建数据集`);
                }
              }}
            >
              <Link href={{ pathname: "/practice", query: { version: versionId, bank } }}>开始练习</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              disabled={checking || !versionId}
              onMouseEnter={() => {
                if (!isAvailable || !versionId) return;
                try {
                  router.prefetch(`/exam?version=${versionId}&bank=${bank}`);
                } catch {}
              }}
              onClick={(e) => {
                if (!isAvailable || !versionId) {
                  e.preventDefault();
                  showWarn(`题库 ${bank} 暂不可用或为空，请先构建数据集`);
                }
              }}
            >
              <Link href={{ pathname: "/exam", query: { version: versionId, bank } }}>开始模拟考试</Link>
            </Button>
            <Bubble open={warnOpen} onOpenChange={setWarnOpen}>{warnText}</Bubble>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
