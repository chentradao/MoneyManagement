import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
export const metadata:Metadata={title:"Sổ tay tài chính",description:"Quản lý tài chính cá nhân và chấm công"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body><AppShell>{children}</AppShell></body></html>}
