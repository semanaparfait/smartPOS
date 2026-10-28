// Release builds (EAS) block plain http:// requests: Android disables cleartext
// traffic and iOS App Transport Security requires HTTPS. The API returns
// Cloudinary URLs as http://, so images load in dev but not on installed apps.
// Upgrade remote http URLs to https; leave local files, data URIs and
// LAN/localhost addresses (which usually have no TLS) untouched.
const LOCAL_HOST =
  /^http:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

//
// Also accepts an uploaded-file object as the API returns it (employee photos,
// owner avatars: { url, thumbnailUrl, ... }) and uses its link.
export type ImageFile = { url?: string | null; thumbnailUrl?: string | null };

export function secureUrl(url: string): string;
export function secureUrl(url: string | ImageFile | null | undefined): string | undefined;
export function secureUrl(value: string | ImageFile | null | undefined) {
  const url = typeof value === "object" && value ? value.url ?? value.thumbnailUrl : value;
  if (typeof url !== "string" || !url) return undefined;
  if (url.startsWith("http://") && !LOCAL_HOST.test(url))
    return `https://${url.slice("http://".length)}`;
  return url;
}
