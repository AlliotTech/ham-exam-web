import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>业余无线电 A 类模拟考试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>基于 questions.json 题库的在线练习。无需登录。</p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/practice">开始练习</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/exam">开始模拟考试</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
