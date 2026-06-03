import { CalendarsNavLink } from "@/components/brand/calendars-nav-link";
import { Button } from "@/components/ui";
import { getBrandConfig } from "@/lib/brand/config";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/ui/cn";
import Image from "next/image";
import Link from "next/link";

export type AppShellProps = {
  variant: "admin" | "public" | "auth-minimal";
  children: React.ReactNode;
  userEmail?: string;
};

function BrandLogo({
  showName = true,
  centered = false,
}: {
  showName?: boolean;
  centered?: boolean;
}) {
  const brand = getBrandConfig();

  return (
    <Link
      href="/calendars"
      className={cn(
        "interactive flex items-center gap-2.5",
        centered && "justify-center",
      )}
    >
      <Image
        src={brand.logoUrl}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0"
        unoptimized
      />
      {showName && (
        <span className="text-title font-display font-semibold text-ink">
          {brand.appName}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ variant, children, userEmail }: AppShellProps) {
  if (variant === "auth-minimal") {
    return (
      <div className="flex min-h-full flex-col bg-paper">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mb-8">
            <BrandLogo centered />
          </div>
          {children}
        </div>
      </div>
    );
  }

  if (variant === "public") {
    return (
      <div className="flex min-h-full flex-col bg-paper">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl items-center px-[var(--page-px)] py-3">
            <BrandLogo showName={false} />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-[var(--page-px)] py-3">
          <nav className="flex items-center gap-6 text-sm">
            <BrandLogo />
            <CalendarsNavLink />
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {userEmail && (
              <span className="text-ink-muted">{userEmail}</span>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
