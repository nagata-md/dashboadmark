"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SidebarNavItem {
  href: string;
  label: string;
}

interface SidebarProps {
  logo: string;
  subtitle: string;
  navItems: SidebarNavItem[];
  activeHref?: string;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({
  logo,
  subtitle,
  navItems,
  activeHref,
  userName,
  userEmail,
}: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const currentHref = activeHref ?? pathname;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col bg-navy p-3.5 text-white md:w-60 md:flex-shrink-0 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-archivo text-lg font-bold tracking-[0.06em]">
            {logo}
          </div>
          <div className="mt-0.5 text-[11px] text-white/55">{subtitle}</div>
        </div>
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex rounded-control border border-white/30 px-2.5 py-1.5 text-lg leading-none md:hidden"
        >
          ☰
        </button>
      </div>

      <div
        className={`${open ? "mt-3.5 flex" : "hidden"} flex-1 flex-col md:mt-0 md:flex`}
      >
        <ul className="mb-6 list-none space-y-0.5 border-t border-white/10 pt-3">
          {navItems.map((item) => {
            const active = item.href === currentHref;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-control border-l-[3px] px-2.5 py-2 text-sm ${
                    active
                      ? "border-accent bg-white/10 font-semibold text-white"
                      : "border-transparent text-white/80 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex-1" />

        {(userName || userEmail) && (
          <div className="border-t border-white/10 pt-3 text-xs">
            {userName && <div className="font-semibold text-white">{userName}</div>}
            {userEmail && (
              <div className="mt-0.5 break-all text-white/55">{userEmail}</div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 inline-block text-xs text-white/70 hover:underline"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
