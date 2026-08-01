export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-start gap-6 p-10">
      <p className="font-archivo text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        DESIGN TOKEN CHECK
      </p>
      <h1 className="text-2xl font-bold text-navy">
        住宅マーケティング数値ダッシュボード（仮称）
      </h1>
      <div className="rounded-panel border border-gray-300 bg-white p-5 shadow-panel">
        <p className="mb-3 text-gray-700">
          このパネルは DESIGN_SYSTEM.md のトークン（navy / accent / radius-panel /
          shadow-panel）が Tailwind v4 の @theme 経由で反映されているかの確認用です。
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-control bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover">
            btn-primary
          </button>
          <button className="rounded-control border border-gray-400 px-4 py-2 text-sm font-semibold text-navy">
            btn
          </button>
          <button className="rounded-control border border-danger px-4 py-2 text-sm font-semibold text-danger">
            btn-danger
          </button>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5 text-[11.5px] before:h-1.5 before:w-1.5 before:rounded-[1px] before:bg-accent">
          タグサンプル
        </span>
      </div>
    </div>
  );
}
