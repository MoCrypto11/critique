import { type ClassValue, clsx } from "./utils-internal";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

export function shortAddress(value?: string) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function looksLikeAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(value);
  }
  return Promise.resolve();
}
