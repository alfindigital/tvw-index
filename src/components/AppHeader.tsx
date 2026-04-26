import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  actions?: ReactNode;
};

export function AppHeader({ actions }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15 backdrop-blur-sm">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight">
            Index Builder
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
