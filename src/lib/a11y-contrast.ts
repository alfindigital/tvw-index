/**
 * Dev-only WCAG contrast checker.
 *
 * Walks the live DOM, resolves the effective foreground/background color
 * of each visible text node, computes the WCAG 2.1 contrast ratio, and
 * logs grouped warnings for anything that fails AA (4.5:1 for body,
 * 3:1 for large text ≥18pt or bold ≥14pt).
 *
 * Runs only in development to avoid shipping work to end users.
 */

type RGB = { r: number; g: number; b: number; a: number };

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;

function parseColor(input: string): RGB | null {
  if (!input) return null;
  const m = input.match(
    /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)(?:\s*[,/]\s*(-?\d+(?:\.\d+)?%?))?\s*\)$/i,
  );
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  let a = 1;
  if (m[4] != null) {
    a = m[4].endsWith("%") ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
  }
  return { r, g, b, a };
}

function composite(fg: RGB, bg: RGB): RGB {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function relLuminance({ r, g, b }: RGB): number {
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrastRatio(a: RGB, b: RGB): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function effectiveBackground(el: Element): RGB {
  let node: Element | null = el;
  let acc: RGB = { r: 255, g: 255, b: 255, a: 0 };
  while (node) {
    const bg = parseColor(getComputedStyle(node).backgroundColor);
    if (bg && bg.a > 0) {
      acc = composite(acc, bg);
      if (acc.a >= 0.999) return acc;
    }
    node = node.parentElement;
  }
  // Fall back to white if nothing opaque found.
  return composite(acc, { r: 255, g: 255, b: 255, a: 1 });
}

function isLargeText(style: CSSStyleDeclaration): boolean {
  const sizePx = parseFloat(style.fontSize);
  const weight = parseInt(style.fontWeight, 10) || 400;
  // 18pt = 24px, 14pt bold = ~18.66px
  return sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
}

function hasVisibleText(el: Element): boolean {
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

function isHidden(el: Element, style: CSSStyleDeclaration): boolean {
  if (style.display === "none" || style.visibility === "hidden") return true;
  if (parseFloat(style.opacity) === 0) return true;
  if (el.getAttribute("aria-hidden") === "true") return true;
  const rect = (el as HTMLElement).getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return true;
  return false;
}

export interface ContrastIssue {
  element: Element;
  ratio: number;
  required: number;
  fg: string;
  bg: string;
  text: string;
  large: boolean;
}

export function auditContrast(root: ParentNode = document.body): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  const els = root.querySelectorAll<HTMLElement>("*");
  for (const el of els) {
    if (!hasVisibleText(el)) continue;
    const style = getComputedStyle(el);
    if (isHidden(el, style)) continue;
    const fg = parseColor(style.color);
    if (!fg || fg.a === 0) continue;
    const bg = effectiveBackground(el);
    const effectiveFg = fg.a < 1 ? composite(fg, bg) : fg;
    const ratio = contrastRatio(effectiveFg, bg);
    const large = isLargeText(style);
    const required = large ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
    if (ratio + 0.05 < required) {
      issues.push({
        element: el,
        ratio: Math.round(ratio * 100) / 100,
        required,
        fg: style.color,
        bg: `rgba(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)}, ${bg.a.toFixed(2)})`,
        text: (el.textContent ?? "").trim().slice(0, 80),
        large,
      });
    }
  }
  return issues;
}

let scheduled = false;

function scheduleAudit() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    scheduled = false;
    const issues = auditContrast();
    if (issues.length === 0) return;
    // Deduplicate by text+colors so the console isn't spammed by lists.
    const seen = new Set<string>();
    const unique = issues.filter((i) => {
      const key = `${i.fg}|${i.bg}|${i.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length === 0) return;

    console.groupCollapsed(
      `%c[a11y] ${unique.length} contrast issue(s) below WCAG AA`,
      "color:#b45309;font-weight:600",
    );
    for (const i of unique) {
      console.warn(
        `${i.ratio}:1 (need ${i.required}:1) — "${i.text}"\n  fg: ${i.fg}\n  bg: ${i.bg}`,
        i.element,
      );
    }

    console.groupEnd();
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 600);
  }
}

let started = false;

export function startContrastWatcher() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Initial run after first paint settles.
  setTimeout(scheduleAudit, 800);
  // Re-run on DOM mutations (theme switch, dialogs, route changes).
  const obs = new MutationObserver(() => scheduleAudit());
  obs.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
}
