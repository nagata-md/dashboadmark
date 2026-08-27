"use client";

import { Button } from "@/components/ui/Button";

// PDF出力はブラウザの印刷機能で代替する（モックアップと同じ暫定対応。spec §7のE5
// サーバーサイドPDF生成＝puppeteer-core本実装は今回のスコープ外、次フェーズで対応）。
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      PDFダウンロード
    </Button>
  );
}
