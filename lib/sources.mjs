import { AppError } from "./errors.mjs";

const OWNER_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const REPO_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]+$/;
const RESERVED = new Set(["orgs", "settings", "login", "search", "topics", "marketplace"]);

export function validateWebURL(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length > 2048 || /[\u0000-\u0020\u007f]/.test(text)) {
    throw new AppError("invalid_source_url", "Enter a valid HTTP or HTTPS source URL.", 400);
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new AppError("invalid_source_url", "Enter a valid HTTP or HTTPS source URL.", 400);
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new AppError(
      "invalid_source_url",
      "Only HTTP/HTTPS URLs without credentials are allowed.",
      400
    );
  }
  return url.href;
}

function githubRepo(value) {
  const text = String(value || "").trim().replace(/^https?:\/\/github\.com\//i, "");
  return text.replace(/\.git$/i, "").replace(/\/+$/, "");
}

export function nativeSourceURL(source) {
  if (!source || typeof source !== "object") return "";
  if (source.kind === "github") {
    const repo = githubRepo(source.repo);
    if (!REPO_RE.test(repo)) return "";
    let url = `https://github.com/${repo}`;
    if (source.ref || source.path) {
      const ref = String(source.ref || "HEAD")
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      url += `/tree/${ref}`;
      if (source.path) {
        const parts = String(source.path).replaceAll("\\", "/").split("/");
        if (parts.some((part) => part === "." || part === "..")) return "";
        url += `/${parts.filter(Boolean).map(encodeURIComponent).join("/")}`;
      }
    }
    return url;
  }
  if (source.kind === "git") {
    try {
      return validateWebURL(source.repo || "");
    } catch {
      return "";
    }
  }
  return "";
}

export function sourceOwner(webURL) {
  if (!webURL) return "";
  try {
    const url = new URL(webURL);
    if (url.hostname !== "github.com") return "";
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length >= 2 && OWNER_RE.test(parts[0]) && !RESERVED.has(parts[0])
      ? parts[0]
      : "";
  } catch {
    return "";
  }
}

export function sourceDetails(source, customURL = "") {
  const nativeURL = nativeSourceURL(source);
  const sourceURL = nativeURL || validateWebURL(customURL);
  const owner = sourceOwner(sourceURL);
  const display = sourceURL ? new URL(sourceURL) : null;
  return {
    sourceURL,
    sourceOwner: owner,
    sourceKind: owner ? "github" : sourceURL ? "web" : source ? "local" : "unknown",
    sourceLabel:
      source?.kind === "github" && nativeURL
        ? githubRepo(source.repo)
        : display
          ? `${display.host}${display.pathname.replace(/\/$/, "")}`
          : "",
    customSource: Boolean(sourceURL && !nativeURL),
    canEditSource: !nativeURL
  };
}

export function validOwner(value) {
  return OWNER_RE.test(String(value || ""));
}
