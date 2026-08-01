// Phase 1 の共通コンポーネント（AppShell/Sidebar/PageHeader/Panel/Button/Tag/FilterBar）を
// 一画面にまとめた確認用ページ。実画面（Phase 4 以降）ができ次第削除する。
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { FilterBar } from "@/components/ui/FilterBar";

const NAV_ITEMS = [
  { href: "/dev-preview", label: "ダッシュボード" },
  { href: "#campaigns", label: "施策データ" },
  { href: "#locations", label: "拠点管理" },
  { href: "#reports", label: "レポート" },
];

export default function DesignPreviewPage() {
  return (
    <AppShell
      sidebar={
        <Sidebar
          logo="HOUSING DASHBOARD"
          subtitle="住宅マーケティング数値ダッシュボード"
          navItems={NAV_ITEMS}
          activeHref="/dev-preview"
          userName="山田 太郎"
          userEmail="yamada@example.com"
        />
      }
    >
      <PageHeader
        title="クライアント一覧"
        eyebrow="CLIENTS"
        actions={<Button variant="primary">＋ 新規クライアント</Button>}
      />
      <FilterBar count={12}>
        <input type="text" placeholder="クライアント名で検索" />
        <Button type="submit" variant="default">
          検索
        </Button>
      </FilterBar>
      <Panel title="セクション見出し">
        <p className="mb-3 text-gray-700">
          Sidebar・PageHeader・Panel・Button・Tag・FilterBar の共通コンポーネント確認用（Phase
          1）。
        </p>
        <div className="flex flex-wrap gap-2">
          <Tag>タグA</Tag>
          <Tag dark>タグB</Tag>
        </div>
      </Panel>
    </AppShell>
  );
}
