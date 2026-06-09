import { AppShell } from "@/components/brand/app-shell";
import { AlertBanner, Button } from "@/components/ui";
import { getBrandConfig } from "@/lib/brand/config";
import { pageTitle } from "@/lib/brand/metadata";
import { signIn } from "@/lib/auth";
import { AlertCircle, Calendar, Users, Video } from "lucide-react";
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

const features = [
  { icon: Calendar, label: "Shared availability across members" },
  { icon: Users, label: "Panel scheduling without back-and-forth" },
  { icon: Video, label: "Meet links created automatically" },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const error = params.error;
  const brand = getBrandConfig();

  return (
    <AppShell variant="auth-minimal">
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-primary-25/30 to-primary-100/20" />
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-4">
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <Image
              src={brand.logoUrl}
              alt={`${brand.appName} logo`}
              width={72}
              height={72}
              priority
              className="h-[72px] w-[72px] shrink-0 object-contain"
              unoptimized
            />
          </div>
          <div className="text-center">
            <h1
              className="animate-fade-up font-grotesk text-display leading-display font-semibold text-neutral-900"
              style={{ animationDelay: "80ms" }}
            >
              {brand.appName}
            </h1>
            <p
              className="animate-fade-up prose-measure mx-auto mt-3 text-sm leading-body text-neutral-500"
              style={{ animationDelay: "80ms" }}
            >
              Schedule panel interviews with pooled availability.
            </p>
          </div>

          <ul className="w-full max-w-sm space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-start gap-3 text-sm text-neutral-500"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div
            className="animate-fade-up w-full max-w-[420px] rounded-lg border border-neutral-100 bg-white p-6 shadow-s4 sm:p-8"
            style={{ animationDelay: "160ms" }}
          >
            <h2 className="text-heading font-semibold text-neutral-900">Sign in</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Use your Google Workspace account to manage calendars and schedule
              meetings.
            </p>

            {error && (
              <AlertBanner variant="error" className="mt-6">
                <span className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Sign-in failed. Use an account on your organization&apos;s
                    domain.
                  </span>
                </span>
              </AlertBanner>
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

            <p className="mt-4 text-center text-xs text-neutral-500">
              Only approved workspace accounts can access admin features.
            </p>
          </div>

          <p
            className="animate-fade-up text-caption text-neutral-500"
            style={{ animationDelay: "240ms" }}
          >
            Powered by {brand.poweredBy}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
