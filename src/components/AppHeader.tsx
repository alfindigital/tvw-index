import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

type Props = {
  actions?: ReactNode;
};

export function AppHeader({ actions }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:h-16 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center">
          <Logo />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {actions}
        </div>
      </div>
    </header>
  );
}
