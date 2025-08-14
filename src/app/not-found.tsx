import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <h2 className="text-lg font-semibold mb-2">未找到页面</h2>
      <p className="text-sm text-muted-foreground mb-4">您访问的页面不存在。</p>
      <Link className="underline underline-offset-4" href="/">
        返回首页
      </Link>
    </div>
  );
}


