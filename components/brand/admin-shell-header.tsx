"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

type AdminShellHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function AdminShellHeader({ children, className }: AdminShellHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const onScroll = () => {
      header.toggleAttribute("data-scrolled", window.scrollY > 4);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        "scroll-shadow-top sticky top-0 z-40 border-b border-border bg-surface",
        className,
      )}
    >
      {children}
    </header>
  );
}
