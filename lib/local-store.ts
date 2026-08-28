"use client";

import {
  DEMO_ASSIGNMENTS,
  DEMO_LIBRARY,
  DEMO_NOTIFICATIONS,
  type DemoAssignment,
  type DemoNotification,
  type LibraryItem,
} from "./demo-data";

const KEYS = {
  profile: "vedaai.profile",
  notifications: "vedaai.notifications",
  assignments: "vedaai.assignments",
  library: "vedaai.library",
  sidebarCollapsed: "vedaai.sidebarCollapsed",
} as const;

export type UserProfile = {
  displayName: string;
  school: string;
  city: string;
  email: string;
  notifyJobReady: boolean;
  notifyGrading: boolean;
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: "Madhur Rastogi",
  school: "Delhi Public School",
  city: "Bokaro Steel City",
  email: "madhur@dpsbokaro.edu",
  notifyJobReady: true,
  notifyGrading: true,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProfile(): UserProfile {
  return { ...DEFAULT_PROFILE, ...read(KEYS.profile, {}) };
}

export function saveProfile(p: UserProfile) {
  write(KEYS.profile, p);
}

export function getNotifications(): DemoNotification[] {
  return read(KEYS.notifications, DEMO_NOTIFICATIONS);
}

function saveNotifications(list: DemoNotification[]) {
  write(KEYS.notifications, list);
}

export function markNotificationRead(id: string) {
  const list = getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(list);
  return list;
}

export function markAllNotificationsRead() {
  const list = getNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(list);
  return list;
}

export function pushNotification(n: Omit<DemoNotification, "id" | "createdAt" | "read"> & { id?: string }) {
  const list = getNotifications();
  const id = n.id || crypto.randomUUID();
  if (list.some((x) => x.id === id)) return list;
  const item: DemoNotification = {
    id,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const next = [item, ...list].slice(0, 40);
  saveNotifications(next);
  return next;
}

export function getAssignments(): DemoAssignment[] {
  return read(KEYS.assignments, DEMO_ASSIGNMENTS);
}

function saveAssignments(list: DemoAssignment[]) {
  write(KEYS.assignments, list);
}

export function upsertAssignment(a: DemoAssignment) {
  const list = getAssignments();
  const i = list.findIndex((x) => x.id === a.id);
  if (i >= 0) list[i] = a;
  else list.unshift(a);
  saveAssignments(list);
  return list;
}

export function getLibrary(): LibraryItem[] {
  return read(KEYS.library, DEMO_LIBRARY);
}

function saveLibrary(list: LibraryItem[]) {
  write(KEYS.library, list);
}

export function addLibraryItem(item: LibraryItem) {
  const list = [item, ...getLibrary()];
  saveLibrary(list);
  return list;
}

export function getSidebarCollapsed(): boolean {
  return read(KEYS.sidebarCollapsed, false);
}

export function setSidebarCollapsed(v: boolean) {
  write(KEYS.sidebarCollapsed, v);
}
