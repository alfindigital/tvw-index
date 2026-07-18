import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Settings as SettingsIcon,
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { applyImport, buildExport, type Stock } from "@/lib/storage";
import { useTheme } from "@/hooks/use-theme";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "./header-actions";

type Props = {
  currentStocks: Stock[];
  loadingCount: number;
  onRefreshAll: () => void;
  onReset: () => void;
  onAfterImport: () => void;
};

const RESET_ARM_MS = 4000;

export function SettingsMenu({
  currentStocks,
  loadingCount,
  onRefreshAll,
  onReset,
  onAfterImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const resetArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  function disarmReset() {
    setResetArmed(false);
    if (resetArmTimer.current) {
      clearTimeout(resetArmTimer.current);
      resetArmTimer.current = null;
    }
  }

  function armReset() {
    setResetArmed(true);
    if (resetArmTimer.current) clearTimeout(resetArmTimer.current);
    resetArmTimer.current = setTimeout(() => setResetArmed(false), RESET_ARM_MS);
  }

  function handleResetSelect(e: Event) {
    e.preventDefault();
    if (currentStocks.length === 0) return;
    if (resetArmed) {
      disarmReset();
      setOpen(false);
      onReset();
      return;
    }
    armReset();
  }

  function handleExport() {
    const payload = buildExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `idx-basket-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const result = applyImport(text, "replace");
    if (!result.ok) {
      toast.error(result.error || "Import failed");
      return;
    }
    onAfterImport();
    toast.success(
      `Import successful · ${result.basketCount} stocks · ${result.templateCount} template`,
    );
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
      />
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) disarmReset();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={HEADER_ICON_BUTTON_CLASS}
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className={HEADER_ICON_CLASS} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Appearance */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Appearance
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-3.5 w-3.5" />
            ) : (
              <Moon className="mr-2 h-3.5 w-3.5" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Watchlist */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Watchlist
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={loadingCount > 0 || currentStocks.length === 0}
            onSelect={(e) => {
              e.preventDefault();
              onRefreshAll();
            }}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingCount > 0 ? "animate-spin" : ""}`} />
            Refresh prices
            <DropdownMenuShortcut>⇧R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={currentStocks.length === 0}
            onSelect={handleResetSelect}
            className={`${
              resetArmed
                ? "bg-destructive text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
                : "text-destructive focus:text-destructive"
            }`}
            aria-label={resetArmed ? "Click again to confirm reset" : "Reset watchlist"}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            {resetArmed ? "Click again to reset" : "Reset watchlist"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Data */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Data
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={handleExport}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export data (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleImportClick}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            Import data (.json)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
