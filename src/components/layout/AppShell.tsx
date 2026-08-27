import type { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {sidebar}
      <main className="min-w-0 flex-1 p-4 md:p-7 print:p-0">{children}</main>
    </div>
  );
}
