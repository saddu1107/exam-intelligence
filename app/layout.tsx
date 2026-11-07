import type { Metadata } from "next";
import "./globals.css";
import StudentShell from "@/components/student-shell";
export const metadata: Metadata = {title:"Exam Intelligence",description:"Prepare Smart. Perform Better."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StudentShell>{children}</StudentShell></body></html>}
