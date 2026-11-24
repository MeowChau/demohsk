"use client";
import { useEffect, useRef, useState } from "react";
import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { ChevronDown } from "lucide-react";
import { STUDENT_NAV, isActiveRoute } from "@/lib/navigation";
import { usePathname } from "next/navigation";
export function FeatureMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <div className="relative" ref={root}><button type="button" ref={trigger} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="feature-menu" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate hover:bg-paper hover:text-ink">Thêm<ChevronDown size={15} /></button>{open && <div id="feature-menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-mist bg-surface p-2 shadow-float">{STUDENT_NAV.slice(6).map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${isActiveRoute(pathname, item.href) ? "bg-brand/10 text-brand" : "text-slate hover:bg-paper"}`}><item.icon size={17} />{item.label}</Link>)}</div>}</div>;
}
