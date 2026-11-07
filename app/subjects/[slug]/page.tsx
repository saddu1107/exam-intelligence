"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Chapter = { id: string; title: string; sort_order: number };
type Lecture = { id: string; chapter_id: string; title: string; youtube_unlisted_url: string | null; notes_file_path: string | null; sort_order: number };
type Test = { id: string; title: string; question_count: number };

function getYouTubeEmbed(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) id = parsed.pathname.slice(1);
    else if (parsed.hostname.includes("youtube.com")) id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch {
    return null;
  }
}

export default function SubjectPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [subject, setSubject] = useState<{ id: string; title: string; description: string | null } | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [lectureTestMap, setLectureTestMap] = useState<Record<string,string[]>>({});
  const [noteUrls, setNoteUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLibrary() {
      if (!supabase) {
        setError("The learning library is temporarily unavailable.");
        setLoading(false);
        return;
      }
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects").select("id,title,description").eq("slug", slug).eq("published", true).maybeSingle();
      if (subjectError || !subjectData) {
        if (active) { setError("This subject is not available."); setLoading(false); }
        return;
      }
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters").select("id,title,sort_order").eq("subject_id", subjectData.id).order("sort_order");
      if (chapterError) {
        if (active) { setError("Could not load chapters. Please refresh."); setLoading(false); }
        return;
      }
      const chapterIds = (chapterData ?? []).map((chapter) => chapter.id);
      let lectureData: Lecture[] = [];
      if (chapterIds.length) {
        const { data, error: lectureError } = await supabase
          .from("lectures").select("id,chapter_id,title,youtube_unlisted_url,notes_file_path,sort_order")
          .in("chapter_id", chapterIds).eq("published", true).order("sort_order");
        if (lectureError) {
          if (active) { setError("Could not load lectures. Please refresh."); setLoading(false); }
          return;
        }
        lectureData = (data ?? []) as Lecture[];
      }
      let testData: Test[] = [];
      if (lectureData.length) {
        const { data } = await supabase.from("lecture_tests").select("test_id,tests(id,title,question_count)").in("lecture_id", lectureData.map(l => l.id));
        testData = (data ?? []).map((row: any) => row.tests).filter(Boolean) as Test[];
        const map: Record<string,string[]> = {}; (data ?? []).forEach((row: any) => { if (row.tests?.id) map[row.lecture_id] = [...(map[row.lecture_id] || []), row.tests.id]; }); setLectureTestMap(map);
      }
      const signedNotes: Record<string, string> = {};
      if (supabase && lectureData.length) {
        await Promise.all(lectureData.filter(l => l.notes_file_path).map(async l => {
          const { data } = await supabase!.storage.from("lecture-notes").createSignedUrl(l.notes_file_path!, 3600);
          if (data?.signedUrl) signedNotes[l.id] = data.signedUrl;
        }));
      }
      if (!active) return;
      setNoteUrls(signedNotes);
      setTests(testData);
      setExpandedChapter((chapterData ?? []).find(chapter => lectureData.some(lecture => lecture.chapter_id === chapter.id))?.id ?? null);
      setSubject(subjectData);
      setChapters((chapterData ?? []) as Chapter[]);
      setLectures(lectureData);
      setLoading(false);
    }
    void loadLibrary();
    return () => { active = false; };
  }, [slug]);

  if (loading) return <main className="dashboard-shell"><p>Loading subject…</p></main>;
  if (error || !subject) return <main className="dashboard-shell"><nav className="nav"><Link className="brand" href="/home">EXAM INTELLIGENCE</Link></nav><section className="dashboard-welcome"><h1>Subject unavailable</h1><p>{error || "This subject is not available."}</p><Link className="dashboard-home" href="/home">← Student home</Link></section></main>;

  return (
    <main className="dashboard-shell">
      <nav className="nav"><Link className="brand" href="/"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><Link className="dashboard-home" href="/home">Student home</Link></nav>
      <section style={{ padding: "42px 0 20px" }}>
        <div className="eyebrow">LEARNING LIBRARY</div>
        <h1 style={{ color: "var(--navy)", fontSize: "clamp(32px,5vw,48px)" }}>{subject.title}</h1>
        <p className="auth-subtitle">{subject.description || "Choose a chapter and start learning."}</p>
      </section>
      {chapters.length === 0 ? <section className="dashboard-welcome"><h2>Chapters coming soon</h2><p>Lessons for this subject are being prepared.</p></section> : (
        <div style={{ display: "grid", gap: 18, paddingBottom: 60 }}>
          {chapters.map((chapter) => {
            const chapterLectures = lectures.filter((lecture) => lecture.chapter_id === chapter.id);
            const isExpanded = expandedChapter === chapter.id;
            return <section className="subject-card" key={chapter.id} style={{ cursor: "pointer" }}>
              <button type="button" onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)} aria-expanded={isExpanded} style={{ display: "block", width: "100%", textAlign: "left", border: 0, padding: 0, background: "transparent", color: "inherit", cursor: "pointer" }}>
                <div className="eyebrow">CHAPTER {chapter.sort_order || ""}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <h2 style={{ marginBottom: 0 }}>{chapter.title}</h2>
                  <span aria-hidden="true" style={{ color: "#0797b4", fontSize: 24 }}>{isExpanded ? "−" : "+"}</span>
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>{chapterLectures.length ? `${chapterLectures.length} published lecture(s)` : "No published lectures yet"}</p>
              </button>
              {isExpanded && (chapterLectures.length === 0 ? <p className="muted" style={{ marginTop: 18 }}>This chapter is being prepared. Its lectures and tests will appear here once published.</p> : chapterLectures.map((lecture) => {
                const embed = getYouTubeEmbed(lecture.youtube_unlisted_url);
                const lectureTests = tests.filter(t => (lectureTestMap[lecture.id] || []).includes(t.id));
                return <article key={lecture.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 18, marginTop: 18 }}>
                  <h3>{lecture.title}</h3>
                  {embed ? <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", marginTop: 12, overflow: "hidden", borderRadius: 12, background: "#0b1730" }}><iframe src={embed} title={lecture.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div> : <p className="muted">Video will be available soon.</p>}
                  {lecture.notes_file_path && noteUrls[lecture.id] && <p><a href={noteUrls[lecture.id]} target="_blank" rel="noreferrer" style={{ color: "#0797b4", fontWeight: 700 }}>Download lecture PDF notes ↗</a></p>}
                  {lectureTests.map(test => <p key={test.id}><Link href={`/tests/${test.id}`} className="dashboard-home">Start {test.title} ({test.question_count} questions) →</Link></p>)}
                  {!lectureTests.length && <p className="muted">Lecture test will appear here when published.</p>}
                </article>;
              }))}
            </section>;
          })}
        </div>
      )}
    </main>
  );
}
