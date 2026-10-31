// Simulated session in localStorage (key matches references/templates/app.jsx).
import { useMemo, useSyncExternalStore } from "react";

export type User = { name: string };

const USER_KEY = "av_user";
// localStorage's own "storage" event only fires in other tabs, so same-tab writes dispatch this one.
const CHANGE_EVENT = "av-storage";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: keep running as a guest.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useUser(): User | null {
  // The snapshot is the raw string so it stays referentially stable between renders.
  const raw = useSyncExternalStore(subscribe, () => read(USER_KEY), () => null);
  return useMemo(() => {
    const user = parse<User | null>(raw, null);
    return user && typeof user.name === "string" ? user : null;
  }, [raw]);
}

export function login(name: string) {
  const user: User = { name: (name.trim() || "PLAYER1").toUpperCase().slice(0, 10) };
  write(USER_KEY, JSON.stringify(user));
}

export function logout() {
  write(USER_KEY, null);
}
