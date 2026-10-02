"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CalendarDays, LayoutDashboard, Leaf, Settings, Wallet } from "lucide-react";

const nav = [
  { href: "/", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "/finance", label: "Tài chính", Icon: Wallet },
  { href: "/attendance", label: "Chấm công", Icon: CalendarDays },
  { href: "/settings/companies", label: "Công ty & mức lương", Icon: Building2 },
  { href: "/settings", label: "Cài đặt", Icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(path === "/login");

  useEffect(() => {
    if (path === "/login") return;
    fetch("/api/auth")
      .then((response) => response.json())
      .then((result) => {
        if (result.authenticated) setReady(true);
        else router.replace(result.configurationRequired ? "/login?setup=1" : "/login");
      })
      .catch(() => router.replace("/login"));
  }, [path, router]);

  if (path === "/login") return <>{children}</>;
  if (!ready) return <div className="login-wait"><span className="spinner" /> Đang kiểm tra phiên đăng nhập…</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon"><Leaf size={19} /></span>
          <span>Sổ tay<span className="brand-light"> của tôi</span><small>TÀI CHÍNH & CÔNG VIỆC</small></span>
        </Link>
        <div className="nav-label">KHÔNG GIAN CỦA BẠN</div>
        <nav>
          {nav.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={"nav-link " + (path === href ? "active" : "")}>
              <Icon size={19} /><span>{label}</span>{href === "/" && <i className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure"><span className="secure-dot" />Dữ liệu đồng bộ Google Sheets</div>
          <div className="profile">
            <div className="avatar">M</div>
            <div><b>Tài khoản cá nhân</b><small>Không gian riêng tư</small></div>
            <button className="icon-button" title="Đăng xuất" onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); location.href = "/login"; }}>
              <Settings size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
      <nav className="mobile-nav">
        {nav.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            <Icon size={19} /><span>{label === "Công ty & mức lương" ? "Công ty" : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
