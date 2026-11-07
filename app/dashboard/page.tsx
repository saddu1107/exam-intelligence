"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) router.replace("/auth");
      else setUser(data.user);
      setLoading(false);
    }
    loadUser();
    return () => { active = false; };
  }, [router]);

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <main className="dashboard-shell"><p>Loading your account…</p></main>;
  if (!user) return <main className="dashboard-shell"><p>Redirecting to login…</p></main>;

  const displayName = user.user_metadata?.full_name || user.email || "Student";
  return (
    <main className="dashboard-shell">
      <nav className="nav"><Link className="brand" href="/"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><button className="logout-button" onClick={logout}>Log out</button></nav>
      <section className="dashboard-welcome"><div className="eyebrow">STUDENT AREA</div><h1>Welcome, {displayName}</h1><p>Your account is connected. Your lecture library, tests and rankings will appear here as we build the next modules.</p><div className="account-panel"><span>Signed in as</span><strong>{user.email}</strong></div><Link className="dashboard-home" href="/">Return to homepage</Link></section>
    </main>
  );
}
