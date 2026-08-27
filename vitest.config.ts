import { defineConfig } from "vitest/config";
import path from "node:path";

// lib/metrics/ の集計ロジック（純粋関数のみ）を対象にしたユニットテスト用設定。
// tsconfig.json の "@/*" -> "./src/*" と同じエイリアスをここでも定義する。
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
