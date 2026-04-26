import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Download, Upload, Trash2, FolderOpen } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  applyImport,
  buildExport,
  loadTemplates,
  saveTemplates,
  type Stock,
  type Template,
} from "@/lib/storage";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "./header-actions";
import { TEMPLATES_EMPTY, WATCHLIST_EMPTY_TOAST } from "@/lib/copy";

type Props = {
  currentStocks: Stock[];
  onLoadTemplate: (stocks: Stock[]) => void;
  onAfterImport: () => void;
};

export function TemplatesMenu({
  currentStocks,
  onLoadTemplate,
  onAfterImport,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  function refresh() {
    setTemplates(loadTemplates());
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Nama template wajib diisi");
      return;
    }
    if (currentStocks.length === 0) {
      toast.error(WATCHLIST_EMPTY_TOAST);
      return;
    }
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
    setSaveOpen(false);
    toast.success(`Template "${trimmed}" disimpan`);
  }

  function handleLoad(t: Template) {
    // Re-id supaya tidak bentrok
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
    e.target.value = ""; // reset
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
            aria-label={`Templates${templates.length ? ` (${templates.length})` : ""}`}
            title="Templates"
          >
            <FolderOpen className={HEADER_ICON_CLASS} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Saved Templates
          </DropdownMenuLabel>
          {templates.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              Belum ada template
            </div>
          ) : (
            <div className="max-h-60 overflow-auto">
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
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setSaveOpen(true);
            }}
          >
            <BookmarkPlus className="mr-2 h-3.5 w-3.5" />
            Simpan sebagai template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Simpan sebagai template</DialogTitle>
            <DialogDescription>
              Watchlist saat ini ({currentStocks.length} saham) akan disimpan
              sebagai preset di browser.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="cth: Banking Big 4, Energy Watchlist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
