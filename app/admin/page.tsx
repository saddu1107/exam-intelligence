"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Subject = { id: string; title: string; slug: string; description: string | null; published: boolean; section_id?: string | null };
type Section = { id: string; title: string; slug: string };
type Chapter = { id: string; subject_id: string; title: string; sort_order: number };
type Lecture = { id: string; chapter_id: string; title: string; youtube_unlisted_url: string | null; notes_file_path: string | null; sort_order: number; published: boolean };

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e5eaf2", borderRadius: 16, padding: 22, marginTop: 20 };
const field: React.CSSProperties = { display: "grid", gap: 7, marginTop: 12, color: "#344054", fontSize: 14, fontWeight: 600 };
const control: React.CSSProperties = { width: "100%", border: "1px solid #cfd8e5", borderRadius: 9, padding: "11px 12px", color: "#14213d", background: "#fff", font: "inherit" };
const primary: React.CSSProperties = { border: 0, borderRadius: 9, padding: "12px 18px", background: "#08a6c5", color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: 14 };
const secondary: React.CSSProperties = { border: "1px solid #cfd8e5", borderRadius: 9, padding: "9px 13px", background: "#fff", color: "#14213d", fontWeight: 650, cursor: "pointer" };

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [newSectionId, setNewSectionId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterOrder, setChapterOrder] = useState("1");
  const [lectureTitle, setLectureTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [lectureOrder, setLectureOrder] = useState("1");
  const [pdf, setPdf] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadContent = useCallback(async (currentSubjectId: string) => {
    if (!supabase) return;
    const [s, c, l] = await Promise.all([
      supabase.from("subjects").select("id,title,slug,description,published").order("created_at", { ascending: false }),
      supabase.from("chapters").select("id,subject_id,title,sort_order").order("sort_order"),
      supabase.from("lectures").select("id,chapter_id,title,youtube_unlisted_url,notes_file_path,sort_order,published").order("sort_order"),
    ]);
    if (s.error || c.error || l.error) {
      setMessage("Could not load content: " + (s.error?.message || c.error?.message || l.error?.message));
      return;
    }
    const ss = (s.data ?? []) as Subject[];
    setSubjects(ss); setChapters((c.data ?? []) as Chapter[]); setLectures((l.data ?? []) as Lecture[]); setSections((sec.data ?? []) as Section[]); setNewSectionId(current => current || sec.data?.[0]?.id || "");
    if (!currentSubjectId && ss.length) setSubjectId(ss[0].id);
  }, []);

  useEffect(() => {
    let active = true;
    async function checkAdmin() {
      if (!supabase) { setMessage("Supabase is not configured. Check project environment variables."); setChecking(false); return; }
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) { setMessage(error.message); setChecking(false); return; }
      if (!user) { router.replace("/auth"); return; }
      const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
      if (!active) return;
      if (adminError || isAdmin !== true) {
        setMessage(adminError?.message || "This account does not have admin access. Ask the project owner to assign the admin role.");
        setChecking(false); return;
      }
      setAllowed(true); setChecking(false); await loadContent("");
    }
    void checkAdmin();
    return () => { active = false; };
  }, [router, loadContent]);

  const selectedChapters = chapters.filter(c => c.subject_id === subjectId);
  const selectedLectures = lectures.filter(l => selectedChapters.some(c => c.id === l.chapter_id));

  async function addSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !allowed) return;
    setBusy(true); setMessage("");
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("subjects").insert({ title: title.trim(), slug: cleanSlug, description: description.trim() || null, section_id: newSectionId || null, published: false });
    setMessage(error ? "Could not add subject: " + error.message : "Subject added. Publish it when its content is ready.");
    if (!error) { setTitle(""); setSlug(""); setDescription(""); await loadContent(subjectId); }
    setBusy(false);
  }

  async function addChapter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !subjectId) return;
    setBusy(true);
    const { error } = await supabase.from("chapters").insert({ subject_id: subjectId, title: chapterTitle.trim(), sort_order: Number(chapterOrder) || 1 });
    setMessage(error ? "Could not add chapter: " + error.message : "Chapter added.");
    if (!error) { setChapterTitle(""); await loadContent(subjectId); }
    setBusy(false);
  }

  async function addLecture(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase || !chapterId) return;
    if (pdf && pdf.type !== "application/pdf") { setMessage("Please select a PDF file only."); return; }
    setBusy(true); setMessage("");
    const { data: created, error } = await supabase.from("lectures").insert({
      chapter_id: chapterId, title: lectureTitle.trim(), youtube_unlisted_url: youtubeUrl.trim() || null,
      sort_order: Number(lectureOrder) || 1, published: false,
    }).select("id").single();
    if (error || !created) { setMessage("Could not add lecture: " + (error?.message || "Unknown error")); setBusy(false); return; }
    if (pdf) {
      const path = created.id + "/" + Date.now() + "-" + pdf.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const upload = await supabase.storage.from("lecture-notes").upload(path, pdf, { contentType: "application/pdf", upsert: false });
      if (upload.error) {
        setMessage("Lecture created, but PDF upload failed: " + upload.error.message + ". You can retry by editing the lecture later.");
      } else {
        const update = await supabase.from("lectures").update({ notes_file_path: path }).eq("id", created.id);
        setMessage(update.error ? "Lecture created; PDF uploaded but path could not be saved: " + update.error.message : "Lecture and PDF added successfully.");
      }
    } else setMessage("Lecture added. Publish it when ready.");
    setLectureTitle(""); setYoutubeUrl(""); setPdf(null);
    const fileInput = document.getElementById("lecture-pdf") as HTMLInputElement | null; if (fileInput) fileInput.value = "";
    await loadContent(subjectId); setBusy(false);
  }

  async function toggle(table: "subjects" | "lectures", item: Subject | Lecture) {
    if (!supabase) return;
    const { error } = await supabase.from(table).update({ published: !item.published }).eq("id", item.id);
    setMessage(error ? "Could not update publish status: " + error.message : (item.published ? "Content unpublished." : "Content published."));
    if (!error) await loadContent(subjectId);
  }

  async function editChapter(chapter: Chapter) {
    if (!supabase) return;
    const nextTitle = window.prompt("Chapter title", chapter.title);
    if (nextTitle === null || !nextTitle.trim()) return;
    const nextOrder = window.prompt("Display order", String(chapter.sort_order));
    if (nextOrder === null) return;
    setBusy(true);
    const { error } = await supabase.from("chapters").update({ title: nextTitle.trim(), sort_order: Number(nextOrder) || chapter.sort_order }).eq("id", chapter.id);
    setMessage(error ? "Could not update chapter: " + error.message : "Chapter updated.");
    if (!error) await loadContent(subjectId);
    setBusy(false);
  }
  async function deleteChapter(chapter: Chapter) {
    if (!supabase || !window.confirm("Delete this chapter and all lectures/tests under it? This cannot be undone.")) return;
    setBusy(true); const { error } = await supabase.from("chapters").delete().eq("id", chapter.id);
    setMessage(error ? "Could not delete chapter: " + error.message : "Chapter deleted.");
    if (!error) await loadContent(subjectId); setBusy(false);
  }
  async function editLecture(lecture: Lecture) {
    if (!supabase) return;
    const nextTitle = window.prompt("Lecture title", lecture.title); if (nextTitle === null || !nextTitle.trim()) return;
    const nextUrl = window.prompt("YouTube URL (blank removes it)", lecture.youtube_unlisted_url || ""); if (nextUrl === null) return;
    const nextOrder = window.prompt("Display order", String(lecture.sort_order)); if (nextOrder === null) return;
    setBusy(true); const { error } = await supabase.from("lectures").update({ title: nextTitle.trim(), youtube_unlisted_url: nextUrl.trim() || null, sort_order: Number(nextOrder) || lecture.sort_order }).eq("id", lecture.id);
    setMessage(error ? "Could not update lecture: " + error.message : "Lecture updated."); if (!error) await loadContent(subjectId); setBusy(false);
  }
  async function replaceLecturePdf(lecture: Lecture, file: File | null) {
    if (!supabase || !file) return; if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) { setMessage("Choose a PDF up to 20 MB."); return; }
    setBusy(true); const path = lecture.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const { error: uploadError } = await supabase.storage.from("lecture-notes").upload(path, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) setMessage("PDF upload failed: " + uploadError.message); else { const { error } = await supabase.from("lectures").update({ notes_file_path: path }).eq("id", lecture.id); setMessage(error ? error.message : "Lecture PDF replaced successfully."); if (!error) await loadContent(subjectId); }
    setBusy(false);
  }
  async function deleteLecture(lecture: Lecture) {
    if (!supabase || !window.confirm("Delete this lecture and its tests? This cannot be undone.")) return;
    setBusy(true); const { error } = await supabase.from("lectures").delete().eq("id", lecture.id); setMessage(error ? error.message : "Lecture deleted."); if (!error) await loadContent(subjectId); setBusy(false);
  }
  async function editSubject(subject: Subject) {
    if (!supabase) return;
    const nextTitle = window.prompt("Subject name", subject.title); if (nextTitle === null || !nextTitle.trim()) return;
    const nextSlug = window.prompt("URL slug", subject.slug); if (nextSlug === null || !nextSlug.trim()) return;
    const nextDescription = window.prompt("Description", subject.description || ""); if (nextDescription === null) return;
    const cleanSlug = nextSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    setBusy(true); const { error } = await supabase.from("subjects").update({ title: nextTitle.trim(), slug: cleanSlug, description: nextDescription.trim() || null }).eq("id", subject.id);
    setMessage(error ? "Could not update subject: " + error.message : "Subject updated."); if (!error) await loadContent(subjectId); setBusy(false);
  }
  async function deleteSubject(subject: Subject) {
    if (!supabase || !window.confirm("Delete this subject and all its chapters, lectures and tests? This cannot be undone.")) return;
    setBusy(true); const { error } = await supabase.from("subjects").delete().eq("id", subject.id);
    setMessage(error ? "Could not delete subject: " + error.message : "Subject deleted."); if (!error) { if (subjectId === subject.id) setSubjectId(""); await loadContent(subjectId); } setBusy(false);
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); router.replace("/auth"); }

  if (checking) return <main className="auth-shell"><section className="auth-card"><p>Checking admin access…</p></section></main>;
  if (!allowed) return <main className="auth-shell"><section className="auth-card"><h1>Admin access required</h1><p className="auth-message" role="alert">{message || "Admin verification did not pass."}</p><button className="auth-submit" onClick={() => router.push("/dashboard")}>Go to student dashboard</button></section></main>;

  return <main className="dashboard-shell" style={{ background: "#f5f8fc", minHeight: "100vh", padding: "28px 18px 60px" }}>
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div><div className="eyebrow">EXAM INTELLIGENCE · CONTROL ROOM</div><h1 style={{ color: "#14213d", margin: "8px 0" }}>Admin Content Manager</h1><p style={{ color: "#667085", margin: 0 }}>Organise sections, subjects, chapters and published lectures. Unpublished content stays hidden from students.</p></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href="/admin/tests" style={{ ...secondary, textDecoration: "none" }}>Question bank & test studio ↗</a><button style={secondary} onClick={signOut}>Log out</button></div>
      </header>
      {message && <p role="status" style={{ background: "#e9f8fb", color: "#07576a", borderRadius: 10, padding: 12, marginTop: 18 }}>{message}</p>}
      <section style={panel}><h2 style={{ margin: 0, color: "#14213d" }}>1. Add a subject inside a section</h2><form onSubmit={addSubject}>
        <label style={field}>Section<select style={control} value={newSectionId} onChange={e => setNewSectionId(e.target.value)} required>{sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
        <label style={field}>Subject name<input style={control} value={title} onChange={e => { setTitle(e.target.value); setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} placeholder="Indian Polity" required /></label>
        <label style={field}>URL slug<input style={control} value={slug} onChange={e => setSlug(e.target.value)} placeholder="indian-polity" required /></label>
        <label style={field}>Description<input style={control} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short subject description" /></label>
        <button style={primary} disabled={busy}>Add subject</button>
      </form></section>
      <section style={panel}><h2 style={{ margin: 0, color: "#14213d" }}>2. Add a chapter</h2><form onSubmit={addChapter}>
        <label style={field}>Choose subject<select style={control} value={subjectId} onChange={e => { setSubjectId(e.target.value); setChapterId(""); }} required><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label style={field}>Chapter title<input style={control} value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="Fundamental Rights" required /></label>
        <label style={field}>Chapter order<input style={control} type="number" min="1" value={chapterOrder} onChange={e => setChapterOrder(e.target.value)} /></label>
        <button style={primary} disabled={busy || !subjectId}>Add chapter</button>
      </form></section>
      <section style={panel}><h2 style={{ margin: 0, color: "#14213d" }}>Chapter manager</h2><p style={{ color: "#667085" }}>Edit chapter names and display order, or remove chapters.</p>{selectedChapters.length === 0 ? <p>No chapters in this subject yet.</p> : selectedChapters.map(ch => <div key={ch.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderTop: "1px solid #edf0f5", padding: "12px 0", flexWrap: "wrap" }}><div><b>{ch.sort_order}. {ch.title}</b><div style={{ color: "#667085", fontSize: 13 }}>{lectures.filter(l => l.chapter_id === ch.id).length} lectures</div></div><div style={{ display: "flex", gap: 8 }}><button style={secondary} disabled={busy} onClick={() => void editChapter(ch)}>Edit</button><button style={secondary} disabled={busy} onClick={() => void deleteChapter(ch)}>Delete</button></div></div>)}</section>
      <section style={panel}><h2 style={{ margin: 0, color: "#14213d" }}>3. Add a lecture</h2><form onSubmit={addLecture}>
        <label style={field}>Choose chapter<select style={control} value={chapterId} onChange={e => setChapterId(e.target.value)} required><option value="">Select chapter</option>{selectedChapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label style={field}>Lecture title<input style={control} value={lectureTitle} onChange={e => setLectureTitle(e.target.value)} placeholder="Introduction to the Constitution" required /></label>
        <label style={field}>YouTube Unlisted link<input style={control} type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..." /></label>
        <label style={field}>Lecture PDF notes (max 20 MB)<input id="lecture-pdf" style={control} type="file" accept="application/pdf,.pdf" onChange={e => setPdf(e.target.files?.[0] ?? null)} /></label>
        <label style={field}>Lecture order<input style={control} type="number" min="1" value={lectureOrder} onChange={e => setLectureOrder(e.target.value)} /></label>
        <button style={primary} disabled={busy || !chapterId}>{busy ? "Saving…" : "Save lecture"}</button>
      </form></section>
      <section style={panel}><h2 style={{ margin: 0, color: "#14213d" }}>4. Publish content</h2><p style={{ color: "#667085" }}>Review your content and publish it when it is ready for students.</p>
        <h3 style={{ color: "#14213d" }}>Subjects</h3><button style={secondary} onClick={() => setPreviewOpen(v => !v)}>{previewOpen ? "Hide structure preview" : "Preview selected subject structure"}</button>{previewOpen && <div style={{ background: "#f5f8fc", borderRadius: 12, padding: 16, marginTop: 12 }}><h3>{subjects.find(s => s.id === subjectId)?.title || "Select a subject"}</h3>{selectedChapters.map(ch => <div key={ch.id} style={{ padding: "10px 0", borderTop: "1px solid #dce4ee" }}><b>{ch.sort_order}. {ch.title}</b>{selectedLectures.filter(l => l.chapter_id === ch.id).map(l => <div key={l.id} style={{ padding: "5px 0 5px 16px", color: "#526174" }}>↳ {l.title} {l.published ? "· Published" : "· Draft"} {l.notes_file_path ? "· PDF" : ""}</div>)}</div>)}{selectedChapters.length === 0 && <p>No chapters to preview.</p>}</div>}
        {subjects.map(s => <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid #edf0f5", padding: "12px 0", flexWrap: "wrap" }}><div><b>{s.title}</b><div style={{ color: "#667085", fontSize: 13 }}>{s.slug} · {chapters.filter(c => c.subject_id === s.id).length} chapters · {s.published ? "Published" : "Draft"}</div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={secondary} onClick={() => void toggle("subjects", s)}>{s.published ? "Unpublish" : "Publish"}</button><button style={secondary} disabled={busy} onClick={() => void editSubject(s)}>Edit</button><button style={secondary} disabled={busy} onClick={() => void deleteSubject(s)}>Delete</button></div></div>)}
        <h3 style={{ color: "#14213d", marginTop: 22 }}>Lectures in {subjects.find(s => s.id === subjectId)?.title || "selected subject"}</h3>
        {selectedLectures.length === 0 ? <p style={{ color: "#667085" }}>No lectures added yet.</p> : selectedLectures.map(l => <div key={l.id} style={{ borderTop: "1px solid #edf0f5", padding: "14px 0" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><b>{l.title}</b><div style={{ color: "#667085", fontSize: 13 }}>{chapters.find(c => c.id === l.chapter_id)?.title} · {l.notes_file_path ? "PDF attached" : "No PDF"} · {l.published ? "Published" : "Draft"}</div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={secondary} onClick={() => void toggle("lectures", l)}>{l.published ? "Unpublish" : "Publish"}</button><button style={secondary} disabled={busy} onClick={() => void editLecture(l)}>Edit</button><label style={{ ...secondary, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>Replace PDF<input type="file" accept="application/pdf,.pdf" hidden onChange={e => { void replaceLecturePdf(l, e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} /></label><button style={secondary} disabled={busy} onClick={() => void deleteLecture(l)}>Delete</button></div></div></div>)}
      </section>
      <p style={{ color: "#667085", fontSize: 13, textAlign: "center", marginTop: 24 }}>Question bank and timed test builder are the next module.</p>
    </div>
  </main>;
}
