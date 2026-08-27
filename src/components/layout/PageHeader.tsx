import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-2.5">
      <h1 className="border-l-4 border-accent pl-2.5 text-xl font-bold text-navy">
        {title}
      </h1>
      {eyebrow && (
        <span className="font-archivo text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          {eyebrow}
        </span>
      )}
      {actions && (
        <div className="ml-auto flex flex-wrap items-center gap-2 max-md:w-full print:hidden">
          {actions}
        </div>
      )}
    </div>
  );
}
