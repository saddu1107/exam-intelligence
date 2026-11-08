"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";

type Translation={question_text:string;options:string[];correct_option:number;explanation:string|null};
type Q={attempt_id:string;question_id:string;question_text:string;options:string[];sort_order:number;seconds_per_question:number;question_count:number;translations?:{en?:Translation;hi?:Translation}};
type Result={score:number;correct_count:number;wrong_count:number;unanswered_count:number;time_taken_seconds:number};
type SavedResponse={question_id:string;selected_option:number|null};

export default function TestPage(){
 const {id}=useParams<{id:string}>();const router=useRouter();
 const [items,setItems]=useState<Q[]>([]);const [index,setIndex]=useState(0);const [remaining,setRemaining]=useState(0);
 const [selected,setSelected]=useState<number|null>(null);const [answers,setAnswers]=useState<Record<string,number|null>>({});
 const [attempt,setAttempt]=useState("");const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const [result,setResult]=useState<Result|null>(null);const [review,setReview]=useState<any[]>([]);
 const [savingAnswer,setSavingAnswer]=useState(false);const [saveStatus,setSaveStatus]=useState("");
 const [paused,setPaused]=useState(false);const [language,setLanguage]=useState<"en"|"hi">("en");
 const [fullscreen,setFullscreen]=useState(false);const [paletteOpen,setPaletteOpen]=useState(true);
 const saving=useRef(false);const pendingSave=useRef<Promise<boolean>|null>(null);const autosaveError=useRef(false);
 const finished=useRef(false);const answerRef=useRef<(value:number|null)=>Promise<void>>(async()=>{});
 const duration=useMemo(()=>items.length*(items[0]?.seconds_per_question||20),[items]);
 const q=items[index];const translation=q?.translations?.[language];
 const displayedQuestion=translation?.question_text||q?.question_text||"";
 const displayedOptions=translation?.options||q?.options||[];

 const finish=useCallback(async()=>{
  if(!supabase||!attempt||finished.current)return;
  if(pendingSave.current){const ok=await pendingSave.current;if(!ok){setError("Your latest answer is not saved. Please retry before submitting.");return;}}
  finished.current=true;
  const {data,error}=await supabase.rpc("submit_lecture_test",{p_attempt_id:attempt});
  if(error){setError(error.message);finished.current=false;return;}
  const r=Array.isArray(data)?data[0]:data;setResult(r as Result);
  const {data:rev}=await supabase.rpc("get_lecture_test_review",{p_attempt_id:attempt});setReview(rev||[]);
 },[attempt]);

 const chooseOption=useCallback((value:number)=>{
  if(!supabase||!attempt||!items[index]||saving.current||finished.current||paused)return;
  setSelected(value);setAnswers(old=>({...old,[items[index].question_id]:value}));
  setSaveStatus("Saving answer…");setSavingAnswer(true);
  const current=items[index];const task=(async()=>{
   try{
    if(pendingSave.current){const ok=await pendingSave.current;if(!ok)throw new Error("Previous answer could not be saved.");}
    const {error}=await supabase.rpc("save_lecture_test_answer",{p_attempt_id:attempt,p_question_id:current.question_id,p_selected_option:value,p_time_spent_seconds:0});
    if(error)throw error;autosaveError.current=false;setError("");setSaveStatus("Answer saved");return true;
   }catch(err){autosaveError.current=true;setError("Answer could not be saved: "+(err instanceof Error?err.message:"Check your connection."));setSaveStatus("Save failed — retry");return false;}
  })();
  pendingSave.current=task;void task.finally(()=>{setSavingAnswer(false);if(pendingSave.current===task)pendingSave.current=null;});
 },[attempt,index,items,paused]);

 const answer=useCallback(async(value:number|null)=>{
  if(!supabase||!attempt||!items[index]||saving.current||finished.current||paused)return;
  if(pendingSave.current){const ok=await pendingSave.current;if(!ok)return;}
  if(autosaveError.current){setError("Please retry saving your selected answer before continuing.");return;}
  saving.current=true;
  if(value!==null){
   const {error}=await supabase.rpc("save_lecture_test_answer",{p_attempt_id:attempt,p_question_id:items[index].question_id,p_selected_option:value,p_time_spent_seconds:0});
   if(error){setError("Answer could not be saved: "+error.message);saving.current=false;return;}
  }
  saving.current=false;
  if(index+1>=items.length){await finish();return;}
  const next=index+1;setIndex(next);setSelected(answers[items[next].question_id]??null);
  await supabase.rpc("save_lecture_test_position",{p_attempt_id:attempt,p_question_index:next,p_language:language});
 },[attempt,index,items,paused,answers,finish,language]);

 const goTo=useCallback(async(next:number)=>{
  if(!supabase||!attempt||next<0||next>=items.length||savingAnswer||paused)return;
  if(pendingSave.current){const ok=await pendingSave.current;if(!ok)return;}
  setIndex(next);setSelected(answers[items[next].question_id]??null);
  const {error}=await supabase.rpc("save_lecture_test_position",{p_attempt_id:attempt,p_question_index:next,p_language:language});
  if(error)setError("Your position could not be saved: "+error.message);
 },[attempt,items.length,items,answers,savingAnswer,paused,language]);

 const changeLanguage=useCallback(async(next:"en"|"hi")=>{
  if(!supabase||!attempt||!q)return;
  if(next==="hi"&&!q.translations?.hi){setError("Hindi translation is not available for this question yet.");return;}
  if(next==="en"&&!q.translations?.en){setLanguage("en");return;}
  setLanguage(next);const {error}=await supabase.rpc("save_lecture_test_position",{p_attempt_id:attempt,p_question_index:index,p_language:next});
  if(error)setError("Language preference could not be saved.");
 },[attempt,q,index]);

 const pauseTest=useCallback(async()=>{
  if(!supabase||!attempt)return;
  const {error}=await supabase.rpc("pause_lecture_test",{p_attempt_id:attempt});
  if(error){setError(error.message);return;}setPaused(true);
 },[attempt]);
 const resumeTest=useCallback(async()=>{
  if(!supabase)return;
  const {error}=await supabase.rpc("resume_lecture_test",{p_test_id:id});
  if(error){setError(error.message);return;}setPaused(false);
 },[id]);

 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){setError("Test service unavailable");setLoading(false);return;}
  const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace("/auth");return;}
  const {data,error}=await supabase.rpc("start_lecture_test",{p_test_id:id});
  if(!live)return;if(error){setError(error.message);setLoading(false);return;}
  const rows=(data||[]) as Q[];if(!rows.length){setError("This test has no questions yet.");setLoading(false);return;}
  const attemptId=rows[0].attempt_id;
  const [{data:state},{data:responses},{data:bank}] = await Promise.all([
   supabase.from("attempts").select("started_at,paused_seconds_total,current_question_index,preferred_language,status,paused_at").eq("id",attemptId).single(),
   supabase.from("responses").select("question_id,selected_option").eq("attempt_id",attemptId),
   supabase.from("question_bank_entries").select("legacy_question_id,question_bank_translations(language,question_text,options,correct_option,explanation)").in("legacy_question_id",rows.map(x=>x.question_id)).eq("status","published")
  ]);
  if(!live)return;
  const byLegacy=new Map<string,{en?:Translation;hi?:Translation}>();
  for(const entry of (bank||[]) as any[]){const pair:{en?:Translation;hi?:Translation}={};for(const tr of entry.question_bank_translations||[])pair[tr.language as "en"|"hi"]={question_text:tr.question_text,options:tr.options,correct_option:tr.correct_option,explanation:tr.explanation};if(entry.legacy_question_id)byLegacy.set(entry.legacy_question_id,pair);}
  const enriched=rows.map(row=>({...row,translations:byLegacy.get(row.question_id)}));
  const saved:Record<string,number|null>={};for(const r of (responses||[]) as SavedResponse[])saved[r.question_id]=r.selected_option;
  setItems(enriched);setAttempt(attemptId);setAnswers(saved);
  const start=state?.started_at?new Date(state.started_at).getTime():Date.now();
  const elapsed=Math.max(0,Math.floor((Date.now()-start)/1000)-(state?.paused_seconds_total||0));
  const total=rows.length*(rows[0].seconds_per_question||20);setRemaining(Math.max(0,total-elapsed));
  const current=Math.min(rows.length-1,Math.max(0,state?.current_question_index||0));setIndex(current);setSelected(saved[rows[current].question_id]??null);
  setLanguage(state?.preferred_language==="hi"?"hi":"en");setPaused(state?.status==="paused");setLoading(false);
 })();return()=>{live=false;};},[id,router]);

 useEffect(()=>{if(loading||result||paused||!items.length)return;const timer=window.setInterval(()=>setRemaining(t=>{if(t<=1){window.clearInterval(timer);void answerRef.current(null);return 0;}return t-1;}),1000);return()=>window.clearInterval(timer);},[loading,result,paused,items.length]);
 useEffect(()=>{answerRef.current=answer;},[answer]);
 useEffect(()=>{const update=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",update);return()=>document.removeEventListener("fullscreenchange",update);},[]);
 async function toggleFullscreen(){try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen();}else await document.exitFullscreen();}catch{setError("Full-screen mode is not supported by this browser.");}}
 async function clearResponse(){if(!supabase||!attempt||!q||savingAnswer)return;const {error}=await supabase.from("responses").delete().eq("attempt_id",attempt).eq("question_id",q.question_id);if(error){setError("Could not clear this response: "+error.message);return;}setSelected(null);setAnswers(old=>({...old,[q.question_id]:null}));setSaveStatus("Response cleared");}

 if(loading)return <main style={{padding:30}}>Preparing your test…</main>;
 if(error&&!items.length)return <main style={{maxWidth:700,margin:"50px auto",padding:20}}><h1>Unable to start test</h1><p>{error}</p><Link href="/tests">Return to test library</Link></main>;
 if(result)return <main style={{maxWidth:850,margin:"30px auto",padding:20,color:"#14213d"}}><div style={{color:"#08a6c5",fontWeight:800}}>EXAM INTELLIGENCE · RESULT</div><h1>Test completed</h1><h2 style={{fontSize:42}}>{result.score} marks</h2><p>Correct: {result.correct_count} · Wrong: {result.wrong_count} · Unanswered: {result.unanswered_count}</p><p>Time taken: {Math.floor(result.time_taken_seconds/60)}m {result.time_taken_seconds%60}s</p><h2>Answer review</h2>{review.map((item:any,i)=><section key={item.question_id} style={{padding:16,border:"1px solid #e5eaf2",borderRadius:12,marginTop:12}}><b>Q{i+1}. {item.question_text}</b><p>Your answer: {item.selected_option===null?"Not answered":item.options[item.selected_option]}</p><p>Correct answer: {item.options[item.correct_option]}</p><p>{item.is_correct?"Correct":"Incorrect / unanswered"} · {item.explanation||"No explanation provided."}</p></section>)}<Link href="/dashboard">Open My Performance</Link></main>;
 if(!q)return <main>Loading question…</main>;
 const answeredCount=Object.values(answers).filter(v=>v!==null&&v!==undefined).length;
 const timerText=`${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`;
 return <main style={{maxWidth:1100,margin:"18px auto",padding:16,color:"#14213d",minHeight:"85vh"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
   <div><div style={{color:"#08a6c5",fontWeight:800}}>EXAM INTELLIGENCE</div><h1 style={{margin:"5px 0",fontSize:22}}>Practice test</h1><small>{answeredCount} answered · {items.length-answeredCount} unanswered</small></div>
   <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong style={{background:remaining<=60?"#fff0e9":"#e9f8fb",padding:"10px 14px",borderRadius:10,fontSize:20}}>{timerText}</strong><button onClick={toggleFullscreen} style={controlStyle}>{fullscreen?"Exit full screen":"Full screen"}</button>{paused?<button onClick={resumeTest} style={primaryStyle}>Resume</button>:<button onClick={pauseTest} style={controlStyle}>Pause</button>}</div>
  </header>
  <div style={{height:7,background:"#e8edf4",borderRadius:8,margin:"16px 0"}}><div style={{height:7,width:((index+1)/items.length*100)+"%",background:"#08a6c5",borderRadius:8}}/></div>
  {paused?<section style={{background:"#f1f7fa",border:"1px solid #d8e5ee",borderRadius:16,padding:32,textAlign:"center",marginTop:30}}><h2>Test paused</h2><p>Your answers and remaining time are saved. Resume whenever you're ready.</p><button onClick={resumeTest} style={primaryStyle}>Resume test</button></section>:<>
   <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",marginBottom:12}}><b>Question {index+1} of {items.length}</b><div style={{display:"flex",gap:6}}><button onClick={()=>changeLanguage("en")} style={language=== "en"?activeLangStyle:controlStyle}>English</button><button onClick={()=>changeLanguage("hi")} disabled={!q.translations?.hi} style={language==="hi"?activeLangStyle:controlStyle}>हिन्दी</button></div></div>
   <section style={{border:"1px solid #e5eaf2",borderRadius:16,padding:22,background:"#fff"}}><h2 style={{fontSize:21,lineHeight:1.5}}>{displayedQuestion}</h2><div style={{display:"grid",gap:12,marginTop:22}}>{displayedOptions.map((option,i)=><button key={i} onClick={()=>chooseOption(i)} disabled={savingAnswer} style={{textAlign:"left",padding:15,borderRadius:10,border:selected===i?"2px solid #08a6c5":"1px solid #d8e0eb",background:selected===i?"#e9f8fb":"#fff",color:"#14213d",fontSize:16}}>{String.fromCharCode(65+i)}. {option}</button>)}</div></section>
   <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginTop:16}}><button disabled={index===0} onClick={()=>goTo(index-1)} style={controlStyle}>← Previous</button><div style={{display:"flex",gap:8}}><button onClick={clearResponse} style={controlStyle}>Clear response</button><button onClick={()=>goTo(index+1)} disabled={index===items.length-1} style={controlStyle}>Next →</button><button onClick={()=>void answer(selected)} style={primaryStyle}>{index===items.length-1?"Submit test":"Save & next"}</button></div></div>
   <section style={{marginTop:20,border:"1px solid #e5eaf2",borderRadius:14,padding:16}}><button onClick={()=>setPaletteOpen(v=>!v)} style={{...controlStyle,width:"100%"}}>Question palette {paletteOpen?"−":"+"}</button>{paletteOpen&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(42px,1fr))",gap:8,marginTop:12}}>{items.map((item,i)=>{const isAnswered=answers[item.question_id]!==null&&answers[item.question_id]!==undefined;return <button key={item.question_id} onClick={()=>goTo(i)} style={{height:40,borderRadius:8,border:i===index?"2px solid #078ba6":"1px solid #d8e0eb",background:isAnswered?"#dff5ea":"#f6f8fb",color:"#14213d",fontWeight:800}} aria-label={`Go to question ${i+1}`}>{i+1}</button>})}</div>}<small style={{display:"block",marginTop:10,color:"#667085"}}>Green: answered · White: unanswered · Outlined: current question</small></section>
   <p role="status" style={{color:"#087f5b"}}>{saveStatus}</p>
   {error&&<p role="alert" style={{color:"#a33"}}>{error}</p>}
  </>}
 </main>;
}
const controlStyle:React.CSSProperties={padding:"10px 13px",border:"1px solid #d8e0eb",borderRadius:9,background:"#fff",color:"#25364c",fontWeight:700,cursor:"pointer"};
const primaryStyle:React.CSSProperties={...controlStyle,border:0,background:"#08a6c5",color:"#fff"};
const activeLangStyle:React.CSSProperties={...controlStyle,border:"2px solid #08a6c5",background:"#e9f8fb"};
