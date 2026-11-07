"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
type Q={attempt_id:string;question_id:string;question_text:string;options:string[];sort_order:number;seconds_per_question:number;question_count:number};
type Result={score:number;correct_count:number;wrong_count:number;unanswered_count:number;time_taken_seconds:number};
export default function TestPage(){
 const {id}=useParams<{id:string}>();const router=useRouter();
 const [items,setItems]=useState<Q[]>([]);const [index,setIndex]=useState(0);const [remaining,setRemaining]=useState(20);const [selected,setSelected]=useState<number|null>(null);const [attempt,setAttempt]=useState("");const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [result,setResult]=useState<Result|null>(null);const [review,setReview]=useState<any[]>([]);const [savingAnswer,setSavingAnswer]=useState(false);const [saveStatus,setSaveStatus]=useState("");const saving=useRef(false);const pendingSave=useRef<Promise<boolean>|null>(null);const autosaveError=useRef(false);const autosaveVersion=useRef(0);const finished=useRef(false);const answerRef=useRef<(value:number|null)=>Promise<void>>(async()=>{});
 const finish=useCallback(async()=>{if(!supabase||!attempt||finished.current)return;finished.current=true;const {data,error}=await supabase.rpc("submit_lecture_test",{p_attempt_id:attempt});if(error){setError(error.message);finished.current=false;return;}const r=Array.isArray(data)?data[0]:data;setResult(r as Result);const {data:rev}=await supabase.rpc("get_lecture_test_review",{p_attempt_id:attempt});setReview(rev||[]);},[attempt]);
 const answer=useCallback(async(value:number|null)=>{if(!supabase||!attempt||!items[index]||saving.current||finished.current)return;if(pendingSave.current){const ok=await pendingSave.current;if(!ok&&value!==null)return;}if(autosaveError.current&&value!==null){setError("Please retry saving your selected answer before continuing.");return;}if(finished.current)return;saving.current=true;if(value!==null){const {error}=await supabase.rpc("save_lecture_test_answer",{p_attempt_id:attempt,p_question_id:items[index].question_id,p_selected_option:value,p_time_spent_seconds:items[index].seconds_per_question-remaining});if(error){setError("Answer could not be saved: "+error.message);saving.current=false;return;}}saving.current=false;if(index+1>=items.length){await finish();return;}setIndex(i=>i+1);setSelected(null);setRemaining(items[index+1]?.seconds_per_question||20);},[attempt,index,items,remaining,finish]);
 const chooseOption=useCallback((value:number)=>{
  if(!supabase||!attempt||!items[index]||saving.current||finished.current)return;
  setSelected(value);setSaveStatus("Saving answer…");setSavingAnswer(true);
  const current=items[index];const version=++autosaveVersion.current;
  const task=(async()=>{
    try{
      const previous=pendingSave.current;
      if(previous){
        const previousOk=await previous;
        if(!previousOk)throw new Error("The previous answer was not saved. Retry it first.");
      }
      const {error}=await supabase.rpc("save_lecture_test_answer",{
        p_attempt_id:attempt,p_question_id:current.question_id,p_selected_option:value,
        p_time_spent_seconds:current.seconds_per_question-remaining
      });
      if(error)throw error;
      if(version===autosaveVersion.current){
        autosaveError.current=false;setError("");setSaveStatus("Answer saved");
      }
      return true;
    }catch(err){
      if(version===autosaveVersion.current){
        autosaveError.current=true;
        setError("Answer could not be saved: "+(err instanceof Error?err.message:"Please check your connection."));
        setSaveStatus("Save failed — retry below");
      }
      return false;
    }
  })();
  pendingSave.current=task;
  void task.finally(()=>{
    if(version===autosaveVersion.current){
      setSavingAnswer(false);
      if(pendingSave.current===task)pendingSave.current=null;
    }
  });
},[attempt,index,items,remaining]);
 useEffect(()=>{answerRef.current=answer;},[answer]);
 useEffect(()=>{let live=true;(async()=>{if(!supabase){setError("Test service unavailable");setLoading(false);return;}const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace("/auth");return;}const {data,error}=await supabase.rpc("start_lecture_test",{p_test_id:id});if(!live)return;if(error){setError(error.message);setLoading(false);return;}const rows=(data||[]) as Q[];if(!rows.length){setError("This test has no questions yet.");setLoading(false);return;}setItems(rows);setAttempt(rows[0].attempt_id);setRemaining(rows[0].seconds_per_question||20);setLoading(false);})();return()=>{live=false;};},[id,router]);
 useEffect(()=>{if(loading||result||!items.length)return;const timer=window.setInterval(()=>setRemaining(t=>{if(t<=1){window.clearInterval(timer);void answerRef.current(null);return 0;}return t-1;}),1000);return()=>window.clearInterval(timer);},[loading,result,index,items]);
 if(loading)return <main style={{padding:30}}>Preparing your test…</main>;
 if(error&&!items.length)return <main style={{maxWidth:700,margin:"50px auto",padding:20}}><h1>Unable to start test</h1><p>{error}</p><Link href="/">Return to library</Link></main>;
 if(result)return <main style={{maxWidth:850,margin:"30px auto",padding:20,color:"#14213d"}}><div style={{color:"#08a6c5",fontWeight:800}}>EXAM INTELLIGENCE · RESULT</div><h1>Test completed</h1><h2 style={{fontSize:42}}>{result.score} marks</h2><p>Correct: {result.correct_count} · Wrong: {result.wrong_count} · Unanswered: {result.unanswered_count}</p><p>Time taken: {Math.floor(result.time_taken_seconds/60)}m {result.time_taken_seconds%60}s</p><h2>Answer review</h2>{review.map((q:any,i)=><section key={q.question_id} style={{padding:16,border:"1px solid #e5eaf2",borderRadius:12,marginTop:12}}><b>Q{i+1}. {q.question_text}</b><p>Your answer: {q.selected_option===null?"Not answered":q.options[q.selected_option]}</p><p>Correct answer: {q.options[q.correct_option]}</p><p>{q.is_correct?"Correct":"Incorrect / unanswered"} · {q.explanation||"No explanation provided."}</p></section>)}<Link href="/dashboard">Back to dashboard</Link></main>;
 const q=items[index];if(!q)return <main>Loading question…</main>;
 return <main style={{maxWidth:850,margin:"30px auto",padding:20,color:"#14213d"}}><header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><div style={{color:"#08a6c5",fontWeight:800}}>EXAM INTELLIGENCE</div><h1 style={{margin:"6px 0"}}>Lecture test</h1></div><div style={{background:remaining<=5?"#fff0e9":"#e9f8fb",padding:"12px 18px",borderRadius:12,fontWeight:800,fontSize:22}}>00:{String(remaining).padStart(2,"0")}</div></header><div style={{height:7,background:"#e8edf4",borderRadius:8,margin:"20px 0"}}><div style={{height:7,width:((index+1)/items.length*100)+"%",background:"#08a6c5",borderRadius:8}}/></div><p>Question {index+1} of {items.length}</p><section style={{border:"1px solid #e5eaf2",borderRadius:16,padding:22}}><h2>{q.question_text}</h2><div style={{display:"grid",gap:12,marginTop:22}}>{q.options.map((option,i)=><button key={i} onClick={()=>chooseOption(i)} style={{textAlign:"left",padding:15,borderRadius:10,border:selected===i?"2px solid #08a6c5":"1px solid #d8e0eb",background:selected===i?"#e9f8fb":"#fff",color:"#14213d",fontSize:16}}>{String.fromCharCode(65+i)}. {option}</button>)}</div></section>{saveStatus&&<p role="status" style={{color:"#087f5b"}}>{saveStatus}</p>}{error&&<p role="alert">{error}</p>}<button disabled={savingAnswer||(!saveStatus.startsWith("Save failed")&&selected===null)} onClick={()=>saveStatus.startsWith("Save failed")&&selected!==null?chooseOption(selected):void answer(selected)} style={{marginTop:18,padding:"13px 22px",border:0,borderRadius:9,background:savingAnswer?"#98a2b3":"#08a6c5",color:"#fff",fontWeight:800}}>{savingAnswer?"Saving…":saveStatus.startsWith("Save failed")?"Retry saving answer":index===items.length-1?"Submit test":"Save & next"}</button><p style={{color:"#667085"}}>If you do not select an option before the timer ends, the question is marked unanswered.</p></main>;
}
