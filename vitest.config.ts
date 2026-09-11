import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * P1 以降で `src/engine/` を中心に単体テストを追加する。
 * エンジンは DOM 非依存なので Node 環境で実行する。
 * `passWithNoTests` は最初のテストが入るまでの一時措置。
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/engine/**", "src/canvas/**", "src/tools/**", "src/config/**", "src/ui/**"],
      exclude: [
        // 型のみのファイル（実行時コードを持たない）。
        "**/types.ts",
        "**/engine/draw-command.ts",
        "**/canvas/contexts.ts",
        // React コンポーネントは単体テストの対象外（手動 QA と将来のブラウザテストで担保）。
        "**/*.tsx",
      ],
    },
  },
});
