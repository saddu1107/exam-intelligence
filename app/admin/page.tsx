"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Subject = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSubjects() {
    if (!supabase) return;
    const { data, error } = await supabase.from("subjects")
      .select("id,title,slug,description,published")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setSubjects((data ?? []) as Subject[]);
  }

  useEffect(() => {
    let active = true;
    async function checkAdmin() {
      if (!supabase) {
        setMessage("Supabase configuration is missing.");
        setChecking(false);
        return;
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/auth");
        return;
      }
      const { data: profile, error } = await supabase.from("profiles")
        .select("role").eq("id", user.id).single();
      if (!active) return;
      if (error || profile?.role !== "admin") {
        setMessage("Admin access only. This account does not have admin permissions.");
        setChecking(false);
        return;
      }
      setAllowed(true);
      setChecking(false);
      await loadSubjects();
    }
    void checkAdmin();
    return () => { active = false; };
  }, [router]);

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !allowed) return;
    setBusy(true);
    setMessage("");
    const cleanTitle = title.trim();
    const cleanSlug = slug.trim().toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("subjects").insert({
      title: cleanTitle,
      slug: cleanSlug,
      description: description.trim() || null,
      published: false,
    });
    if (error) setMessage(error.message);
    else {
      setTitle("");
      setSlug("");
      setDescription("");
      setMessage("Subject added successfully.");
      await loadSubjects();
    }
    setBusy(false);
  }

  async function togglePublished(subject: Subject) {
    if (!supabase || !allowed) return;
    const { error } = await supabase.from("subjects")
      .update({ published: !subject.published }).eq("id", subject.id);
    if (error) setMessage(error.message);
    else await loadSubjects();
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.replace("/auth");
  }

  if (checking) return <main className="auth-shell"><section className="auth-card"><p>Checking admin access…</p></section></main>;

  if (!allowed) return (
    <main className="auth-shell"><section className="auth-card">
      <h1>Admin access required</h1><p>{message}</p>
      <button className="auth-submit" onClick={() => router.push("/dashboard")}>Go to student dashboard</button>
    </section></main>
  );

  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ width: "min(900px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div><div className="eyebrow">EXAM INTELLIGENCE</div><h1>Admin dashboard</h1>
            <p className="auth-subtitle">Manage subjects for your lecture library.</p></div>
          <button className="secondary" onClick={signOut}>Log out</button>
        </div>
        <h2>Add a subject</h2>
        <form onSubmit={addSubject}>
          <label>Subject name
            <input value={title} onChange={event => {
              setTitle(event.target.value);
              setSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
            }} placeholder="e.g. Indian Polity" required />
          </label>
          <label>URL slug
            <input value={slug} onChange={event => setSlug(event.target.value)} placeholder="indian-polity" required />
          </label>
          <label>Description
            <input value={description} onChange={event => setDescription(event.target.value)} placeholder="Short subject description" />
          </label>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Add subject"}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <h2 style={{ marginTop: 32 }}>Existing subjects</h2>
        {subjects.length === 0 ? <p className="auth-subtitle">No subjects found yet.</p> : subjects.map(subject => (
          <div key={subject.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid #e5e7eb" }}>
            <div><strong>{subject.title}</strong><p className="auth-subtitle">{subject.slug} · {subject.description || "No description"}</p></div>
            <button className="secondary" onClick={() => togglePublished(subject)}>{subject.published ? "Unpublish" : "Publish"}</button>
          </div>
        ))}
      </section>
    </main>
  );
            }
