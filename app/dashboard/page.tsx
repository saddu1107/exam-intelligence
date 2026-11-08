"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Attempt = {
 id:string; score:number|null; correct_count:number; wrong_count:number; unanswered_count:number;
 submitted_at:string|null; status:string; time_taken_seconds:number|null;
 tests:{title:string;question_count:number;marks_correct:number;lectures:{title:string;chapters:{title:string;subjects:{title:string}}}|null}|null;
};
type Rank={scope:string;scope_name:string;student_id:string;student_name:string;tests_taken:number;average_percentage:number;rank:number};

export default function DashboardPage(){
 const router=useRouter();
 const [user,setUser]=useState<User|null>(null);
 const [loading,setLoading]=useState(true);
 const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [ranks,setRanks]=useState<Rank[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{
  if(!supabase){setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();if(!active)return;
  if(!user){router.replace("/auth");return;}setUser(user);
  const [a,r]=await Promise.all([
   supabase.from("attempts").select("id,score,correct_count,wrong_count,unanswered_count,submitted_at,status,time_taken_seconds,tests(title,question_count,marks_correct,lectures:lectures!tests_lecture_id_fkey(title,chapters(title,subjects(title))))").eq("student_id",user.id).order("created_at",{ascending:false}).limit(100),
   supabase.rpc("student_leaderboards")
  ]);
  if(!active)return;
  if(a.error)setError("Could not load result history: "+a.error.message);else setAttempts((a.data||[]) as unknown as Attempt[]);
  if(r.error)setError(v=>v||"Leaderboard is temporarily unavailable: "+r.error.message);else setRanks((r.data||[]) as Rank[]);
  setLoading(false);
 })();return()=>{active=false;};},[router]);
 const completed=useMemo(()=>attempts.filter(a=>a.status==="submitted"||a.status==="expired"),[attempts]);
 const best=completed.reduce((m,a)=>Math.max(m,Number(a.score||0)),0);
 const average=completed.length?Math.round(completed.reduce((sum,a)=>{const max=(a.tests?.question_count||0)*(Number(a.tests?.marks_correct)||0);return sum+(max>0?Math.max(0,Math.min(100,Number(a.score||0)/max*100)):0);},0)/completed.length):0;
 const answered=completed.reduce((sum,a)=>sum+a.correct_count+a.wrong_count,0);const accuracy=answered?Math.round(completed.reduce((sum,a)=>sum+a.correct_count,0)/answered*100):0;
 const myRanks=ranks.filter(r=>r.student_id===user?.id);
 async function logout(){if(supabase)await supabase.auth.signOut();router.replace("/");}
 if(loading)return <main className="dashboard-shell"><p>Loading your performance…</p></main>;
 if(!user)return <main className="dashboard-shell"><p>Redirecting to login…</p></main>;
 return <main className="dashboard-shell">
  <nav className="nav"><Link className="brand" href="/home"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><button className="logout-button" onClick={logout}>Log out</button></nav>
  <section className="dashboard-welcome"><div className="eyebrow">YOUR INSIGHTS</div><h1>My Performance</h1><p>Your test history, accuracy and learning progress in one place.</p><div style={{display:"flex",gap:18,flexWrap:"wrap"}}><Link className="dashboard-home" href="/home">← Learning home</Link><Link className="dashboard-home" href="/tests">Practice more →</Link></div></section>
  {error&&<p role="status" style={{padding:12,background:"#fff3ed",borderRadius:10}}>{error}</p>}
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,margin:"22px 0"}}>
   {[{label:"Tests completed",value:completed.length},{label:"Best score",value:best+" marks"},{label:"Average score",value:average+"%"},{label:"Average accuracy",value:accuracy+"%"},{label:"Subject rankings",value:myRanks.filter(r=>r.scope==="subject").length}].map(x=><article key={x.label} className="subject-card"><p className="muted">{x.label}</p><h2 style={{fontSize:28,margin:0}}>{x.value}</h2></article>)}
  </section>
  <section className="subject-card"><h2>My test history</h2>{completed.length===0?<p className="muted">You haven't completed any tests yet. Start a practice test to see your results here.</p>:completed.map(a=><article key={a.id} style={{borderTop:"1px solid var(--line)",padding:"14px 0"}}><b>{a.tests?.title||"Practice test"}</b><p className="muted">{a.tests?.lectures?.chapters?.subjects?.title||"Subject"} · {a.tests?.lectures?.title||"Independent test"} · {a.submitted_at?new Date(a.submitted_at).toLocaleDateString():"Completed"}</p><p>Score: {a.score??"—"} · Correct: {a.correct_count} · Wrong: {a.wrong_count} · Unanswered: {a.unanswered_count}</p><p className="muted">{a.time_taken_seconds==null?"Time not recorded":`Time: ${Math.floor(a.time_taken_seconds/60)}m ${a.time_taken_seconds%60}s`}</p></article>)}</section>
  <section className="subject-card" style={{marginTop:18}}><h2>My subject rankings</h2>{myRanks.filter(r=>r.scope==="subject").length===0?<p className="muted">Rankings will appear as eligible subject results become available.</p>:myRanks.filter(r=>r.scope==="subject").map(r=><p key={r.scope_name}><b>{r.scope_name}</b> · Rank #{r.rank} · {r.average_percentage}% average</p>)}</section>
 </main>;
}