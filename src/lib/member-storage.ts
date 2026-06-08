"use client";

const STORAGE_KEY = "pickleball_selected_member";

export interface StoredMember {
  id: string;
  displayName: string;
}

export function getSelectedMember(): StoredMember | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredMember;
  } catch {
    return null;
  }
}

export function setSelectedMember(member: StoredMember) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(member));
}

export function clearSelectedMember() {
  localStorage.removeItem(STORAGE_KEY);
}
