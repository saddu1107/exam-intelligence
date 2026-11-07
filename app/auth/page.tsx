"use client";
import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function AuthPage(){
 const router=useRouter();const params=useSearchParams();
 const [mode,setMode]=useState<"login"|"signup">(params.get("mode")==="signup"?"signup":"login");
 const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [visible,setVisible]=useState(false);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;if(new URLSearchParams(window.location.search).get("mode")==="signup")setMode("signup");(async()=>{if(!supabase)return;const {data:{session}}=await supabase.auth.getSession();if(live&&session)router.replace("/home");})();return()=>{live=false}},[router]);
 async function submit(e:FormEvent){e.preventDefault();setMessage("");if(!supabase){setMessage("Authentication is unavailable. Please try again later.");return;}if(password.length<8){setMessage("Password must contain at least 8 characters.");return;}setBusy(true);
 try{if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim()},emailRedirectTo:location.origin+"/home"}});if(error)throw error;if(data.session)router.replace("/home");else setMessage("Account created. Check your email to confirm your account, then log in.");}
 else{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;router.replace("/home");}}
 catch(err){setMessage(err instanceof Error?err.message:"Something went wrong. Please try again.");}finally{setBusy(false)}}
 return <main className="auth-shell"><Link className="brand" href="/"><span className="brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><section className="auth-card"><div className="eyebrow">YOUR PREPARATION STARTS HERE</div><h1>{mode==="signup"?"Create your account":"Welcome back"}</h1><p className="auth-subtitle">{mode==="signup"?"Join Exam Intelligence and prepare smarter.":"Log in to continue your preparation."}</p>
 <div className="auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>{setMode("login");setMessage("")}}>Log in</button><button className={mode==="signup"?"active":""} onClick={()=>{setMode("signup");setMessage("")}}>Sign up</button></div>
 <form onSubmit={submit}>{mode==="signup"&&<label>Full name<input value={name} onChange={e=>setName(e.target.value)} required autoComplete="name" placeholder="Your full name"/></label>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>
 <label>Password<div className="password-field"><input type={visible?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="At least 8 characters"/><button type="button" className="password-toggle" onClick={()=>setVisible(v=>!v)} aria-label={visible?"Hide password":"Show password"} title={visible?"Hide password":"Show password"}>{visible?"Hide":"Show"}</button></div></label>
 {mode==="login"&&<div className="forgot-row"><Link href="/forgot-password">Forgot password?</Link></div>}<button className="auth-submit" type="submit" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":"Log in"}</button></form>
 {message&&<p className="auth-message" role="status">{message}</p>}<p className="auth-note">By continuing, you agree to use this platform for learning and practice.</p></section><p className="auth-back"><Link href="/">← Back to welcome page</Link></p></main>;
}