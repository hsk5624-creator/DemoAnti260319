export const CORRECT_PASSWORD = "cell123!hs";

const SESSION_KEY = "si-authed";
const EDIT_KEY    = "si-edit-authed";

export function checkPassword(pw: string): boolean {
  return pw === CORRECT_PASSWORD;
}

export function isLandingAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function setLandingAuthed(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

export function isEditAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(EDIT_KEY) === "1";
}

export function setEditAuthed(): void {
  sessionStorage.setItem(EDIT_KEY, "1");
}
