"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";

type Section={id:string;title:string;slug:string;description:string|null};
type Attempt={id:string;score:number|null;correct_count:number;wrong_count:number;unanswered_count:number;submitted_at:string|null;status:string;created_at:string;tests:{title:string;question_count:number;marks_correct:number}|null};
type Test={id:string;title:string;question_count:number;subjects:{title:string}|null;chapters:{title:string}|null};
const icons:Record<string,string>={gs:"📚",reasoning:"🧩",mathematics:"📐",english:"📘"};

export default function HomePage(){
 const router=useRouter();
 const [sections,setSections]=useState<Section[]>([]);
 const [name,setName]=useState("Student");
 const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [latestTests,setLatestTests]=useState<Test[]>([]);
 const [lectureCount,setLectureCount]=useState(0);
 const [testCount,setTestCount]=useState(0);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState("");

 useEffect(()=>{
  let live=true;
  (async()=>{
   if(!supabase){router.replace("/auth");return;}
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError||!user){router.replace("/auth");return;}
   const [profileResult,sectionResult,attemptResult,testResult,lectureResult]=await Promise.all([
    supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
    supabase.from("sections").select("id,title,slug,description").eq("published",true).order("sort_order"),
    supabase.from("attempts").select("id,score,correct_count,wrong_count,unanswered_count,submitted_at,status,created_at,tests(title,question_count,marks_correct)").order("created_at",{ascending:false}).limit(5),
    supabase.from("tests").select("id,title,question_count,subjects(title),chapters(title)",{count:"exact"}).eq("published",true).order("created_at",{ascending:false}).limit(4),
    supabase.from("lectures").select("id",{count:"exact",head:true}).eq("published",true)
   ]);
   if(!live)return;
   if(profileResult.data?.full_name)setName(profileResult.data.full_name);
   else setName(user.user_metadata?.full_name||user.email?.split("@")[0]||"Student");
   if(sectionResult.error||attemptResult.error||testResult.error||lectureResult.error){
    setLoadError("Some dashboard information could not be loaded. Please refresh or try again.");
   }
   setSections((sectionResult.data||[]) as Section[]);
   setAttempts((attemptResult.data||[]) as unknown as Attempt[]);
   setLatestTests((testResult.data||[]) as unknown as Test[]);
   setTestCount(testResult.count||0);
   setLectureCount(lectureResult.count||0);
   setLoading(false);
  })();
  return()=>{live=false;};
 },[router]);

 const completed=useMemo(()=>attempts.filter(a=>a.status==="submitted"||a.status==="expired"),[attempts]);
 const average=useMemo(()=>{
  if(!completed.length)return 0;
  const percentages=completed.map(a=>{
   const max=(a.tests?.question_count||0)*(a.tests?.marks_correct||0);
   return max>0?Math.max(0,Math.min(100,Number(a.score||0)/max*100)):0;
  });
  return Math.round(percentages.reduce((sum,n)=>sum+n,0)/percentages.length);
 },[completed]);
 const best=useMemo(()=>completed.reduce((max,a)=>Math.max(max,Number(a.score||0)),0),[completed]);
 const latest=completed[0];
 async function logout(){if(supabase)await supabase.auth.signOut();router.replace("/");}

 if(loading)return <main className="ei-student-home"><div className="ei-home-loading">Loading your learning dashboard…</div></main>;
 return <main className="ei-student-home">
  <section className="ei-home-hero">
   <div><div className="eyebrow">YOUR STUDY SPACE · EXAM INTELLIGENCE</div><h1>Welcome back, {name}</h1><p>Your preparation, practice and progress — all in one place.</p></div>
   <div className="ei-home-hero-actions"><Link href="/tests" className="ei-home-primary">Start practising <span>→</span></Link><Link href="/profile" className="ei-home-secondary">My profile</Link></div>
  </section>
  {loadError&&<p className="ei-home-notice" role="status">{loadError}</p>}
  <section className="ei-home-stats" aria-label="Your learning overview">
   <article><span className="ei-stat-icon">📝</span><div><small>Tests completed</small><strong>{completed.length}</strong><span>Recent attempts shown</span></div></article>
   <article><span className="ei-stat-icon">🎯</span><div><small>Average score</small><strong>{average}%</strong><span>Based on completed tests</span></div></article>
   <article><span className="ei-stat-icon">🏅</span><div><small>Best score</small><strong>{best}</strong><span>Marks earned</span></div></article>
   <article><span className="ei-stat-icon">📚</span><div><small>Available resources</small><strong>{testCount+lectureCount}</strong><span>{testCount} tests · {lectureCount} lectures</span></div></article>
  </section>
  <div className="ei-home-columns">
   <section className="ei-home-panel ei-home-recent">
    <div className="ei-home-panel-head"><div><div className="eyebrow">KEEP YOUR MOMENTUM</div><h2>Recent test activity</h2></div><Link href="/dashboard">Full performance →</Link></div>
    {completed.length===0?<div className="ei-home-empty"><span>✍️</span><b>Your first practice test is waiting.</b><p>Attempt a test to start building your performance history.</p><Link href="/tests">Explore the test library →</Link></div>:completed.slice(0,4).map(a=><article className="ei-home-attempt" key={a.id}><div><b>{a.tests?.title||"Practice test"}</b><small>{a.submitted_at?new Date(a.submitted_at).toLocaleDateString():"Completed"} · {a.correct_count} correct · {a.wrong_count} wrong</small></div><strong>{a.score??"—"} <small>marks</small></strong></article>)}
    {latest&&<div className="ei-home-last-result"><span>Latest completed test</span><b>{latest.tests?.title||"Practice test"}</b><span>{latest.correct_count} correct out of {latest.tests?.question_count||"—"} questions</span></div>}
   </section>
   <section className="ei-home-panel ei-home-next">
    <div className="eyebrow">YOUR NEXT STEP</div><h2>{completed.length?"Keep improving":"Build your daily practice"}</h2><p>{completed.length?"Review your answers, then take another focused test to strengthen weak areas.":"Start with a subject you want to improve. Your test history and performance insights will grow as you practise."}</p>
    <Link href={completed.length?"/dashboard":"/lectures"} className="ei-home-next-link">{completed.length?"Review performance":"Explore video lessons"} <span>→</span></Link>
    <div className="ei-home-quick-links"><Link href="/lectures">▶ Video lectures</Link><Link href="/tests">▤ Practice tests</Link><Link href="/leaderboard">🏆 Leaderboard</Link></div>
   </section>
  </div>
  <section className="ei-home-section">
   <div className="ei-home-panel-head"><div><div className="eyebrow">PICK UP A SUBJECT</div><h2>Your learning sections</h2></div><span>{sections.length} sections</span></div>
   {sections.length===0?<p className="ei-home-muted">No published sections are available yet.</p>:<div className="ei-home-section-grid">{sections.map(s=><Link className="ei-home-section-card" key={s.id} href={`/sections/${s.slug}`}><span>{icons[s.slug]||"📖"}</span><b>{s.title}</b><small>{s.description||"Explore subjects and topics."}</small><strong>Explore section →</strong></Link>)}</div>}
  </section>
  <section className="ei-home-section">
   <div className="ei-home-panel-head"><div><div className="eyebrow">READY WHEN YOU ARE</div><h2>Recommended practice</h2></div><Link href="/tests">All tests →</Link></div>
   {latestTests.length===0?<p className="ei-home-muted">New published tests will appear here.</p>:<div className="ei-home-test-grid">{latestTests.map(t=><Link href="/tests" className="ei-home-test-card" key={t.id}><span>📝</span><b>{t.title}</b><small>{t.subjects?.title||t.chapters?.title||"Practice"} · {t.question_count} questions</small><strong>Open test library →</strong></Link>)}</div>}
  </section>
  <footer className="ei-home-footer"><Link href="/profile">Profile</Link><Link href="/dashboard">Performance</Link><Link href="/help">Help & support</Link><button onClick={logout}>Log out</button><small>EXAM INTELLIGENCE · Prepare Smart. Perform Better.</small></footer>
 </main>;
}
