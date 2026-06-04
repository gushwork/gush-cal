import { AdminShellHeader } from "@/components/brand/admin-shell-header";
import { CalendarsNavLink } from "@/components/brand/calendars-nav-link";
import { UserMenu } from "@/components/brand/user-menu";
import { getBrandConfig } from "@/lib/brand/config";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/ui/cn";
import Image from "next/image";
import Link from "next/link";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export type AppShellProps = {
  variant: "admin" | "public" | "auth-minimal";
  children: React.ReactNode;
  userEmail?: string;
  publicLogoHref?: string | null;
};

function BrandLogo({
  showName = true,
  centered = false,
  href = "/calendars",
  linkable = true,
}: {
  showName?: boolean;
  centered?: boolean;
  href?: string | null;
  linkable?: boolean;
}) {
  const brand = getBrandConfig();
  const content = (
    <>
      <Image
        src={brand.logoUrl}
        alt={`${brand.appName} logo`}
        width={28}
        height={28}
        priority
        className="h-7 w-7 shrink-0"
        unoptimized
      />
      {showName && (
        <span className="text-title font-display font-semibold text-ink">
          {brand.appName}
        </span>
      )}
    </>
  );

  if (!linkable || !href) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5",
          centered && "justify-center",
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "interactive flex items-center gap-2.5",
        centered && "justify-center",
      )}
    >
      {content}
    </Link>
  );
}

export function AppShell({
  variant,
  children,
  userEmail,
  publicLogoHref = null,
}: AppShellProps) {
  if (variant === "auth-minimal") {
    return (
      <div className="flex min-h-full flex-col bg-paper">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-md)]"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
    );
  }

  if (variant === "public") {
    return (
      <div className="flex min-h-full flex-col bg-paper">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-md)]"
        >
          Skip to main content
        </a>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-[var(--content-booking)] items-center px-[var(--page-px)] py-3">
            <BrandLogo
              showName={false}
              href={publicLogoHref}
              linkable={publicLogoHref != null}
            />
          </div>
        </header>
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-md)]"
      >
        Skip to main content
      </a>
      <AdminShellHeader>
        <div className="mx-auto flex max-w-[var(--content-admin)] items-center justify-between px-[var(--page-px)] py-3">
          <nav className="flex items-center gap-6 text-sm">
            <BrandLogo />
            <CalendarsNavLink />
          </nav>
          {userEmail && (
            <UserMenu email={userEmail} signOutAction={signOutAction} />
          )}
        </div>
      </AdminShellHeader>
      <main id="main-content" className="animate-page-in flex-1">
        {children}
      </main>
    </div>
  );
}
