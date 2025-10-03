"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  const send = async () => {
    const response = await fetch("/api/send", { method: "POST" });
    const text = await response.text();
    alert(text);
  };

  if (status === "loading") {
    return <p>Loading…</p>;
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      {!session ? (
        <button onClick={() => signIn("google")}>Sign in with Google</button>
      ) : (
        <>
          <p>Signed in as {session.user?.email}</p>
          <button onClick={send}>Send test email</button>
          <button onClick={() => signOut()}>Sign out</button>
        </>
      )}
      <Link href="/rolodex">Go to Rolodex</Link>
    </main>
  );
}
