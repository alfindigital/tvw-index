import { useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Upload,
  Settings as SettingsIcon,
  RefreshCw,
  RotateCcw,
  Sun,
  Moon,
  Timer,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefreshAll: () => void;
  onReset: () => void;
  onAfterImport: () => void;
  onExportCsv: () => void;
  onShareLink: () => void;
};

export function SettingsMenu({
  currentStocks,
  loadingCount,
  autoRefresh,
  onToggleAutoRefresh,
  onRefreshAll,
  onReset,
  onAfterImport,
  onExportCsv,
  onShareLink,
}: Props) {
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();

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
    toast.success(`Import successful · ${result.basketCount} stocks · ${result.templateCount} template`);
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
      <DropdownMenu>
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
            onSelect={(e) => {
              e.preventDefault();
              onToggleAutoRefresh();
            }}
          >
            <Timer className={`mr-2 h-3.5 w-3.5 ${autoRefresh ? "text-primary" : ""}`} />
            <span className="flex-1">Auto-refresh 60s</span>
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                autoRefresh
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {autoRefresh ? "ON" : "OFF"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={currentStocks.length === 0}
            onSelect={(e) => {
              e.preventDefault();
              onShareLink();
            }}
          >
            <Link2 className="mr-2 h-3.5 w-3.5" />
            Copy watchlist link
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onAddEmpty();
            }}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add empty row
            <DropdownMenuShortcut>A</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={currentStocks.length === 0}
            onSelect={(e) => {
              e.preventDefault();
              setResetOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset watchlist
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
          <DropdownMenuItem disabled={currentStocks.length === 0} onSelect={onExportCsv}>
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
            Export watchlist (.csv)
            <DropdownMenuShortcut>⇧E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleImportClick}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            Import data (.json)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              All stocks in the current watchlist will be removed. Saved templates are unaffected.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset();
                setResetOpen(false);
                toast.success("Watchlist reset");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
