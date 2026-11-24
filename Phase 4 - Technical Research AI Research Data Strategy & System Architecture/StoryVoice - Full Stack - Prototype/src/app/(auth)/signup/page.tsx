"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    alert("Account created. Please check your email to confirm your account.");
    router.push("/login");
  };

  return (
    <div style={{ maxWidth: "480px", margin: "40px auto" }}>
      <div className="crumb">StoryVoice / Account Creation</div>
      <div className="page-head">
        <div>
          <div className="eyebrow">YOUR WRITING SPACE</div>
          <h1>Create your account</h1>
          <p className="sub">Give your spoken scenes and manuscript drafts a secure home.</p>
        </div>
      </div>

      <div className="panel">
        {error && <div className="notice error" style={{ marginBottom: "16px" }}>{error}</div>}

        <form onSubmit={handleSignup}>
          <div className="field">
            <label htmlFor="displayName">Author name / Display name</label>
            <input
              id="displayName"
              placeholder="e.g. Mara Ellison"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

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
            <label htmlFor="password">Password (at least 8 characters)</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="notice" style={{ margin: "16px 0" }}>
            Your recordings and drafts are private to your account and protected by Row Level Security.
          </div>

          <button type="submit" className="btn primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Creating account…" : "Create Writer Account"}
          </button>
        </form>

        <div style={{ marginTop: "20px", fontSize: "12px", color: "var(--slate)", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
