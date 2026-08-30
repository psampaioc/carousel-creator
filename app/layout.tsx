import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Coimbra Carousel Creator",
  description: "A private, evidence-first weekly carousel workspace.",
};

function ConfigurationNotice({ missing }: { missing: string[] }) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Configuration required</p>
        <h1>The private workspace is not connected yet.</h1>
        <p>
          Add the missing deployment settings, then reload. No credentials or
          operator data have been exposed to the browser.
        </p>
        <code>{missing.join(", ")}</code>
      </section>
    </main>
  );
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const missing = [
    !clerkPublishableKey && "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    !convexUrl && "NEXT_PUBLIC_CONVEX_URL",
    !process.env.CLERK_SECRET_KEY && "CLERK_SECRET_KEY",
    !process.env.OPERATOR_EMAIL && "OPERATOR_EMAIL",
  ].filter((name): name is string => Boolean(name));

  return (
    <html lang="en">
      <body>
        {!clerkPublishableKey ||
        !convexUrl ||
        !process.env.CLERK_SECRET_KEY ||
        !process.env.OPERATOR_EMAIL ? (
          <ConfigurationNotice missing={missing} />
        ) : (
          <ClerkProvider publishableKey={clerkPublishableKey}>
            <ConvexClientProvider url={convexUrl}>{children}</ConvexClientProvider>
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
