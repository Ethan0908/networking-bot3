"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button type="button" className="button secondary" disabled>
        Loading…
      </button>
    );
  }

  if (!session) {
    return (
      <button type="button" className="button secondary" onClick={() => signIn("google")}>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="auth-button">
      <p className="auth-greeting">Hi {session.user?.name}</p>
      <button type="button" className="button secondary" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}
