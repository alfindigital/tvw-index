import { useEffect } from "react";

export type Shortcut = {
  key: string; // single char (case-insensitive) or "?"
  shift?: boolean;
  ctrlOrMeta?: boolean;
  allowInInput?: boolean;
  handler: (e: KeyboardEvent) => void;
};

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      // Ignore IME composition
      if (e.isComposing) return;
      const inEditable = isEditable(e.target);
      for (const s of shortcuts) {
        const keyMatch =
          e.key.toLowerCase() === s.key.toLowerCase() || (s.key === "?" && e.key === "?");
        if (!keyMatch) continue;
        if (!!s.shift !== e.shiftKey) continue;
        if (s.ctrlOrMeta && !(e.ctrlKey || e.metaKey)) continue;
        if (!s.ctrlOrMeta && (e.ctrlKey || e.metaKey)) continue;
        if (inEditable && !s.allowInInput) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, enabled]);
}
