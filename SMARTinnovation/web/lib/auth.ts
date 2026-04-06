export const CORRECT_PASSWORD = "cell123!hs";

const SESSION_KEY   = "si-authed";
const EDIT_KEY      = "si-edit-authed";
const EDITOR_NAME_KEY = "si-editor-name";

export function checkPassword(pw: string): boolean {
  return pw === CORRECT_PASSWORD;
}

/** 타임라인별 편집 비밀번호 확인 (없으면 전역 비밀번호로 fallback) */
export function checkTimelineEditPassword(pw: string, timelineEditPassword?: string): boolean {
  if (timelineEditPassword) return pw === timelineEditPassword;
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

/** 편집자 이름 저장/조회 */
export function getEditorName(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(EDITOR_NAME_KEY) ?? "";
}

export function setEditorName(name: string): void {
  sessionStorage.setItem(EDITOR_NAME_KEY, name);
}
