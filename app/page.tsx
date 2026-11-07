"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Subject = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

const icons: Record<string, string> = {
  "indian-polity": "⚖️",
  history: "🏛️",
  geography: "🌍",
  mathematics: "📐",
  reasoning: "🧩",
  english: "📘",
  "general-science": "🔬",
  "current-affairs": "📰",
  economics: "📊",
  "static-gk": "📚",
  environment: "🌱",
};

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      if (!supabase) {
        setError("The learning library is temporarily unavailable. Please try again later.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("subjects")
        .select("id,title,slug,description")
        .eq("published", true)
        .order("title", { ascending: true });

      if (!active) return;
      if (queryError) setError("We couldn't load subjects. Please refresh the page.");
      else setSubjects((data ?? []) as Subject[]);
      setLoading(false);
    }

    void loadSubjects();
    return () => { active = false; };
  }, []);

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link>
        <div className="nav-links"><a href="#subjects">Subjects</a><a href="#how">How it works</a><Link className="login" href="/auth">Student login / Sign up</Link></div>
      </nav>

      <section className="hero">
        <div className="eyebrow">YOUR LECTURE. YOUR TEST. YOUR RANK.</div>
        <h1>Learn the topic.<br/><span>Prove what you know.</span></h1>
        <p>Watch focused video lectures, study the notes, and attempt a timed test created from that exact lesson. Track every result and climb the leaderboard.</p>
        <div className="hero-actions"><a className="primary" href="#subjects">Explore subjects <span>→</span></a><a className="secondary" href="#how">How it works</a></div>
        <div className="hero-stats"><div><strong>20 sec</strong><small>per question</small></div><div><strong>30 / 50</strong><small>questions per lecture test</small></div><div><strong>Free</strong><small>initial student access</small></div></div>
      </section>

      <section id="subjects" className="section">
        <div className="section-head"><div><div className="eyebrow">START PREPARING</div><h2>Choose your subject</h2></div><span className="muted">SSC • Railway • More exams later</span></div>
        {loading ? <p className="muted">Loading published subjects…</p> : error ? <p className="auth-message" role="alert">{error}</p> : subjects.length === 0 ? <p className="muted">New subjects are being prepared. Please check back soon.</p> : (
          <div className="subject-grid">
            {subjects.map((subject) => (
              <Link className="subject-card" href={`/subjects/${subject.slug}`} key={subject.id} style={{ color: "inherit", textDecoration: "none" }}>
                <div className="subject-icon">{icons[subject.slug] ?? "📖"}</div>
                <h3>{subject.title}</h3>
                <p>{subject.description || "Explore chapters, video lectures and practice tests."}</p>
                <div className="card-foot"><span>Open learning library</span><span className="arrow">↗</span></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="how" className="how">
        <div className="eyebrow">A SIMPLE LEARNING LOOP</div><h2>One lecture at a time.</h2>
        <div className="steps">
          {[["01", "Watch", "Learn from the embedded video lecture."], ["02", "Read", "Use the lecture PDF or notes alongside it."], ["03", "Attempt", "Take a 30- or 50-question timed test."], ["04", "Improve", "Review mistakes, marks and your rank."]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <footer><Link className="brand" href="/"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><span>Prepare Smart. Perform Better.</span></footer>
    </main>
  );
}
