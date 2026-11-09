"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const items=[{href:"/admin",label:"Overview & Content",icon:"▦"},{href:"/admin/exams",label:"SSC Syllabus Manager",icon:"◎"},{href:"/admin/tests",label:"Question Bank & Tests",icon:"▤"}];

export default function AdminShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const router=useRouter();
 const [collapsed,setCollapsed]=useState(false);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [access,setAccess]=useState<"checking"|"allowed"|"denied">("checking");
 const [accessMessage,setAccessMessage]=useState("Verifying administrator permissions…");

 useEffect(()=>{
  let active=true;
  async function verify(){
   if(!supabase){if(active){setAccessMessage("The admin workspace is unavailable because Supabase is not configured.");setAccess("denied");}return;}
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(!active)return;
   if(userError||!user){router.replace("/auth");return;}
   const {data:isAdmin,error:roleError}=await supabase.rpc("is_admin");
   if(!active)return;
   if(roleError||isAdmin!==true){
    setAccessMessage(roleError?"Could not verify admin permissions. Please try again or contact the project owner.":"This account does not have administrator access.");
    setAccess("denied");
    return;
   }
   setAccess("allowed");
  }
  void verify();
  const {data:listener}=supabase?.auth.onAuthStateChange((_event,session)=>{
   if(!session){router.replace("/auth");setAccess("checking");}
  })??{data:{subscription:{unsubscribe:()=>{}}}};
  return ()=>{active=false;listener.subscription.unsubscribe();};
 },[router]);

 const nav=<><div className="ei-admin-brand-row"><Link href="/admin" className="ei-admin-brand"><span className="ei-brand-mark">EI</span>{!collapsed&&<span>EXAM <b>INTELLIGENCE</b><small>ADMIN CONTROL ROOM</small></span>}</Link><button className="ei-admin-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?"Expand admin sidebar":"Collapse admin sidebar"}>{collapsed?"»":"«"}</button></div><div className="ei-admin-nav"><div className="ei-admin-nav-label">{!collapsed&&"MANAGEMENT"}</div>{items.map(item=><Link key={item.href} href={item.href} title={collapsed?item.label:undefined} className={"ei-admin-link "+(pathname===item.href?"active":"")}><span>{item.icon}</span>{!collapsed&&item.label}</Link>)}</div><div className="ei-admin-nav-bottom"><Link href="/home" className="ei-admin-link"><span>⌂</span>{!collapsed&&"Student website"}</Link><Link href="/profile" className="ei-admin-link"><span>◎</span>{!collapsed&&"My profile"}</Link></div></>;

 if(access==="checking")return <div className="ei-admin-app"><main className="ei-admin-loading" role="status"><span className="ei-brand-mark">EI</span><strong>EXAM INTELLIGENCE</strong><p>{accessMessage}</p></main></div>;
 if(access==="denied")return <div className="ei-admin-app"><main className="ei-admin-denied"><span className="ei-brand-mark">EI</span><h1>Admin access required</h1><p role="alert">{accessMessage}</p><Link href="/dashboard">Return to student dashboard</Link></main></div>;

 return <div className={"ei-admin-app "+(collapsed?"is-collapsed":"")}>{mobileOpen&&<button className="ei-admin-scrim" onClick={()=>setMobileOpen(false)} aria-label="Close admin navigation"/>}<aside className={"ei-admin-sidebar "+(mobileOpen?"mobile-open":"")}>{nav}</aside><div className="ei-admin-main"><header className="ei-admin-header"><div className="ei-admin-head-left"><button className="ei-admin-menu" onClick={()=>setMobileOpen(v=>!v)} aria-label="Open admin navigation">☰</button><Link href="/admin" className="ei-admin-mobile-brand"><span className="ei-brand-mark">EI</span> ADMIN CONTROL ROOM</Link><div className="ei-admin-breadcrumb">EXAM INTELLIGENCE <span>/</span> ADMIN</div></div><div className="ei-admin-head-actions"><span className="ei-admin-secure">● Admin workspace</span><Link href="/home">View student site ↗</Link></div></header><main className="ei-admin-content">{children}</main><footer className="ei-admin-footer"><b>EXAM INTELLIGENCE</b><span>Prepare Smart. Perform Better.</span><small>Admin workspace · Secure access</small></footer></div></div>
}
