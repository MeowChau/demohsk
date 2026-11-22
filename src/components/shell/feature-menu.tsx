"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { STUDENT_NAV, isActiveRoute } from "@/lib/navigation";
import { usePathname } from "next/navigation";
export function FeatureMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const links = STUDENT_NAV.slice(6);
  const active = links.some(item => isActiveRoute(pathname, item.href));
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <div className="relative" ref={root}>
    <button type="button" ref={trigger} onClick={() => setOpen(!open)}
      aria-expanded={open} aria-controls="feature-menu" data-active={active}
      className="hsk-nav-link">
      Thêm<ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id="feature-menu" className="absolute right-0 top-full z-50 mt-3 flex w-60 flex-col gap-1 whitespace-normal rounded-2xl border-2 border-mist bg-surface p-2 shadow-float">
      {links.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
        aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined}
        className="hsk-nav-link w-full justify-start rounded-xl">
        <item.icon size={18} aria-hidden="true" />{item.label}
      </Link>)}
    </div>}
  </div>;
}
