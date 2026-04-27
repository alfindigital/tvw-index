import { useEffect, useRef, useState } from "react";
import {
  BookmarkPlus,
  Download,
  Upload,
  Trash2,
  Settings as SettingsIcon,
  RefreshCw,
  Plus,
  RotateCcw,
  Sun,
  Moon,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import {
  applyImport,
  buildExport,
  loadTemplates,
  saveTemplates,
  type Stock,
  type Template,
} from "@/lib/storage";
import { useTheme } from "@/hooks/use-theme";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "./header-actions";
import {
  TEMPLATES_EMPTY,
  WATCHLIST_EMPTY_TOAST,
  TEMPLATE_NAME_MAX,
  TEMPLATE_NAME_REQUIRED,
  TEMPLATE_NAME_TOO_LONG,
} from "@/lib/copy";

const templateNameSchema = z
  .string()
  .trim()
  .min(1, { message: TEMPLATE_NAME_REQUIRED })
  .max(TEMPLATE_NAME_MAX, { message: TEMPLATE_NAME_TOO_LONG });

type Props = {
  currentStocks: Stock[];
  loadingCount: number;
  onRefreshAll: () => void;
  onAddEmpty: () => void;
  onReset: () => void;
  onLoadTemplate: (stocks: Stock[]) => void;
  onAfterImport: () => void;
  onOpenShortcuts: () => void;
  /** External trigger to open save dialog (e.g. via Shift+S shortcut) */
  saveDialogTrigger?: number;
};

export function SettingsMenu({
  currentStocks,
  loadingCount,
  onRefreshAll,
  onAddEmpty,
  onReset,
  onLoadTemplate,
  onAfterImport,
  onOpenShortcuts,
  saveDialogTrigger,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  // Open save dialog when external trigger fires
  useEffect(() => {
    if (saveDialogTrigger === undefined) return;
    if (saveDialogTrigger === 0) return;
    openSaveDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveDialogTrigger]);

  function refresh() {
    setTemplates(loadTemplates());
  }

  function openSaveDialog() {
    setName("");
    setNameError(null);
    setSaveOpen(true);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (nameError) {
      const result = templateNameSchema.safeParse(value);
      setNameError(result.success ? null : result.error.issues[0].message);
    }
  }

  function handleSave() {
    if (currentStocks.length === 0) {
      toast.error(WATCHLIST_EMPTY_TOAST);
      return;
    }
    const result = templateNameSchema.safeParse(name);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      setNameError(msg);
      toast.error(msg);
      return;
    }
    const trimmed = result.data;
    const next: Template = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: Date.now(),
      stocks: currentStocks.map((s) => ({ ...s, error: null })),
    };
    const list = [next, ...loadTemplates()];
    saveTemplates(list);
    setTemplates(list);
    setName("");
    setNameError(null);
    setSaveOpen(false);
    toast.success("Watchlist tersimpan sebagai template", {
      description: trimmed,
    });
  }

  function handleLoad(t: Template) {
    const cloned = t.stocks.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      error: null,
    }));
    onLoadTemplate(cloned);
    toast.success(`Template "${t.name}" dimuat`);
  }

  function handleDelete(t: Template) {
    if (!confirm(`Hapus template "${t.name}"?`)) return;
    const list = loadTemplates().filter((x) => x.id !== t.id);
    saveTemplates(list);
    setTemplates(list);
    toast.success("Template dihapus");
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
    toast.success("Data di-export");
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
      toast.error(result.error || "Gagal import");
      return;
    }
    refresh();
    onAfterImport();
    toast.success(
      `Import sukses · ${result.basketCount} saham · ${result.templateCount} template`,
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
        <DropdownMenuContent align="end" className="w-72">
          {/* Tampilan */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Tampilan
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
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${loadingCount > 0 ? "animate-spin" : ""}`}
            />
            Refresh harga
            <DropdownMenuShortcut>⇧R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onAddEmpty();
            }}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Tambah baris kosong
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

          {/* Templates */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Templates
          </DropdownMenuLabel>
          {templates.length === 0 ? (
            <div className="px-2 py-2 text-center text-xs text-muted-foreground">
              {TEMPLATES_EMPTY}
            </div>
          ) : (
            <div className="max-h-48 overflow-auto">
              {templates.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleLoad(t)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {t.stocks.length} saham
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Hapus template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              openSaveDialog();
            }}
          >
            <BookmarkPlus className="mr-2 h-3.5 w-3.5" />
            Simpan sebagai template
            <DropdownMenuShortcut>⇧S</DropdownMenuShortcut>
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

          <DropdownMenuSeparator />

          {/* Bantuan */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onOpenShortcuts();
            }}
          >
            <Keyboard className="mr-2 h-3.5 w-3.5" />
            Keyboard shortcuts
            <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save template dialog */}
      <Dialog
        open={saveOpen}
        onOpenChange={(open) => {
          setSaveOpen(open);
          if (!open) {
            setName("");
            setNameError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Simpan sebagai template</DialogTitle>
            <DialogDescription>
              Watchlist saat ini ({currentStocks.length} saham) akan disimpan
              sebagai preset di browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Input
              autoFocus
              placeholder="cth: Banking Big 4, Energy Watchlist"
              value={name}
              maxLength={TEMPLATE_NAME_MAX}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "tpl-name-error" : "tpl-name-hint"}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className={
                nameError
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : ""
              }
            />
            {nameError ? (
              <p
                id="tpl-name-error"
                className="text-xs font-medium text-destructive"
                role="alert"
              >
                {nameError}
              </p>
            ) : (
              <p
                id="tpl-name-hint"
                className="text-[11px] text-muted-foreground"
              >
                {name.trim().length}/{TEMPLATE_NAME_MAX} karakter
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset watchlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua saham di watchlist saat ini akan dihapus. Template tersimpan
              tidak terpengaruh. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset();
                setResetOpen(false);
                toast.success("Watchlist direset");
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
