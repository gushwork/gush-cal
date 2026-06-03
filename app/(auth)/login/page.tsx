import { pageTitle } from "@/lib/brand/metadata";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui";
import { getBrandConfig } from "@/lib/brand/config";
import { signIn } from "@/lib/auth";
import Image from "next/image";

export const metadata = pageTitle("Sign in");

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const error = params.error;
  const brand = getBrandConfig();

  return (
    <div className="flex min-h-full flex-col lg:min-h-[calc(100dvh)] lg:flex-row">
      <div className="flex flex-col items-center justify-center bg-primary-soft px-6 py-10 lg:w-1/2 lg:items-start lg:px-12 lg:py-16">
        <div className="flex max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <Image
            src={brand.logoUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0"
            unoptimized
          />
          <h1 className="text-display mt-6 font-display font-semibold text-ink">
            {brand.appName}
          </h1>
          <p className="text-body mt-3 text-ink-muted">
            Schedule panel interviews with pooled availability.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <PageContainer variant="narrow" className="w-full">
          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="text-title font-display font-semibold text-ink">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Use your Google Workspace account to manage calendars and schedule
              meetings.
            </p>

            {error && (
              <p className="mt-6 rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive">
                Sign-in failed. Use an account on your organization&apos;s
                domain.
              </p>
            )}

            <form
              className="mt-8"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <Button type="submit" className="w-full gap-2.5">
                <GoogleIcon className="h-5 w-5 shrink-0" />
                Continue with Google
              </Button>
            </form>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
