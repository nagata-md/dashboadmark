import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div
      className={`rounded-panel border border-gray-300 bg-white p-5 shadow-panel ${className}`}
    >
      {title && (
        <div className="font-archivo mb-3.5 inline-block border-b-2 border-accent pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
