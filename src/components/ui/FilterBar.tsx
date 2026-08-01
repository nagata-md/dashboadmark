import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  count?: number;
}

export function FilterBar({ children, count }: FilterBarProps) {
  return (
    <form className="mb-3.5 flex flex-wrap items-center gap-2 rounded-panel border border-gray-300 bg-gray-050 p-3">
      {children}
      {typeof count === "number" && (
        <span className="ml-auto text-xs text-gray-700">{count}件</span>
      )}
    </form>
  );
}
