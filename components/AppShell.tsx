"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  getNotifications,
  getProfile,
  getSidebarCollapsed,
  markAllNotificationsRead,
  markNotificationRead,
  setSidebarCollapsed,
  type UserProfile,
} from "@/lib/local-store";
import type { DemoNotification } from "@/lib/demo-data";

const NAV = [
  { href: "/", label: "Home", icon: GridIcon },
  { href: "/classroom", label: "My Classroom", icon: MonitorIcon },
  { href: "/assignments", label: "Assignments", icon: DocIcon },
  { href: "/exams", label: "Exams", icon: ClipboardIcon },
  { href: "/library", label: "My Library", icon: ClockIcon },
] as const;

function titleFor(pathname: string) {
  if (pathname.startsWith("/classroom")) return "My Classroom";
  if (pathname.startsWith("/assignments")) return "Assignments";
  if (pathname.startsWith("/exams")) return "Exams";
  if (pathname.startsWith("/library")) return "My Library";
  if (pathname.startsWith("/toolkit")) return "AI Teacher's Toolkit";
  if (pathname.startsWith("/help")) return "Help";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Home";
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  compact: compactProp,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<DemoNotification[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(compactProp ?? getSidebarCollapsed());
    setNotifications(getNotifications());
    setProfile(getProfile());
  }, [compactProp]);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const title = titleFor(pathname);
  const schoolLine = profile ? `${profile.school}, ${profile.city}` : "Delhi Public School, Bokaro Steel City";

  const toggleCollapse = () => {
    if (compactProp !== undefined) return;
    const next = !collapsed;
    setCollapsed(next);
    setSidebarCollapsed(next);
  };

  const NavLinks = ({ compact }: { compact: boolean }) => (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active ? "bg-gray-100 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-50"
            } ${compact ? "justify-center px-0" : ""}`}
            title={item.label}
          >
            <item.icon className={active && compact ? "text-orange-500" : ""} />
            {!compact && item.label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarBody = ({ compact }: { compact: boolean }) => (
    <>
      <div className={`mb-6 flex items-center gap-2 ${compact ? "justify-center" : "justify-between"}`}>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-bold text-white">
            V
          </div>
          {!compact && <span className="text-lg font-semibold tracking-tight">VedaAI</span>}
        </Link>
        {!compact && compactProp === undefined && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Collapse sidebar"
          >
            ‹
          </button>
        )}
      </div>

      <Link
        href="/toolkit"
        className={
          compact
            ? "mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white"
            : "mb-6 block w-full rounded-full border border-orange-300 bg-[#2a2a2a] px-4 py-2.5 text-center text-sm font-medium text-white shadow-[0_0_0_1px_rgba(249,115,22,0.35)]"
        }
        title="AI Teacher's Toolkit"
      >
        {compact ? "✦" : "✦ AI Teacher's Toolkit"}
      </Link>

      <NavLinks compact={compact} />

      {!compact ? (
        <Link
          href="/profile"
          className="mt-auto rounded-2xl border border-gray-100 bg-gray-50 p-3 transition hover:border-orange-200"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs">🏫</div>
            <div className="text-xs leading-snug text-gray-600">{schoolLine}.</div>
          </div>
        </Link>
      ) : (
        <Link
          href="/profile"
          className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs"
          title={schoolLine}
        >
          🏫
        </Link>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] text-gray-900">
      <aside
        className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white md:flex ${
          collapsed ? "w-16 items-center px-2 py-4" : "w-64 px-4 py-5"
        }`}
      >
        {collapsed && compactProp === undefined && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="mb-2 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Expand sidebar"
          >
            ›
          </button>
        )}
        <SidebarBody compact={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white px-4 py-5 shadow-xl">
            <SidebarBody compact={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <span className="md:hidden text-base font-semibold">VedaAI</span>
            <button
              type="button"
              className="hidden text-gray-400 md:inline"
              onClick={() => router.back()}
              aria-label="Back"
            >
              ←
            </button>
            <span className="hidden md:inline">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/help" className="hidden text-gray-400 hover:text-gray-700 md:block" aria-label="Help">
              ?
            </Link>
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="relative text-gray-500"
                aria-label="Notifications"
                onClick={() => setNotifOpen((v) => !v)}
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    <button
                      type="button"
                      className="text-xs text-orange-600"
                      onClick={() => setNotifications(markAllNotificationsRead())}
                    >
                      Mark all read
                    </button>
                  </div>
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <li className="px-4 py-6 text-center text-sm text-gray-400">All caught up</li>
                    )}
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${n.read ? "opacity-70" : ""}`}
                          onClick={() => {
                            setNotifications(markNotificationRead(n.id));
                            setNotifOpen(false);
                            if (n.href) router.push(n.href);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />}
                            <div className={n.read ? "ml-3.5" : ""}>
                              <p className="text-sm font-medium text-gray-900">{n.title}</p>
                              <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Link href="/profile" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-300" />
              <span className="hidden text-sm font-medium md:inline">
                {profile?.displayName ?? "Madhur Rastogi"}
              </span>
            </Link>
            <button
              type="button"
              className="md:hidden text-gray-600"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              ☰
            </button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function GridIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth={1.5} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
    </svg>
  );
}
function MonitorIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth={1.5} d="M3 5h18v12H3V5zm5 14h8" />
    </svg>
  );
}
function DocIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth={1.5} d="M7 3h7l5 5v13H7V3zm7 0v5h5" />
    </svg>
  );
}
function ClipboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth={1.5} d="M9 4h6v2H9V4zm-2 2h10v14H7V6z" />
    </svg>
  );
}
function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth={1.5} d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
