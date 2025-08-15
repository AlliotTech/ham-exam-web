import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development";
const isTurbopack = !!process.env.TURBOPACK;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

const pwa = withPWA({
	dest: "public",
	disable: isDev,
	register: true,
	skipWaiting: false,
	sw: "sw.js",
	runtimeCaching: [
		{
			// Questions JSON: prefer network for freshness, fallback to cache when offline
			urlPattern: /\/questions\/.*\.json$/,
			handler: "NetworkFirst",
			options: {
				cacheName: "questions-json",
				expiration: {
					maxEntries: 10,
					maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
				},
			},
		},
		{
			// Question images: prefer cache but revalidate in background to get new images after updates
			urlPattern: /\/questions\/images\/.*\.(?:png|jpg|jpeg|gif|webp|svg)$/,
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "question-images",
				expiration: {
					maxEntries: 300,
					maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
				},
			},
		},
	],
});

const config: NextConfig = isTurbopack ? nextConfig : pwa(nextConfig);

export default config;


