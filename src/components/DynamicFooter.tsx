import { useEffect, useRef, useState, type ReactNode } from "react";
import { TelegramIcon, InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";

type Social = {
  href: string;
  label: string;
  handle: string;
  Icon: (props: { className?: string }) => ReactNode;
};

const SOCIALS: Social[] = [
  { href: "https://t.me/lotmetrik", label: "Telegram", handle: "@lotmetrik", Icon: TelegramIcon },
  { href: "https://instagram.com/lotmetrik", label: "Instagram", handle: "@lotmetrik", Icon: InstagramIcon },
  { href: "https://tiktok.com/@lotmetrik", label: "TikTok", handle: "@lotmetrik", Icon: TikTokIcon },
  { href: "https://x.com/lotmetrik", label: "X", handle: "@lotmetrik", Icon: XIcon },
];

export function DynamicFooter() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [glow, setGlow] = useState({ left: "-20%", top: "0%" });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setActive((i) => (i + 1) % SOCIALS.length);
    }, 2300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      setGlow({
        left: `${Math.random() * 120 - 30}%`,
        top: `${Math.random() * 60 - 30}%`,
      });
      timer = setTimeout(move, 4000 + Math.random() * 4000);
    };
    move();
    return () => clearTimeout(timer);
  }, []);

  return (
    <footer className="afd-foot relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1 overflow-hidden rounded-2xl border border-border bg-card px-5 py-2 sm:px-6 sm:py-2.5">
      <style>{`
        .afd-foot > * { position: relative; z-index: 1; }
        .afd-glow {
          position: absolute; width: 48%; border-radius: 50%; z-index: 0; pointer-events: none;
          top: -40%; bottom: -40%;
          background: radial-gradient(closest-side, color-mix(in oklab, var(--primary) 28%, transparent), transparent);
          filter: blur(10px);
          transition: left 6s ease-in-out, top 6s ease-in-out;
        }
        .afd-caret {
          display: inline-block; width: 5px; height: 10px;
          background: var(--primary); margin-left: 3px;
          animation: afd-blink 1.1s step-end infinite;
          vertical-align: -1px;
        }
        @keyframes afd-blink { 50% { opacity: 0; } }
        .afd-rot { position: relative; height: 20px; min-width: 140px; flex: 0 0 auto; }
        .afd-item {
          position: absolute; right: 0; top: 0; height: 20px;
          display: flex; align-items: center; gap: 5px;
          text-decoration: none; color: var(--foreground); font-size: 11px; line-height: 20px;
          opacity: 0; transform: translateY(4px);
          transition: opacity .5s, transform .5s;
          pointer-events: none;
        }
        .afd-item.active { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .afd-item b { color: var(--primary); font-weight: 600; }
        .afd-ico {
          position: relative; width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in oklab, var(--primary) 12%, transparent);
          color: var(--primary);
          transition: background .25s, color .25s;
        }
        .afd-rot:hover .afd-item.active .afd-ico {
          background: var(--primary); color: var(--primary-foreground);
        }
        .afd-rot:hover .afd-item.active .afd-ico::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          animation: afd-ripple 1.3s ease-out infinite;
        }
        @keyframes afd-ripple {
          0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 50%, transparent); }
          100% { box-shadow: 0 0 0 22px color-mix(in oklab, var(--primary) 0%, transparent); }
        }
      `}</style>

      <div className="afd-glow" style={{ left: glow.left, top: glow.top }} />

      <span
        className="inline-flex items-center text-xs text-muted-foreground"
        style={{ borderLeft: "3px solid var(--primary)", paddingLeft: 11 }}
      >
        © <b className="text-primary">{new Date().getFullYear()} lotmetrik</b>
        <span className="afd-caret" aria-hidden />
      </span>

      <nav
        className="afd-rot"
        aria-label="Social media"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SOCIALS.map((s, idx) => {
          const Icon = s.Icon;
          return (
            <a
              key={s.label}
              className={`afd-item${idx === active ? " active" : ""}`}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
            >
              <span className="afd-ico">
                <Icon className="h-[11px] w-[11px]" />
              </span>
              <b>{s.handle}</b>
            </a>
          );
        })}
      </nav>
    </footer>
  );
}
