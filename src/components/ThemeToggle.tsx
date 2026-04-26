import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "./header-actions";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Aktifkan light mode" : "Aktifkan dark mode"}
      className={HEADER_ICON_BUTTON_CLASS}
    >
      <Sun className={`${HEADER_ICON_CLASS} rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0`} />
      <Moon className={`absolute ${HEADER_ICON_CLASS} rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100`} />
    </Button>
  );
}

