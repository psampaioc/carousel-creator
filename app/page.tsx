import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Coimbra · weekly engineering events</p>
          <h1>Build the carousel from facts you can trace.</h1>
          <p className="lede">
            A private editorial workspace for reviewing sourced events before
            they become social media slides.
          </p>
        </div>
        <div className="actions">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="button">Sign in as operator</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link className="button" href="/workspace">Open workspace</Link>
            <UserButton />
          </Show>
        </div>
      </section>
    </main>
  );
}
