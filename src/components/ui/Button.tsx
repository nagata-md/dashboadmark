import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "primary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "bg-white text-navy border-gray-400 hover:bg-gray-100",
  primary: "bg-navy text-white border-navy hover:bg-navy-hover",
  danger: "bg-white text-danger border-danger hover:bg-danger-tint",
};

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-control border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
