import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PWAUpdatePrompt } from "@/components/common/PWAUpdatePrompt";
import { ConditionalNavigation } from "@/components/common/ConditionalNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "业余无线电执照考试模拟练习",
  description: "业余无线电执照考试模拟练习| 2025年10月题库",
  manifest: "/manifest.json",
  icons: {
    icon: "/pwa-icon.svg",
    shortcut: "/pwa-icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "无线电考试",
  },
  openGraph: {
    title: "业余无线电执照考试模拟练习",
    description: "业余无线电执照考试模拟练习｜支持 A/B/C 类题库、真实规则抽题与计时交卷",
    url: "/",
    siteName: "业余无线电执照考试模拟练习",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/pwa-icon-512.png",
        width: 512,
        height: 512,
        alt: "业余无线电执照考试模拟练习",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "业余无线电执照考试模拟练习",
    description: "业余无线电执照考试模拟练习｜支持 A/B/C 类题库、真实规则抽题与计时交卷",
    images: ["/pwa-icon-512.png"],
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-[100dvh] flex flex-col`}
      >
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5453400863646747"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <PWAUpdatePrompt />
        <ConditionalNavigation />
        <main className="flex-1">{children}</main>
        <footer className="mt-8 border-t bg-secondary/40">
          <div className="max-w-screen-lg mx-auto px-4">
            <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-muted-foreground">
                业余无线电执照考试模拟 · 2025
              </div>
              <nav className="text-xs sm:text-sm">
                <ul className="inline-flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground">
                  <li>
                    <a
                      href="https://github.com/AlliotTech/ham-exam-web"
                      rel="nofollow"
                      className="hover:underline underline-offset-4 hover:text-foreground transition-colors"
                      aria-label="仓库地址"
                    >
                      GitHub 仓库
                    </a>
                  </li>
                  <li aria-hidden="true" className="text-border">
                    ·
                  </li>
                  <li>
                    <a
                      href="https://www.iots.vip"
                      className="hover:underline underline-offset-4 hover:text-foreground transition-colors"
                      aria-label="Alliot's blog"
                    >
                      Alliot&apos;s blog
                    </a>
                  </li>
                  <li aria-hidden="true" className="text-border">
                    ·
                  </li>
                  <li>
                    <a
                      href="http://www.crac.org.cn/News/List?type=6&y="
                      rel="nofollow"
                      className="hover:underline underline-offset-4 hover:text-foreground transition-colors"
                      aria-label="CRAC 题库来源"
                    >
                      CRAC 题库
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
