import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

// DESIGN_SYSTEM.md §5.5 テーブル：ヘッダーはArchivo・大文字・letter-spacing・グレー700文字、
// 下線はネイビー2px、背景は淡いグレー。行ホバーで淡いグレー背景。§4.1: 横スクロール対応。

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-gray-300">
      <table className={`w-full border-collapse text-left text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function Tr({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`hover:bg-gray-050 ${className}`}>{children}</tr>;
}

export function Th({ children, className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`font-archivo whitespace-nowrap border-b-2 border-navy bg-gray-050 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`whitespace-nowrap border-b border-gray-300 px-3 py-2 align-top ${className}`} {...props}>
      {children}
    </td>
  );
}

/** stacked cell パターン（§5.5）：セル内の補助情報（2行目）用 */
export function TableSubText({ children }: { children: ReactNode }) {
  return <span className="mt-0.5 block text-[11px] text-gray-500">{children}</span>;
}
