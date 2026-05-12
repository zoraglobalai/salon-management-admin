import type { User } from "../types/auth.types";

const OWNER_USER_KEY = "owner_user";
const OWNER_TOKEN_KEY = "owner_token";
const OWNER_TAB_ID_KEY = "owner_tab_id";
const OWNER_AUTH_EVENT_KEY = "owner_auth_event";
export const OWNER_AUTH_CHANGED_EVENT = "owner-auth-changed";

type OwnerAuthChangeDetail = {
  user: User | null;
  token: string | null;
};

type OwnerBroadcastEvent = {
  type: "login" | "logout";
  userId: string | null;
  sourceTabId: string;
  at: number;
};

function createTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOwnerTabId() {
  let tabId = sessionStorage.getItem(OWNER_TAB_ID_KEY);
  if (!tabId) {
    tabId = createTabId();
    sessionStorage.setItem(OWNER_TAB_ID_KEY, tabId);
  }

  return tabId;
}

export function getStoredOwnerUser(): User | null {
  const raw = sessionStorage.getItem(OWNER_USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function getStoredOwnerToken() {
  return sessionStorage.getItem(OWNER_TOKEN_KEY);
}

function dispatchOwnerAuthChanged(detail: OwnerAuthChangeDetail) {
  window.dispatchEvent(new CustomEvent<OwnerAuthChangeDetail>(OWNER_AUTH_CHANGED_EVENT, { detail }));
}

function broadcastOwnerAuthEvent(event: OwnerBroadcastEvent) {
  localStorage.setItem(OWNER_AUTH_EVENT_KEY, JSON.stringify(event));
}

export function storeOwnerSession(user: User, token: string) {
  sessionStorage.setItem(OWNER_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(OWNER_TOKEN_KEY, token);

  dispatchOwnerAuthChanged({ user, token });
  broadcastOwnerAuthEvent({
    type: "login",
    userId: user.id,
    sourceTabId: getOwnerTabId(),
    at: Date.now(),
  });
}

export function updateStoredOwnerUser(user: User) {
  const token = getStoredOwnerToken();
  sessionStorage.setItem(OWNER_USER_KEY, JSON.stringify(user));
  dispatchOwnerAuthChanged({ user, token });
}

export function clearOwnerSession(options?: {
  broadcast?: boolean;
  redirectToLogin?: boolean;
  userId?: string | null;
}) {
  const currentUser = getStoredOwnerUser();
  const currentUserId = options?.userId ?? currentUser?.id ?? null;

  sessionStorage.removeItem(OWNER_USER_KEY);
  sessionStorage.removeItem(OWNER_TOKEN_KEY);

  dispatchOwnerAuthChanged({ user: null, token: null });

  if (options?.broadcast) {
    broadcastOwnerAuthEvent({
      type: "logout",
      userId: currentUserId,
      sourceTabId: getOwnerTabId(),
      at: Date.now(),
    });
  }

  if (options?.redirectToLogin && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export function parseOwnerBroadcastEvent(raw: string | null): OwnerBroadcastEvent | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OwnerBroadcastEvent;
  } catch {
    return null;
  }
}

export { OWNER_AUTH_EVENT_KEY };
