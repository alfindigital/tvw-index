import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkPlus, Trash2, AlertCircle, Loader2 } from "lucide-react";
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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  loadTemplates,
  saveTemplates,
  normalizeTickerKey,
  type Stock,
  type Template,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import { HEADER_ICON_BUTTON_CLASS, HEADER_ICON_CLASS } from "./header-actions";
import {
  TEMPLATES_EMPTY,
  WATCHLIST_EMPTY_TOAST,
  TEMPLATE_NAME_MAX,
  TEMPLATE_NAME_REQUIRED,
  TEMPLATE_NAME_TOO_LONG,
  TEMPLATE_NAME_DUPLICATE,
  WATCHLIST_SAVED_TOAST,
  WATCHLIST_ALREADY_SAVED_TOAST,
} from "@/lib/copy";

function validateName(
  raw: string,
  existing: Template[],
): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, message: TEMPLATE_NAME_REQUIRED };
  if (trimmed.length > TEMPLATE_NAME_MAX) {
    return { ok: false, message: TEMPLATE_NAME_TOO_LONG(trimmed.length) };
  }
  const dup = existing.find((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (dup) return { ok: false, message: TEMPLATE_NAME_DUPLICATE(trimmed) };
  return { ok: true, value: trimmed };
}

function findIdenticalTemplate(stocks: Stock[], templates: Template[]): Template | undefined {
  const current = stocks.map((s) => normalizeTickerKey(s.ticker)).sort().join(",");
  return templates.find((t) => {
    const theirs = t.stocks.map((s) => normalizeTickerKey(s.ticker)).sort().join(",");
    return theirs === current;
  });
}

type Props = {
  currentStocks: Stock[];
  onLoadTemplate: (stocks: Stock[]) => void;
  /** External trigger to open the save dialog (e.g. via Shift+S). */
  saveDialogTrigger?: number;
};

export function TemplatesMenu({ currentStocks, onLoadTemplate, saveDialogTrigger }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPendingDelete() {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setPendingDeleteId(null);
  }

  function armDeleteConfirm(id: string) {
    clearPendingDelete();
    setPendingDeleteId(id);
    deleteTimerRef.current = setTimeout(() => {
      setPendingDeleteId(null);
      deleteTimerRef.current = null;
    }, 4000);
  }

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    if (!saveDialogTrigger) return;
    openSaveDialog();
    // openSaveDialog only resets local form state; safe to omit from deps.
  }, [saveDialogTrigger]);

  function openSaveDialog() {
    if (currentStocks.length === 0) {
      toast.error(WATCHLIST_EMPTY_TOAST);
      return;
    }
    const identical = findIdenticalTemplate(currentStocks, templates);
    if (identical) {
      toast.info(WATCHLIST_ALREADY_SAVED_TOAST(identical.name), {
        action: {
          label: "Save as new",
          onClick: () => {
            setName("");
            setNameError(null);
            setSaveOpen(true);
          },
        },
      });
      return;
    }
    setName("");
    setNameError(null);
    setSaveOpen(true);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (nameError) {
      const result = validateName(value, templates);
      setNameError(result.ok ? null : result.message);
    }
  }

  async function handleSave() {
    if (saving) return;
    if (currentStocks.length === 0) {
      toast.error(WATCHLIST_EMPTY_TOAST);
      return;
    }
    const result = validateName(name, templates);
    if (!result.ok) {
      setNameError(result.message);
      toast.error(result.message);
      return;
    }
    setSaving(true);
    // Let the busy state paint before the (synchronous) write.
    await new Promise((r) => setTimeout(r, 150));
    const next: Template = {
      id: crypto.randomUUID(),
      name: result.value,
      createdAt: Date.now(),
      stocks: currentStocks.map((s) => ({ ...s, error: null })),
    };
    const list = [next, ...loadTemplates()];
    saveTemplates(list);
    setTemplates(list);
    setName("");
    setNameError(null);
    setSaving(false);
    setSaveOpen(false);
    toast.success(WATCHLIST_SAVED_TOAST(result.value), {
      description: `${currentStocks.length} stocks`,
    });
  }


  function handleLoad(t: Template) {
    const cloned = t.stocks.map((s) => ({ ...s, id: crypto.randomUUID(), error: null }));
    onLoadTemplate(cloned);
    toast.success(`Template "${t.name}" loaded`);
  }

  function handleDeleteClick(t: Template) {
    if (pendingDeleteId === t.id) {
      clearPendingDelete();
      const list = loadTemplates().filter((x) => x.id !== t.id);
      saveTemplates(list);
      setTemplates(list);
      toast.success("Template deleted");
    } else {
      armDeleteConfirm(t.id);
    }
  }

  return (
    <>
      <DropdownMenu onOpenChange={(open) => { if (!open) clearPendingDelete(); }}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={HEADER_ICON_BUTTON_CLASS}
            aria-label="Watchlist templates"
            title="Watchlist templates"
          >
            <Bookmark className={HEADER_ICON_CLASS} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Templates
          </DropdownMenuLabel>
          {templates.length === 0 ? (
            <div className="px-2 py-2 text-center text-xs text-muted-foreground">
              {TEMPLATES_EMPTY}
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
                    <div className="text-[10px] text-muted-foreground">{t.stocks.length} stocks</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(t)}
                    className={cn(
                      "rounded p-1 transition-colors",
                      pendingDeleteId === t.id
                        ? "bg-destructive/10 text-destructive"
                        : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    )}
                    aria-label={
                      pendingDeleteId === t.id ? "Confirm delete template" : "Delete template"
                    }
                    aria-pressed={pendingDeleteId === t.id ? true : undefined}
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
              openSaveDialog();
            }}
          >
            <BookmarkPlus className="mr-2 h-3.5 w-3.5" />
            Save this watchlist
            <DropdownMenuShortcut>⇧S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Current watchlist ({currentStocks.length} stocks) will be saved as a preset in the
              browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Input
              autoFocus
              placeholder="e.g. Banking Big 4, Energy Watchlist"
              value={name}
              maxLength={TEMPLATE_NAME_MAX}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "tpl-name-error" : "tpl-name-hint"}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className={nameError ? "border-destructive focus-visible:ring-destructive/30" : ""}
            />
            {nameError ? (
              <div
                id="tpl-name-error"
                role="alert"
                className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <p className="text-xs font-medium leading-snug text-destructive">{nameError}</p>
              </div>
            ) : (
              <p id="tpl-name-hint" className="text-[11px] text-muted-foreground">
                {name.trim().length}/{TEMPLATE_NAME_MAX} karakter
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={saving} onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving ? true : undefined}
              data-busy={saving ? "true" : undefined}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  );
}
