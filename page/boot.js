(() => {
  "use strict";

  const DEFAULT_PORT = 3487;
  const PAGE_TOKEN_RE = /\/_magpie\/plugin\/([0-9a-f]{32})\//i;

  function base64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  async function boot() {
    const match = location.href.match(PAGE_TOKEN_RE);
    if (!match) {
      document.body.textContent =
        "This page has no Magpie capability token. Open it from the Skills Management tab.";
      return;
    }

    let theme = null;
    let options = {};
    try {
      theme = await window.magpie?.ready;
    } catch {
      theme = null;
    }
    try {
      options = (await window.magpie?.options?.get?.()) || {};
    } catch {
      options = {};
    }

    const port = Number(options.port) || DEFAULT_PORT;
    const service = window.magpie?.service
      ? new URL(window.magpie.service, location.href).href
      : `http://127.0.0.1:${port}/`;
    const base = service.endsWith("/") ? service : `${service}/`;
    const hash = new URLSearchParams();
    hash.set("page", match[1]);
    hash.set("theme", theme?.dark ? "dark" : "light");
    if (theme?.lang) hash.set("lang", theme.lang);
    if (theme?.tokens && Object.keys(theme.tokens).length) {
      try {
        hash.set("tokens", base64Utf8(JSON.stringify(theme.tokens)));
      } catch {
        // The service page has usable theme fallbacks.
      }
    }
    location.replace(`${base}#${hash.toString()}`);
  }

  boot();
})();
