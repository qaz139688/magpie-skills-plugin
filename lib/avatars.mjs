import { validOwner } from "./sources.mjs";

export function createAvatarCache(fetchImage = fetch) {
  const cache = new Map();
  const pending = new Map();
  return async (owner) => {
    if (!validOwner(owner)) return null;
    const known = cache.get(owner);
    if (known && known.expires > Date.now()) return known;
    if (pending.has(owner)) return pending.get(owner);
    if (pending.size >= 4) return null;
    const work = (async () => {
      try {
        let url = new URL(`https://github.com/${owner}.png?size=64`);
        let response;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          if (
            !["github.com", "avatars.githubusercontent.com"].includes(url.hostname) ||
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.port
          ) {
            return null;
          }
          response = await fetchImage(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(8000),
            headers: {
              Accept: "image/png,image/jpeg,image/webp",
              "User-Agent": "Magpie-Skills-Manager"
            }
          });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get("location");
            if (!location) return null;
            url = new URL(location, url);
            continue;
          }
          break;
        }
        const type = response?.headers.get("content-type")?.split(";")[0] || "";
        if (
          !response?.ok ||
          !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)
        ) {
          return null;
        }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of response.body) {
          bytes += chunk.length;
          if (bytes > 256 * 1024) return null;
          chunks.push(chunk);
        }
        const result = {
          body: Buffer.concat(chunks),
          type,
          expires: Date.now() + 86_400_000
        };
        if (cache.size >= 128) cache.delete(cache.keys().next().value);
        cache.set(owner, result);
        return result;
      } catch {
        return null;
      } finally {
        pending.delete(owner);
      }
    })();
    pending.set(owner, work);
    return work;
  };
}
