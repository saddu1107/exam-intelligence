"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Lecture = { id: string; title: string };
type Question = { id: string; question_text: string };
type Test = { id: string; title: string; question_count: number; published: boolean };
const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5eaf2", borderRadius: 14, padding: 20, marginTop: 18 };
const input: React.CSSProperties = { width: "100%", padding: 11, border: "1px solid #cfd8e5", borderRadius: 8, marginTop: 6, background: "#fff", color: "#14213d" };
const label: React.CSSProperties = { display: "block", marginTop: 12, fontWeight: 650, color: "#344054", fontSize: 14 };
const btn: React.CSSProperties = { background: "#08a6c5", color: "#fff", border: 0, padding: "11px 16px", borderRadius: 8, fontWeight: 700, marginTop: 14 };
function parseCsv(text:string): string[][] {
 const rows:string[][]=[]; let row:string[]=[]; let cell=""; let quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"'){quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell.trim());cell="";}else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());if(row.some(x=>x.length))rows.push(row);row=[];cell="";}else{cell+=ch;}}
 row.push(cell.trim());if(row.some(x=>x.length))rows.push(row);return rows;
}
export default function AdminTestsPage() {
 const router=useRouter(); const [ready,setReady]=useState(false); const [message,setMessage]=useState("");
 const [lectures,setLectures]=useState<Lecture[]>([]); const [lectureId,setLectureId]=useState("");
 const [questions,setQuestions]=useState<Question[]>([]); const [tests,setTests]=useState<Test[]>([]);
 const [qtext,setQtext]=useState(""); const [opts,setOpts]=useState(["","","",""]); const [correct,setCorrect]=useState("0"); const [explanation,setExplanation]=useState("");
 const [testTitle,setTestTitle]=useState(""); const [count,setCount]=useState("30"); const [marksCorrect,setMarksCorrect]=useState("2"); const [marksWrong,setMarksWrong]=useState("0.5"); const [busy,setBusy]=useState(false); const [csvRows,setCsvRows]=useState<any[]>([]); const [csvName,setCsvName]=useState("");
 async function load(){if(!supabase)return; const [l,q,t]=await Promise.all([supabase.from("lectures").select("id,title").order("title"),supabase.from("questions").select("id,question_text").eq("lecture_id",lectureId).order("created_at",{ascending:false}),supabase.from("tests").select("id,title,question_count,published").eq("lecture_id",lectureId).order("created_at",{ascending:false})]); if(l.error||q.error||t.error){setMessage(l.error?.message||q.error?.message||t.error?.message||"Could not load");return;} setLectures(l.data||[]);setQuestions(q.data||[]);setTests(t.data||[]);if(!lectureId&&l.data?.length)setLectureId(l.data[0].id);}
 useEffect(()=>{let live=true; (async()=>{if(!supabase){setMessage("Supabase is not configured");return;}const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace("/auth");return;}const {data,error}=await supabase.rpc("is_admin");if(!live)return;if(error||data!==true){setMessage("Admin access required");return;}setReady(true);await load();})();return()=>{live=false;};},[router]);
 useEffect(()=>{if(ready&&lectureId)void load();},[lectureId,ready]);
 async function addQuestion(e:FormEvent){e.preventDefault();if(!supabase||!lectureId)return;if(opts.some(x=>!x.trim())){setMessage("Please fill all four options.");return;}setBusy(true);const {error}=await supabase.from("questions").insert({lecture_id:lectureId,question_text:qtext.trim(),options:opts,correct_option:Number(correct),explanation:explanation.trim()||null});setMessage(error?"Question save failed: "+error.message:"Question added to this lecture.");if(!error){setQtext("");setOpts(["","","",""]);setExplanation("");await load();}setBusy(false);}
 async function readCsv(file:File|null){
  setCsvRows([]);setCsvName("");if(!file)return;
  const raw=parseCsv(await file.text());if(raw.length<2){setMessage("CSV must include a header and at least one question.");return;}
  const headers=raw[0].map(x=>x.toLowerCase().replace(/^\\ufeff/,"").trim());
  const required=["question","option_a","option_b","option_c","option_d","correct_option"];
  const missing=required.filter(h=>!headers.includes(h));if(missing.length){setMessage("Missing CSV columns: "+missing.join(", "));return;}
  const rows=raw.slice(1).map((cells,i)=>{const get=(key:string)=>cells[headers.indexOf(key)]||"";const answer=get("correct_option").toUpperCase();const correctIndex=["A","B","C","D"].indexOf(answer)>=0?["A","B","C","D"].indexOf(answer):Number(answer)>=1&&Number(answer)<=4?Number(answer)-1:Number(answer);return {row:i+2,question_text:get("question"),options:[get("option_a"),get("option_b"),get("option_c"),get("option_d")],correct_option:correctIndex,explanation:get("explanation")||null};});
  const invalid=rows.filter(x=>!x.question_text||x.options.some((v:string)=>!v)||!Number.isInteger(x.correct_option)||x.correct_option<0||x.correct_option>3);
  if(invalid.length){setMessage("CSV validation failed on row(s): "+invalid.slice(0,12).map(x=>x.row).join(", ")+". Check question, all options and correct_option (A-D or 1-4).");return;}
  if(rows.length>500){setMessage("Upload maximum 500 questions per CSV batch.");return;}
  setCsvRows(rows);setCsvName(file.name);setMessage("Validated "+rows.length+" questions. Review and import.");
 }
 async function importCsv(){
  if(!supabase||!lectureId||!csvRows.length)return;setBusy(true);
  const payload=csvRows.map(({row,...question})=>({...question,lecture_id:lectureId}));
  const {error}=await supabase.from("questions").insert(payload);
  setMessage(error?"Bulk import failed: "+error.message:"Successfully imported "+payload.length+" questions.");
  if(!error){setCsvRows([]);setCsvName("");await load();}setBusy(false);
 }
 async function createTest(e:FormEvent){e.preventDefault();if(!supabase||!lectureId)return;const n=Number(count);if(questions.length<n){setMessage("This lecture has only "+questions.length+" questions. Add at least "+n+" before creating this test.");return;}setBusy(true);const {data,error}=await supabase.from("tests").insert({lecture_id:lectureId,title:testTitle.trim(),question_count:n,seconds_per_question:20,marks_correct:Number(marksCorrect),marks_wrong:Number(marksWrong),published:false}).select("id").single();if(error||!data){setMessage("Test creation failed: "+(error?.message||"Unknown error"));setBusy(false);return;}const chosen=questions.slice(0,n).map((q,i)=>({test_id:data.id,question_id:q.id,sort_order:i+1}));const link=await supabase.from("test_questions").insert(chosen);if(link.error){await supabase.from("tests").delete().eq("id",data.id);setMessage("Could not attach questions: "+link.error.message);}else{setMessage("Test created with "+n+" questions and 20 seconds per question.");setTestTitle("");await load();}setBusy(false);}
 async function publish(t:Test){if(!supabase)return;const {error}=await supabase.from("tests").update({published:!t.published}).eq("id",t.id);setMessage(error?error.message:(t.published?"Test unpublished":"Test published"));await load();}
 if(!ready)return <main style={{maxWidth:850,margin:"50px auto",padding:20,color:"#14213d"}}><h1>Admin test studio</h1><p>{message||"Verifying admin access…"}</p><Link href="/admin">Back to admin</Link></main>;
 return <main style={{maxWidth:900,margin:"30px auto",padding:"0 18px 60px",color:"#14213d"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:"#08a6c5",fontWeight:800}}>EXAM INTELLIGENCE</div><h1>Question bank & test studio</h1></div><Link href="/admin">← Content manager</Link></div>
 {message&&<p role="status" style={{background:"#e9f8fb",padding:12,borderRadius:8}}>{message}</p>}
 <section style={box}><h2>Choose lecture</h2><select style={input} value={lectureId} onChange={e=>setLectureId(e.target.value)}><option value="">Select lecture</option>{lectures.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select><p>{questions.length} questions currently in this lecture.</p></section>
 <section style={box}><h2>Bulk upload questions (CSV)</h2><p>Required columns: question, option_a, option_b, option_c, option_d, correct_option. Optional: explanation. Correct option accepts A–D or 1–4.</p><a href="/question-bank-template.csv" download style={{color:"#078aa5",fontWeight:700}}>Download CSV template</a><label style={label}>Choose CSV file<input style={input} type="file" accept=".csv,text/csv" onChange={e=>void readCsv(e.target.files?.[0]||null)}/></label>{csvName&&<p>{csvName} · {csvRows.length} validated questions</p>}{csvRows.length>0&&<><div style={{maxHeight:240,overflow:"auto",border:"1px solid #e5eaf2",borderRadius:8,padding:10}}>{csvRows.slice(0,5).map((q,i)=><p key={i}><b>{i+1}. {q.question_text}</b><br/>A. {q.options[0]} · B. {q.options[1]} · C. {q.options[2]} · D. {q.options[3]}<br/><small>Correct: {String.fromCharCode(65+q.correct_option)} · {q.explanation||"No explanation"}</small></p>)}{csvRows.length>5&&<p>…and {csvRows.length-5} more</p>}</div><button style={btn} disabled={busy||!lectureId} onClick={()=>void importCsv()}>Import {csvRows.length} questions</button></>}</section>
 <section style={box}><h2>Add a question</h2><form onSubmit={addQuestion}><label style={label}>Question text<textarea style={input} rows={3} value={qtext} onChange={e=>setQtext(e.target.value)} required/></label>{opts.map((v,i)=><label style={label} key={i}>Option {i+1}<input style={input} value={v} onChange={e=>setOpts(old=>old.map((x,j)=>j===i?e.target.value:x))} required/></label>)}<label style={label}>Correct option<select style={input} value={correct} onChange={e=>setCorrect(e.target.value)}>{opts.map((_,i)=><option key={i} value={i}>Option {i+1}</option>)}</select></label><label style={label}>Explanation<textarea style={input} rows={3} value={explanation} onChange={e=>setExplanation(e.target.value)}/></label><button style={btn} disabled={busy||!lectureId}>Save question</button></form></section>
 <section style={box}><h2>Create lecture test</h2><form onSubmit={createTest}><label style={label}>Test title<input style={input} value={testTitle} onChange={e=>setTestTitle(e.target.value)} placeholder="Fundamental Rights - Practice Test" required/></label><label style={label}>Question count<select style={input} value={count} onChange={e=>setCount(e.target.value)}><option value="30">30 questions</option><option value="50">50 questions</option></select></label><label style={label}>Marks per correct answer<input style={input} type="number" step="0.25" value={marksCorrect} onChange={e=>setMarksCorrect(e.target.value)}/></label><label style={label}>Negative marks per wrong answer<input style={input} type="number" step="0.25" value={marksWrong} onChange={e=>setMarksWrong(e.target.value)}/></label><p>Timer: 20 seconds per question. The first {count} questions in the current question bank will be assigned in order.</p><button style={btn} disabled={busy||!lectureId}>Create test</button></form></section>
 <section style={box}><h2>Existing tests</h2>{tests.length===0?<p>No tests created yet.</p>:tests.map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderTop:"1px solid #edf0f5"}}><div><b>{t.title}</b><div>{t.question_count} questions · 20 sec each · {t.published?"Published":"Draft"}</div></div><button style={btn} onClick={()=>void publish(t)}>{t.published?"Unpublish":"Publish"}</button></div>)}</section>
 </main>;
}
