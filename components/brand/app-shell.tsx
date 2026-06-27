import { AdminShellHeader } from "@/components/brand/admin-shell-header";
import { CalendarsNavLink } from "@/components/brand/calendars-nav-link";
import { UserMenu } from "@/components/brand/user-menu";
import { getBrandConfig } from "@/lib/brand/config";
import { GITHUB_REPO_URL } from "@/lib/brand/github";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/ui/cn";
import Image from "next/image";
import Link from "next/link";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export type AppShellProps = {
  variant: "admin" | "public" | "auth-minimal";
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
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
        width={30}
        height={30}
        priority
        className="h-[30px] w-[30px] shrink-0"
        unoptimized
      />
      {showName && (
        <span className="font-grotesk text-base font-semibold text-neutral-900">
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
  userName,
  publicLogoHref = null,
}: AppShellProps) {
  if (variant === "auth-minimal") {
    return (
      <div className="relative flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-s4"
        >
          Skip to main content
        </a>
        <main id="main-content" className="page-bg flex flex-1 flex-col">
          {children}
        </main>
      </div>
    );
  }

  if (variant === "public") {
    return (
      <div className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-s4"
        >
          Skip to main content
        </a>
        <header className="z-20 border-b border-neutral-100 bg-white">
          <div className="mx-auto flex max-w-[var(--content-booking)] items-center justify-between px-[var(--page-px)] py-3">
            <BrandLogo
              href={publicLogoHref}
              linkable={publicLogoHref != null}
            />
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="interactive flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-2 text-neutral-700 transition-colors hover:text-neutral-900"
              aria-label="Star us on GitHub"
            >
              <span className="text-sm font-medium">Like this? Star the repo</span>
              <GithubIcon className="h-5 w-5 shrink-0" />
            </a>
          </div>
        </header>
        <main id="main-content" className="page-bg flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-s4"
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
            <UserMenu
              email={userEmail}
              name={userName}
              signOutAction={signOutAction}
            />
          )}
        </div>
      </AdminShellHeader>
      <main id="main-content" className="page-bg animate-page-in flex-1">
        {children}
      </main>
    </div>
  );
}
