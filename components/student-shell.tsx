"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";

const links=[
 {href:"/home",label:"Home",icon:"⌂",group:"LEARN"},
 {href:"/sections",label:"All Sections",icon:"▦",group:"LEARN"},
 {href:"/lectures",label:"Video Lectures",icon:"▷",group:"LEARN"},
 {href:"/tests",label:"Test Library",icon:"▤",group:"LEARN"},
 {href:"/dashboard",label:"My Performance",icon:"▥",group:"INSIGHTS"},
 {href:"/leaderboard",label:"Leaderboard",icon:"♜",group:"INSIGHTS"},
];
function Icon({children}:{children:string}){return <span className="ei-nav-icon" aria-hidden="true">{children}</span>}
export default function StudentShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();const router=useRouter();
 const [ready,setReady]=useState(false);const [userName,setUserName]=useState("Student");const [email,setEmail]=useState("");
 const [collapsed,setCollapsed]=useState(false);const [mobileOpen,setMobileOpen]=useState(false);const [profileOpen,setProfileOpen]=useState(false);const [query,setQuery]=useState("");
 const isPublic=pathname==="/"||["/auth","/login","/register","/forgot-password","/reset-password"].includes(pathname);
 const isAdmin=pathname.startsWith("/admin");
 const isTest=pathname.startsWith("/tests/")&&pathname.split("/").filter(Boolean).length>1;
 const useShell=!isPublic&&!isAdmin&&!isTest;
 useEffect(()=>{if(!useShell){setReady(true);return;}let active=true;
  const check=async()=>{if(!supabase){router.replace("/auth");return;}const {data:{user}}=await supabase.auth.getUser();if(!active)return;if(!user){router.replace("/auth");return;}setUserName(user.user_metadata?.full_name||user.email?.split("@")[0]||"Student");setEmail(user.email||"");setReady(true)};
  void check();const authSubscription=supabase?.auth.onAuthStateChange((_event,session)=>{if(!session)router.replace("/");});
  return()=>{active=false;authSubscription?.data.subscription.unsubscribe()};
 },[useShell,router]);
 useEffect(()=>{setMobileOpen(false);setProfileOpen(false)},[pathname]);
 if(!useShell)return <>{children}</>;
 if(!ready)return <div className="ei-loading"><span className="ei-brand-mark">EI</span><p>Preparing your learning space…</p></div>;
 async function logout(){if(supabase)await supabase.auth.signOut();router.replace("/");}
 function search(e:FormEvent){e.preventDefault();const value=query.trim();if(value)router.push("/lectures?search="+encodeURIComponent(value));}
 const sidebar=<><div className="ei-sidebar-brand"><Link href="/home" className="ei-brand"><span className="ei-brand-mark">EI</span>{!collapsed&&<span>EXAM <b>INTELLIGENCE</b></span>}</Link><button className="ei-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?"»":"«"}</button></div><div className="ei-nav-scroll">{["LEARN","INSIGHTS"].map(group=><div className="ei-nav-group" key={group}><div className="ei-nav-label">{!collapsed&&group}</div>{links.filter(x=>x.group===group).map(item=><Link key={item.href} href={item.href} title={collapsed?item.label:undefined} className={"ei-side-link "+(pathname===item.href||(item.href==="/sections"&&pathname.startsWith("/sections/"))?"active":"")}><Icon>{item.icon}</Icon>{!collapsed&&<span>{item.label}</span>}</Link>)}</div>)}</div><div className="ei-sidebar-bottom"><Link href="/profile" title={collapsed?"My Profile":undefined} className={"ei-side-link "+(pathname==="/profile"?"active":"")}><Icon>◎</Icon>{!collapsed&&<span>My Profile</span>}</Link><Link href="/settings" title={collapsed?"Settings":undefined} className="ei-side-link"><Icon>⚙</Icon>{!collapsed&&<span>Settings</span>}</Link><button onClick={logout} className="ei-side-link ei-logout"><Icon>↪</Icon>{!collapsed&&<span>Log out</span>}</button></div></>;
 return <div className={"ei-app "+(collapsed?"ei-collapsed":"")}>
  {mobileOpen&&<button className="ei-mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>}
  <aside className={"ei-sidebar "+(mobileOpen?"mobile-open":"")}>{sidebar}</aside>
  <div className="ei-main">
   <header className="ei-header"><div className="ei-header-left"><button className="ei-menu-button" onClick={()=>setMobileOpen(v=>!v)} aria-label="Open navigation">☰</button><Link href="/home" className="ei-mobile-brand"><span className="ei-brand-mark">EI</span><span>EXAM <b>INTELLIGENCE</b></span></Link><form className="ei-search" onSubmit={search}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search learning resources…" aria-label="Search learning resources"/><kbd>Enter</kbd></form></div><div className="ei-header-actions"><Link href="/help" className="ei-help-link">Help</Link><Link href="/dashboard" className="ei-icon-button" aria-label="Recent activity" title="Recent activity">◷</Link><div className="ei-profile-wrap"><button className="ei-profile-trigger" onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen}><span className="ei-avatar">{userName.slice(0,1).toUpperCase()}</span><span className="ei-profile-name">{userName}</span><span>⌄</span></button>{profileOpen&&<div className="ei-profile-menu"><div className="ei-profile-meta"><strong>{userName}</strong><small>{email}</small></div><Link href="/profile">My Profile</Link><Link href="/settings">Account Settings</Link><button onClick={logout}>Log out</button></div>}</div></div></header>
   <main className="ei-content">{children}</main>
   <footer className="ei-footer"><Link href="/home" className="ei-footer-brand">EXAM INTELLIGENCE</Link><span>Prepare Smart. Perform Better.</span><nav><Link href="/help">Help & Support</Link><Link href="/profile">My Profile</Link></nav><small>© {new Date().getFullYear()} Exam Intelligence</small></footer>
  </div>
  <nav className="ei-bottom-nav">{[{href:"/home",label:"Home",icon:"⌂"},{href:"/lectures",label:"Lectures",icon:"▷"},{href:"/tests",label:"Tests",icon:"▤"},{href:"/profile",label:"Profile",icon:"◎"}].map(item=><Link key={item.href} href={item.href} className={pathname===item.href?"active":""}><span>{item.icon}</span><small>{item.label}</small></Link>)}</nav>
 </div>;
}
