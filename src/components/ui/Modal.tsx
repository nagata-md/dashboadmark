"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

// DESIGN_SYSTEM.mdにはモーダルのパターンは無いため、Panel/Buttonと同じトーン（角丸・シャドウ・
// ネイビー/アクセント）で新規に設計する新規コンポーネント（spec §12.3の方針、2026-08-10確認）。

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-panel border border-gray-300 bg-white p-5 shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3.5 flex items-center justify-between border-b-2 border-accent pb-1">
          <span className="font-archivo text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-lg leading-none text-gray-500 hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
