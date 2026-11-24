"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/projects");
    router.refresh();
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email address to receive a magic link.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (magicError) {
      setError(magicError.message);
      setLoading(false);
      return;
    }

    alert("Check your email for your secure sign-in link.");
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "480px", margin: "40px auto" }}>
      <div className="crumb">StoryVoice / Account Sign In</div>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR WRITING SPACE</div>
          <h1>Welcome back</h1>
          <p className="sub">Sign in to access your projects, recordings, and accepted scenes.</p>
        </div>
      </div>

      <div className="panel">
        {error && <div className="notice error" style={{ marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="writer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="action-row" style={{ marginTop: "24px" }}>
            <button type="submit" className="btn primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleMagicLink}
              disabled={loading}
            >
              Send Magic Link
            </button>
          </div>
        </form>

        <div style={{ marginTop: "20px", fontSize: "12px", color: "var(--slate)", textAlign: "center" }}>
          Don&apos;t have an account yet?{" "}
          <Link href="/signup" style={{ color: "var(--blue)", fontWeight: 600 }}>
            Create writer account
          </Link>
        </div>
      </div>
    </div>
  );
}
