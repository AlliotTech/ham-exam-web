import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  globalIgnores([
    "public/sw.js",
    "public/workbox-*.js",
    "public/worker-*.js",
    "public/fallback-*.js",
  ]),
]);

export default eslintConfig;
