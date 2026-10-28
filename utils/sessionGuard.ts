import { API_URL } from "@/config/api";

// 401 messages that mean the session itself is gone (account deactivated or
// removed, signed in on another device, token expired or invalid). Other 401s,
// such as "Current password is incorrect", are ordinary errors for the screen to show.
export const isSessionEnded = (message: unknown) =>
  typeof message === "string" &&
  (/deactivated|removed|login again|another device/i.test(message) ||
    /jwt|token|signature/i.test(message) ||
    /^Unauthorized/.test(message));

const hasBearer = (init?: RequestInit) => {
  const headers = init?.headers;
  if (!headers) return false;
  const value =
    headers instanceof Headers
      ? headers.get("Authorization")
      : Array.isArray(headers)
        ? headers.find(([key]) => key.toLowerCase() === "authorization")?.[1]
        : (headers as Record<string, string>).Authorization ?? (headers as Record<string, string>).authorization;
  return typeof value === "string" && value.startsWith("Bearer ");
};

const requestUrl = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

let installed = false;

// Every store calls fetch directly, so the check lives here: when the API says a
// signed-in request's session has ended, `onEnded` runs (sign out, go to login).
// This is the fallback for when the realtime socket is down.
export function installSessionGuard(onEnded: (message: string) => unknown) {
  if (installed || !API_URL) return;
  installed = true;

  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const response = await original(input, init);
    if (response.status === 401 && requestUrl(input).startsWith(API_URL!) && hasBearer(init)) {
      const body = await response.clone().json().catch(() => null);
      if (isSessionEnded(body?.message)) onEnded(body.message);
    }
    return response;
  };
}
