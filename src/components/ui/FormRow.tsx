import type { ReactNode } from "react";

interface FormRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormRow({ label, children, className = "" }: FormRowProps) {
  return (
    <div className={`mb-3.5 ${className}`}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
