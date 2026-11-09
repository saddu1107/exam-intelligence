"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
type Section={id:string;title:string;slug:string;description:string|null};
type Test={id:string;title:string;question_count:number;subjects:{title:string}|null;chapters:{title:string}|null};
const icons:Record<string,string>={gs:"📚",reasoning:"🧩",mathematics:"📐",english:"📘"};
export default function HomePage(){
 const router=useRouter();const [sections,setSections]=useState<Section[]>([]);const [name,setName]=useState("Student");
 const [latestTests,setLatestTests]=useState<Test[]>([]);const [lectureCount,setLectureCount]=useState(0);const [testCount,setTestCount]=useState(0);const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){router.replace("/auth");return;}
  const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user){router.replace("/auth");return;}
  const [profileResult,sectionResult,testResult,lectureResult]=await Promise.all([
   supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
   supabase.from("sections").select("id,title,slug,description").eq("published",true).order("sort_order"),
   supabase.from("tests").select("id,title,question_count,subjects(title),chapters(title)",{count:"exact"}).eq("published",true).order("created_at",{ascending:false}).limit(4),
   supabase.from("lectures").select("id",{count:"exact",head:true}).eq("published",true)
  ]);
  if(!live)return;setName(profileResult.data?.full_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"Student");
  if(sectionResult.error||testResult.error||lectureResult.error)setLoadError("Some learning resources could not be loaded. Please refresh.");
  setSections((sectionResult.data||[]) as Section[]);setLatestTests((testResult.data||[]) as unknown as Test[]);setTestCount(testResult.count||0);setLectureCount(lectureResult.count||0);setLoading(false);
 })();return()=>{live=false;};},[router]);
 async function logout(){if(supabase)await supabase.auth.signOut();router.replace("/");}
 if(loading)return <main className="ei-student-home"><div className="ei-home-loading">Loading your learning space…</div></main>;
 return <main className="ei-student-home">
  <section className="ei-home-hero"><div><div className="eyebrow">YOUR STUDY SPACE · EXAM INTELLIGENCE</div><h1>Welcome back, {name}</h1><p>Your preparation, practice and progress — all in one place.</p></div><div className="ei-home-hero-actions"><Link href="/tests" className="ei-home-primary">Start practising <span>→</span></Link><Link href="/profile" className="ei-home-secondary">My profile</Link></div></section>
  {loadError&&<p className="ei-home-notice" role="status">{loadError}</p>}
  <section className="ei-home-stats" aria-label="Learning resources"><article><span className="ei-stat-icon">📝</span><div><small>Available tests</small><strong>{testCount}</strong><span>Ready to practise</span></div></article><article><span className="ei-stat-icon">📚</span><div><small>Video lectures</small><strong>{lectureCount}</strong><span>Learn at your pace</span></div></article></section>
  <section className="ei-home-section"><div className="ei-home-panel-head"><div><div className="eyebrow">PICK UP A SUBJECT</div><h2>Your learning sections</h2></div><span>{sections.length} sections</span></div>{sections.length===0?<p className="ei-home-muted">No published sections are available yet.</p>:<div className="ei-home-section-grid">{sections.map(s=><Link className="ei-home-section-card" key={s.id} href={`/sections/${s.slug}`}><span>{icons[s.slug]||"📖"}</span><b>{s.title}</b><small>{s.description||"Explore subjects and topics."}</small><strong>Explore section →</strong></Link>)}</div>}</section>
  <section className="ei-home-section"><div className="ei-home-panel-head"><div><div className="eyebrow">READY WHEN YOU ARE</div><h2>Recommended practice</h2></div><Link href="/tests">All tests →</Link></div>{latestTests.length===0?<p className="ei-home-muted">New published tests will appear here.</p>:<div className="ei-home-test-grid">{latestTests.map(t=><Link href="/tests" className="ei-home-test-card" key={t.id}><span>📝</span><b>{t.title}</b><small>{t.subjects?.title||t.chapters?.title||"Practice"} · {t.question_count} questions</small><strong>Open test library →</strong></Link>)}</div>}</section>
  <section className="ei-home-panel ei-home-next"><div className="eyebrow">TRACK YOUR GROWTH</div><h2>Your performance, all in one place</h2><p>Completed tests, accuracy, scores and subject rankings are available in your dedicated performance section.</p><Link href="/dashboard" className="ei-home-next-link">Open My Performance <span>→</span></Link><div className="ei-home-quick-links"><Link href="/lectures">▶ Video lectures</Link><Link href="/tests">▤ Practice tests</Link><Link href="/exams">◎ SSC Exam Centre</Link></div></section>
  <footer className="ei-home-footer"><Link href="/profile">Profile</Link><Link href="/dashboard">My Performance</Link><Link href="/help">Help & support</Link><button onClick={logout}>Log out</button><small>EXAM INTELLIGENCE · Prepare Smart. Perform Better.</small></footer>
 </main>;
}