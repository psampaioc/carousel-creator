import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

import { ReviewQueue } from "@/components/review/ReviewQueue";

export default async function WorkspacePage() {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL ||
    !process.env.CLERK_SECRET_KEY ||
    !process.env.OPERATOR_EMAIL
  ) {
    return null;
  }

  const user = await currentUser();
  const operatorEmail = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
  const signedInEmail = user?.emailAddresses
    .find((address) => address.id === user.primaryEmailAddressId)
    ?.emailAddress.toLowerCase();

  if (!operatorEmail) {
    return <WorkspaceState title="Server configuration incomplete" detail="OPERATOR_EMAIL is missing." />;
  }

  if (!user) {
    return <WorkspaceState title="Authentication required" detail="Sign in from the home page to continue." />;
  }

  if (signedInEmail !== operatorEmail) {
    return <WorkspaceState title="Operator access required" detail="This account is not on the workspace allowlist." />;
  }

  return <ReviewQueue />;
}

function WorkspaceState({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Private workspace</p>
        <h1>{title}</h1>
        <p>{detail}</p>
        <Link href="/">Return home</Link>
      </section>
    </main>
  );
}
