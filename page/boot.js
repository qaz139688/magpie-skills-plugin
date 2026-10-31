(() => {
  "use strict";

  const DEFAULT_PORT = 3487;
  const PAGE_TOKEN_RE = /\/_magpie\/plugin\/([0-9a-f]{32})\//i;
  const CAPABILITY_RE = /^[0-9a-f]{64}$/i;

  function base64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function loadCapability(port) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 8000;
      const load = () => {
        if (Date.now() > deadline) {
          reject(new Error("The Skills Management service did not publish its capability."));
          return;
        }
        const script = document.createElement("script");
        script.src = `.service-capability-${port}.js?t=${Date.now()}-${Math.random()}`;
        script.onload = () => {
          script.remove();
          if (CAPABILITY_RE.test(window.__skillsManagerCapability || "")) {
            resolve(window.__skillsManagerCapability);
          } else {
            setTimeout(load, 350);
          }
        };
        script.onerror = () => {
          script.remove();
          setTimeout(load, 350);
        };
        document.head.append(script);
      };
      load();
    });
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
    let capability;
    try {
      capability = await loadCapability(port);
    } catch (error) {
      document.body.textContent = error.message;
      return;
    }
    const service = window.magpie?.service
      ? new URL(window.magpie.service, location.href).href
      : `http://127.0.0.1:${port}/`;
    const base = service.endsWith("/") ? service : `${service}/`;
    const hash = new URLSearchParams();
    hash.set("page", capability);
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
