"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
type Attempt={id:string;score:number|null;correct_count:number;wrong_count:number;unanswered_count:number;submitted_at:string|null;status:string;time_taken_seconds:number|null;tests:{title:string;question_count:number;marks_correct:number;lectures:{title:string;chapters:{title:string;subjects:{title:string}}}}};
type Rank={scope:string;scope_name:string;student_id:string;student_name:string;tests_taken:number;average_percentage:number;rank:number};
export default function DashboardPage(){
 const router=useRouter();const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);const [attempts,setAttempts]=useState<Attempt[]>([]);const [ranks,setRanks]=useState<Rank[]>([]);const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{if(!supabase){setLoading(false);return;}const {data:{user}}=await supabase.auth.getUser();if(!active)return;if(!user){router.replace("/auth");return;}setUser(user);
 const [a,r]=await Promise.all([supabase.from("attempts").select("id,score,correct_count,wrong_count,unanswered_count,submitted_at,status,time_taken_seconds,tests(title,question_count,marks_correct,lectures(title,chapters(title,subjects(title))))").order("created_at",{ascending:false}).limit(20),supabase.rpc("student_leaderboards")]);
 if(!active)return;if(a.error)setError("Could not load result history: "+a.error.message);else setAttempts((a.data||[]) as unknown as Attempt[]);
 if(r.error)setError("Leaderboard is temporarily unavailable: "+r.error.message);else setRanks((r.data||[]) as Rank[]);
 setLoading(false);})();return()=>{active=false;};},[router]);
 async function logout(){if(supabase)await supabase.auth.signOut();router.replace("/");}
 if(loading)return <main className="dashboard-shell"><p>Loading your dashboard…</p></main>;
 if(!user)return <main className="dashboard-shell"><p>Redirecting to login…</p></main>;
 const displayName=user.user_metadata?.full_name||user.email||"Student";
 const completed=attempts.filter(a=>a.status==="submitted"||a.status==="expired");const best=completed.reduce((m,a)=>Math.max(m,Number(a.score||0)),0);const average=completed.length?Math.round(completed.reduce((sum,a)=>sum+((a.tests?.question_count&&a.tests?.marks_correct)?Math.max(0,Math.min(100,Number(a.score||0)/(a.tests.question_count*a.tests.marks_correct)*100)):0),0)/completed.length*100)/100:0;
 const myRanks=ranks.filter(r=>r.student_id===user.id);
 return <main className="dashboard-shell"><nav className="nav"><Link className="brand" href="/"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><button className="logout-button" onClick={logout}>Log out</button></nav>
 <section className="dashboard-welcome"><div className="eyebrow">STUDENT AREA</div><h1>Welcome, {displayName}</h1><p>Your learning progress, test history and performance rankings.</p><div className="account-panel"><span>Signed in as</span><strong>{user.email}</strong></div><Link className="dashboard-home" href="/">Explore lecture library →</Link></section>
 {error&&<p role="status" style={{padding:12,background:"#fff3ed",borderRadius:10}}>{error}</p>}
 <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,margin:"22px 0"}}>
 {[{label:"Tests attempted",value:attempts.filter(a=>a.status!=="in_progress").length},{label:"Best score",value:best},{label:"Average accuracy",value:average+"%"},{label:"Subject rankings",value:myRanks.filter(r=>r.scope==="subject").length}].map(x=><article key={x.label} className="subject-card"><p className="muted">{x.label}</p><h2 style={{fontSize:28,margin:0}}>{x.value}</h2></article>)}
 </section>
 <section className="subject-card"><h2>My test history</h2>{attempts.length===0?<p className="muted">You haven't completed any tests yet. Start a lecture test to see your results here.</p>:attempts.map(a=><article key={a.id} style={{borderTop:"1px solid var(--line)",padding:"14px 0"}}><b>{a.tests?.title||"Lecture test"}</b><p className="muted">{a.tests?.lectures?.chapters?.subjects?.title||"Subject"} · {a.tests?.lectures?.title||"Lecture"} · {a.submitted_at?new Date(a.submitted_at).toLocaleDateString():"In progress"}</p><p>Score: {a.score??"—"} · Correct: {a.correct_count} · Wrong: {a.wrong_count} · Unanswered: {a.unanswered_count}</p><p className="muted">{a.time_taken_seconds==null?"Time not recorded":`Time: ${Math.floor(a.time_taken_seconds/60)}m ${a.time_taken_seconds%60}s`}</p></article>)}</section>
 <section className="subject-card" style={{marginTop:18}}><h2>Subject leaderboard</h2>{myRanks.filter(r=>r.scope==="subject").length===0?<p className="muted">Rankings will appear after students complete published tests.</p>:myRanks.filter(r=>r.scope==="subject").map(r=><p key={r.scope_name}><b>{r.scope_name}</b> · Rank #{r.rank} · {r.average_percentage}% average</p>)}
 <h2 style={{marginTop:24}}>Top performers</h2>{ranks.filter(r=>r.scope==="subject").slice(0,30).map(r=><p key={r.scope_name+r.student_id} style={{borderTop:"1px solid var(--line)",paddingTop:9}}>{r.scope_name} · #{r.rank} · {r.student_name} · {r.average_percentage}%</p>)}</section>
 </main>;
}
