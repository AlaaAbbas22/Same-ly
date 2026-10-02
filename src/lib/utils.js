import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getSafeCallbackUrl(value, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value === "/login" || value.startsWith("/login?") || value === "/signup" || value.startsWith("/signup?")) {
    return fallback;
  }
  return value;
}

export function withCallbackUrl(path, callbackUrl) {
  const safe = getSafeCallbackUrl(callbackUrl, "");
  if (!safe) return path;

  const [pathname, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set("callbackUrl", safe);
  return `${pathname}?${params.toString()}`;
}
