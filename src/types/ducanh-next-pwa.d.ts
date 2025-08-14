declare module "@ducanh2912/next-pwa" {
  import type { NextConfig } from "next";

  export type RuntimeCachingEntry = {
    urlPattern: RegExp | string;
    handler:
      | "CacheFirst"
      | "CacheOnly"
      | "NetworkFirst"
      | "NetworkOnly"
      | "StaleWhileRevalidate";
    options?: Record<string, unknown> & {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
    };
  };

  export type PWAConfig = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    skipWaiting?: boolean;
    runtimeCaching?: RuntimeCachingEntry[];
  };

  export default function withPWA(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}


