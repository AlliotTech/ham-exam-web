"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Camera, Home } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "首页",
      icon: Home,
      description: "考试练习"
    },
    {
      href: "/photo-processor", 
      label: "照片处理",
      icon: Camera,
      description: "报名照片"
    }
  ];

  return (
    <nav className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center p-1">
                <Image src="/pwa-icon.svg" alt="网站图标" width={32} height={32} className="w-full h-full" />
              </div>
              <span className="font-semibold text-gray-900 hidden sm:block">
                业余无线电考试
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className="flex items-center gap-2"
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:block">{item.label}</span>
                    <span className="sm:hidden">{item.description}</span>
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Mobile Menu - Future Enhancement */}
          <div className="sm:hidden">
            {/* 预留移动端菜单空间 */}
          </div>
        </div>
      </div>
    </nav>
  );
}
