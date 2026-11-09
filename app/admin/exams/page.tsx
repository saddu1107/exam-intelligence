"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Exam = { id: string; slug: string; title: string; short_name: string };
type Subject = { id: string; title: string };
type Chapter = { id: string; subject_id: string; title: string; sort_order: number };
type SyllabusItem = {
  id: string;
  exam_id: string;
  subject_id: string | null;
  chapter_id: string | null;
  title: string;
  title_hi: string | null;
  level: "subject" | "chapter" | "topic";
  source_status: "draft" | "verified";
  official_source_url: string | null;
  display_order: number;
  is_published: boolean;
};

const emptyForm = {
  subject_id: "",
  chapter_id: "",
  title: "",
  title_hi: "",
  level: "topic" as "subject" | "chapter" | "topic",
  source_status: "draft" as "draft" | "verified",
  official_source_url: "",
  display_order: "1",
  is_published: false,
};

export default function AdminExamSyllabusPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [examId, setExamId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    if (!supabase) {
      setError("Supabase is not configured. Check the project environment variables.");
      setLoading(false);
      return;
    }
    const [examResult, subjectResult, chapterResult, syllabusResult] = await Promise.all([
      supabase.from("exams").select("id,slug,title,short_name").order("display_order"),
      supabase.from("subjects").select("id,title").order("title"),
      supabase.from("chapters").select("id,subject_id,title,sort_order").order("sort_order"),
      supabase.from("exam_syllabus").select("*").order("exam_id").order("display_order"),
    ]);
    const firstError = examResult.error || subjectResult.error || chapterResult.error || syllabusResult.error;
    if (firstError) {
      setError("Could not load syllabus data: " + firstError.message);
      setLoading(false);
      return;
    }
    const examRows = (examResult.data || []) as Exam[];
    setExams(examRows);
    setSubjects((subjectResult.data || []) as Subject[]);
    setChapters((chapterResult.data || []) as Chapter[]);
    setItems((syllabusResult.data || []) as SyllabusItem[]);
    setExamId(current => current || examRows[0]?.id || "");
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleItems = useMemo(
    () => items.filter(item => item.exam_id === examId),
    [items, examId]
  );
  const filteredChapters = useMemo(
    () => chapters.filter(chapter => !form.subject_id || chapter.subject_id === form.subject_id),
    [chapters, form.subject_id]
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editItem(item: SyllabusItem) {
    setEditingId(item.id);
    setForm({
      subject_id: item.subject_id || "",
      chapter_id: item.chapter_id || "",
      title: item.title,
      title_hi: item.title_hi || "",
      level: item.level,
      source_status: item.source_status,
      official_source_url: item.official_source_url || "",
      display_order: String(item.display_order),
      is_published: item.is_published,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !examId) return;
    setError("");
    setMessage("");

    const title = form.title.trim();
    const sourceUrl = form.official_source_url.trim();
    if (!title) {
      setError("Enter the syllabus topic or heading in English.");
      return;
    }
    if (form.source_status === "verified" && !sourceUrl) {
      setError("Add the official SSC source URL before marking this item verified.");
      return;
    }
    if (form.is_published && (form.source_status !== "verified" || !sourceUrl)) {
      setError("Only verified syllabus items with an official source URL can be published.");
      return;
    }

    setSaving(true);
    const payload = {
      exam_id: examId,
      subject_id: form.subject_id || null,
      chapter_id: form.chapter_id || null,
      title,
      title_hi: form.title_hi.trim() || null,
      level: form.level,
      source_status: form.source_status,
      official_source_url: sourceUrl || null,
      display_order: Math.max(0, Number(form.display_order) || 0),
      is_published: form.is_published,
    };

    const result = editingId
      ? await supabase.from("exam_syllabus").update(payload).eq("id", editingId)
      : await supabase.from("exam_syllabus").insert(payload);

    if (result.error) {
      setError("Could not save syllabus item: " + result.error.message);
    } else {
      setMessage(editingId ? "Syllabus item updated." : "Syllabus item added.");
      resetForm();
      await loadData();
    }
    setSaving(false);
  }

  async function togglePublished(item: SyllabusItem) {
    if (!supabase) return;
    setError("");
    setMessage("");
    if (!item.is_published && (item.source_status !== "verified" || !item.official_source_url)) {
      setError("Verify the item and add its official source URL before publishing.");
      return;
    }
    const { error: updateError } = await supabase
      .from("exam_syllabus")
      .update({ is_published: !item.is_published })
      .eq("id", item.id);
    if (updateError) {
      setError("Could not change publish status: " + updateError.message);
      return;
    }
    setItems(current => current.map(row => row.id === item.id ? { ...row, is_published: !item.is_published } : row));
    setMessage(item.is_published ? "Syllabus item unpublished." : "Verified syllabus item published.");
  }

  if (loading) return <div className="ei-admin-exams"><p>Loading exam syllabus manager…</p></div>;

  return (
    <div className="ei-admin-exams">
      <div className="ei-admin-exams-heading">
        <div>
          <div className="ei-admin-eyebrow">CONTENT MANAGEMENT · PHASE 5</div>
          <h1>SSC syllabus manager</h1>
          <p>Create bilingual syllabus entries, attach official sources and publish only after verification.</p>
        </div>
        <span className="ei-admin-exams-count">{items.length} total entries</span>
      </div>

      {message && <div className="ei-admin-exam-message success" role="status">{message}</div>}
      {error && <div className="ei-admin-exam-message error" role="alert">{error}</div>}

      <section className="ei-admin-exam-panel">
        <div className="ei-admin-exam-panel-title">
          <div><span>01 · SELECT EXAM</span><h2>Choose an SSC examination</h2></div>
          <small>7 exam categories supported</small>
        </div>
        <select className="ei-admin-exam-control" value={examId} onChange={event => { setExamId(event.target.value); resetForm(); }}>
          {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.short_name} — {exam.title}</option>)}
        </select>
      </section>

      <section className="ei-admin-exam-panel">
        <div className="ei-admin-exam-panel-title">
          <div><span>02 · {editingId ? "EDIT ENTRY" : "ADD ENTRY"}</span><h2>{editingId ? "Update syllabus entry" : "Create syllabus entry"}</h2></div>
          {editingId && <button className="ei-admin-exam-secondary" type="button" onClick={resetForm}>Cancel edit</button>}
        </div>
        <form onSubmit={saveItem} className="ei-admin-exam-form">
          <label>Heading / topic (English)<input className="ei-admin-exam-control" value={form.title} onChange={event => setForm(v => ({ ...v, title: event.target.value }))} placeholder="e.g. Fundamental Rights" required /></label>
          <label>शीर्षक / विषय (Hindi)<input className="ei-admin-exam-control" value={form.title_hi} onChange={event => setForm(v => ({ ...v, title_hi: event.target.value }))} placeholder="उदाहरण: मौलिक अधिकार" /></label>
          <div className="ei-admin-exam-form-grid">
            <label>Level<select className="ei-admin-exam-control" value={form.level} onChange={event => setForm(v => ({ ...v, level: event.target.value as typeof form.level }))}><option value="subject">Subject</option><option value="chapter">Chapter</option><option value="topic">Topic</option></select></label>
            <label>Existing subject<select className="ei-admin-exam-control" value={form.subject_id} onChange={event => setForm(v => ({ ...v, subject_id: event.target.value, chapter_id: "" }))}><option value="">Not linked</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.title}</option>)}</select></label>
            <label>Existing chapter<select className="ei-admin-exam-control" value={form.chapter_id} onChange={event => setForm(v => ({ ...v, chapter_id: event.target.value }))}><option value="">Not linked</option>{filteredChapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>
            <label>Display order<input className="ei-admin-exam-control" type="number" min="0" value={form.display_order} onChange={event => setForm(v => ({ ...v, display_order: event.target.value }))} /></label>
          </div>
          <label>Official SSC source URL<input className="ei-admin-exam-control" type="url" value={form.official_source_url} onChange={event => setForm(v => ({ ...v, official_source_url: event.target.value }))} placeholder="https://ssc.gov.in/…" /></label>
          <div className="ei-admin-exam-form-grid two">
            <label>Source verification<select className="ei-admin-exam-control" value={form.source_status} onChange={event => setForm(v => ({ ...v, source_status: event.target.value as typeof form.source_status, is_published: event.target.value === "verified" ? v.is_published : false }))}><option value="draft">Draft — not verified</option><option value="verified">Verified against official source</option></select></label>
            <label className="ei-admin-exam-publish"><input type="checkbox" checked={form.is_published} disabled={form.source_status !== "verified" || !form.official_source_url.trim()} onChange={event => setForm(v => ({ ...v, is_published: event.target.checked }))} /> Publish for students (requires verified source)</label>
          </div>
          <div className="ei-admin-exam-actions"><button className="ei-admin-exam-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add syllabus entry"}</button></div>
        </form>
      </section>

      <section className="ei-admin-exam-panel">
        <div className="ei-admin-exam-panel-title">
          <div><span>03 · SYLLABUS LIBRARY</span><h2>{exams.find(exam => exam.id === examId)?.short_name || "Selected exam"} entries</h2></div>
          <small>{visibleItems.filter(item => item.is_published).length} published · {visibleItems.filter(item => !item.is_published).length} drafts / hidden</small>
        </div>
        {visibleItems.length === 0 ? <div className="ei-admin-exam-empty">No syllabus entries yet. Add the first verified heading above.</div> :
          <div className="ei-admin-exam-list">{visibleItems.map(item => (
            <article className="ei-admin-exam-row" key={item.id}>
              <div className="ei-admin-exam-row-main">
                <div className="ei-admin-exam-row-badges"><span>{item.level}</span><span className={item.source_status === "verified" ? "verified" : "draft"}>{item.source_status === "verified" ? "Source verified" : "Draft source"}</span><span className={item.is_published ? "published" : "hidden"}>{item.is_published ? "Published" : "Hidden from students"}</span></div>
                <strong>{item.title}</strong>
                {item.title_hi && <small>{item.title_hi}</small>}
                {item.official_source_url && <a href={item.official_source_url} target="_blank" rel="noreferrer">Open official source ↗</a>}
              </div>
              <div className="ei-admin-exam-row-actions">
                <button type="button" className="ei-admin-exam-secondary" onClick={() => editItem(item)}>Edit</button>
                <button type="button" className="ei-admin-exam-secondary" onClick={() => void togglePublished(item)}>{item.is_published ? "Unpublish" : "Publish"}</button>
              </div>
            </article>
          ))}</div>}
      </section>
      <p className="ei-admin-exam-footnote">Content integrity rule: entries remain hidden until an administrator marks them verified and supplies an official SSC source URL. Existing subjects and chapters are linked, not duplicated.</p>
    </div>
  );
}
