"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";

type Exam={id:string;slug:string;title:string;short_name:string;description:string;display_order:number};
export default function ExamsPage(){
 const [exams,setExams]=useState<Exam[]>([]);const [selected,setSelected]=useState<string[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;(async()=>{if(!supabase)return;const {data:{user}}=await supabase.auth.getUser();if(!user)return;const [e,s]=await Promise.all([supabase.from("exams").select("id,slug,title,short_name,description,display_order").eq("is_active",true).order("display_order"),supabase.from("student_exam_selections").select("exam_id").eq("student_id",user.id)]);if(!live)return;setExams((e.data||[]) as Exam[]);setSelected((s.data||[]).map(x=>x.exam_id));setLoading(false)})();return()=>{live=false}},[]);
 async function toggle(examId:string){if(!supabase)return;const {data:{user}}=await supabase.auth.getUser();if(!user)return;if(selected.includes(examId)){const {error}=await supabase.from("student_exam_selections").delete().eq("student_id",user.id).eq("exam_id",examId);if(!error)setSelected(v=>v.filter(x=>x!==examId))}else{const {error}=await supabase.from("student_exam_selections").insert({student_id:user.id,exam_id:examId});if(!error)setSelected(v=>[...v,examId])}}
 return <main className="ei-exams-page"><div className="ei-exams-hero"><div className="eyebrow">EXAM INTELLIGENCE · SSC PREPARATION</div><h1>Choose your target exam</h1><p>Explore exam-specific preparation spaces, syllabus updates and your study progress — all in one place.</p><div className="ei-exams-count"><b>07</b><span>SSC exam categories</span><i>·</i><b>100%</b><span>Free to learn</span></div></div>
 <div className="ei-exams-heading"><div><div className="eyebrow">YOUR EXAM CENTRE</div><h2>SSC examination catalogue</h2></div><span>{selected.length} selected</span></div>
 {loading?<p className="ei-exams-muted">Loading examinations…</p>:<div className="ei-exam-grid">{exams.map((exam,i)=><article className="ei-exam-card" key={exam.id}><div className="ei-exam-card-top"><span className="ei-exam-number">{String(i+1).padStart(2,"0")}</span><span className={selected.includes(exam.id)?"ei-exam-selected":"ei-exam-free"}>{selected.includes(exam.id)?"Your target":"Free access"}</span></div><div className="ei-exam-short">{exam.short_name}</div><h3>{exam.title}</h3><p>{exam.description}</p><div className="ei-exam-actions"><Link href={"/exams/"+exam.slug}>Open exam centre <span>→</span></Link><button onClick={()=>toggle(exam.id)}>{selected.includes(exam.id)?"Remove target":"Set as target"}</button></div></article>)}</div>}
 <div className="ei-exams-note"><b>About syllabus accuracy</b><p>We publish syllabus topics only after verification against official SSC notifications. Until then, the exam centre will clearly show that syllabus content is being verified.</p></div>
 </main>
}