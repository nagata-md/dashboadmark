import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}

export function Tag({ children, dark = false, className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11.5px] before:block before:h-1.5 before:w-1.5 before:rounded-[1px] ${
        dark
          ? "border-navy bg-navy text-white before:bg-accent-tint"
          : "border-gray-300 bg-white text-ink before:bg-accent"
      } ${className}`}
    >
      {children}
    </span>
  );
}
