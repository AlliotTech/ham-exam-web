"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { bankAvailable } from "@/lib/load-questions";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
  const [bank, setBank] = useState<"A" | "B" | "C">("A");
  const [checking, setChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      const ok = await bankAvailable(bank);
      if (!cancelled) {
        setIsAvailable(ok);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bank]);
  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>业余无线电执照考试模拟练习</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">选择题库</div>
            <RadioGroup className="flex gap-6" value={bank} onValueChange={(v: "A" | "B" | "C") => setBank(v)}>
              <div className="flex items-center gap-2"><RadioGroupItem id="bank-a" value="A" /><Label htmlFor="bank-a">A 类</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id="bank-b" value="B" /><Label htmlFor="bank-b">B 类</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id="bank-c" value="C" /><Label htmlFor="bank-c">C 类</Label></div>
            </RadioGroup>
          </div>
          {!isAvailable && !checking ? (
            <Alert>
              <AlertDescription>题库 {bank} 暂不可用或为空，请更换题库。</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-3">
            <Button asChild disabled={checking || !isAvailable}>
              <Link href={{ pathname: "/practice", query: { bank } }}>开始练习</Link>
            </Button>
            <Button asChild variant="secondary" disabled={checking || !isAvailable}>
              <Link href={{ pathname: "/exam", query: { bank } }}>开始模拟考试</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
