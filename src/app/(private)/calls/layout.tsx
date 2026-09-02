import type { ReactNode } from "react";
import { CallsNav } from "@/modules/calls/ui/CallsNav";

export default function CallsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-app-view className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <CallsNav />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
