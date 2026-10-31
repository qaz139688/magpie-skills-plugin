import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_PORT,
  MAX_BODY_BYTES,
  MAX_PENDING_WRITES,
  MAX_SESSIONS,
  PAGE_TOKEN_RE,
  SESSION_TOKEN_RE,
  SESSION_TTL_MS,
  SKILL_NAME_RE
} from "./constants.mjs";
import {
  setSkillAgents,
  resolveMagpieExecutable,
  syncMagpieLibrary
} from "./cli.mjs";
import { createDiscovery } from "./discovery.mjs";
import { AppError, asAppError } from "./errors.mjs";
import {
  findSkill,
  loadLibrary,
  projectSkills
} from "./library.mjs";
import {
  createLabel,
  deleteLabel,
  emptyMetadata,
  labelsForSkill,
  labelsWithCounts,
  loadMetadata,
  metadataDir,
  renameLabel,
  saveMetadata,
  setSkillLabels
} from "./metadata.mjs";
import { emptyFeatures, loadFeatures, saveFeatures } from "./features.mjs";
import { PROJECT_SKILL_DIRS, PROJECT_ID_RE } from "./features.mjs";
import {
  addProject,
  removeProject,
  setProjectAgents,
  projectAgents,
  projectView
} from "./projects.mjs";
import { setNativeProjectAgents } from "./native-projects.mjs";
import { nativeSourceURL, sourceDetails, validateWebURL } from "./sources.mjs";
import { runHostAction } from "./host-actions.mjs";
import { createAvatarCache } from "./avatars.mjs";
import { AGENT_ICONS } from "./agent-icons.mjs";

const STATIC_ROUTES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/styles.css", "styles.css"],
  ["/icon.svg", "icon.svg"],
  ["/favicon.ico", "icon.svg"]
]);
for (const { file } of Object.values(AGENT_ICONS)) {
  STATIC_ROUTES.set(`/icons/${file}`, `icons/${file}`);
}

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function nowIso(now = Date.now) {
  return new Date(now()).toISOString();
}

function errorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return message.length > 1400 ? `${message.slice(0, 1400)}...` : message;
}

function capabilityIn(text) {
  const match = String(text || "").match(
    /^window\.__skillsManagerCapability = "([0-9a-f]{64})";\s*$/i
  );
  return match ? match[1].toLowerCase() : "";
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function secureCapabilityFile(file) {
  if (process.platform !== "win32") {
    fs.chmodSync(file, 0o600);
    return;
  }

  const account = process.env.USERDOMAIN
    ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
    : process.env.USERNAME || process.env.USER;
  if (!account) {
    throw new Error("Could not determine the current Windows user.");
  }
  execFileSync(
    "icacls",
    [file, "/inheritance:r", "/grant:r", `${account}:(F)`],
    { stdio: "ignore", windowsHide: true }
  );
}

function stablePageCapability({ configDir, pluginDir, port }) {
  const secretFile = path.join(metadataDir(configDir), "service-capability");
  const saved = readText(secretFile).trim();
  if (PAGE_TOKEN_RE.test(saved)) {
    try {
      secureCapabilityFile(secretFile);
    } catch (error) {
      throw new AppError(
        "capability_acl_failed",
        `Could not restrict the Skills Management capability: ${error.message}`,
        500
      );
    }
    return saved.toLowerCase();
  }

  // Adopt the capability already loaded by an open page, so upgrading or
  // restarting the plugin does not invalidate that page mid-session.
  const bootstrapFile = pluginDir
    ? path.join(pluginDir, "page", `.service-capability-${port}.js`)
    : "";
  const adopted = capabilityIn(readText(bootstrapFile));
  const capability = adopted || randomBytes(32).toString("hex");
  const dir = path.dirname(secretFile);
  const temp = path.join(dir, `.service-capability.${randomUUID()}.tmp`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.writeFileSync(temp, `${capability}\n`, { encoding: "utf8", mode: 0o600 });
    secureCapabilityFile(temp);
    fs.renameSync(temp, secretFile);
  } catch (error) {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
    throw new AppError(
      "capability_persist_failed",
      `Could not persist the Skills Management capability: ${error.message}`,
      500
    );
  }
  return capability;
}

function safeLibrary(configDir) {
  try {
    return loadLibrary(configDir);
  } catch (error) {
    return {
      state: "error",
      error: errorMessage(error),
      skills: [],
      projects: [],
      file: ""
    };
  }
}

function safeMetadata(configDir) {
  try {
    const result = loadMetadata(configDir);
    return {
      state: result.state,
      error: null,
      data: result.data
    };
  } catch (error) {
    return {
      state: "error",
      error: errorMessage(error),
      data: emptyMetadata()
    };
  }
}

function safeFeatures(configDir) {
  try {
    return { ...loadFeatures(configDir), error: null };
  } catch (error) {
    return { state: "error", error: errorMessage(error), data: emptyFeatures() };
  }
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function hostAllowed(request) {
  const host = (request.headers.get("host") || "").trim().toLowerCase();
  if (!host) return false;
  let hostname = host;
  if (hostname.startsWith("[")) {
    const end = hostname.indexOf("]");
    if (end >= 0) hostname = hostname.slice(0, end + 1);
  } else {
    hostname = hostname.split(":")[0];
  }
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

function originAllowed(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === "null";
}

function corsHeaders(request, headers = new Headers()) {
  if (request.headers.get("origin") === "null") {
    headers.set("Access-Control-Allow-Origin", "null");
    headers.set("Vary", "Origin");
  }
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return headers;
}

function jsonResponse(request, body, status = 200) {
  const headers = corsHeaders(request, new Headers());
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(request, error, state = undefined) {
  const appError = asAppError(error);
  const body = {
    ok: false,
    error: {
      code: appError.code,
      message: appError.message
    }
  };
  if (appError.details !== undefined) body.error.details = appError.details;
  if (state !== undefined) body.state = state;
  return jsonResponse(request, body, appError.status);
}

async function readJsonBody(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new AppError("request_too_large", "Request body is too large.", 413);
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new AppError("request_too_large", "Request body is too large.", 413);
  }
  if (!text.trim()) return {};
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new AppError(
      "content_type_required",
      "State-changing requests must use application/json.",
      415
    );
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AppError("invalid_json", "Request body is not valid JSON.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("invalid_json", "Request body must be a JSON object.", 400);
  }
  return value;
}

function decodeSkillName(raw) {
  let value;
  try {
    value = decodeURIComponent(raw);
  } catch {
    throw new AppError("invalid_skill", "Skill name is not valid URL encoding.", 400);
  }
  if (!SKILL_NAME_RE.test(value)) {
    throw new AppError("invalid_skill", "Invalid skill name.", 400);
  }
  return value;
}

export function createService({
  configDir = process.cwd(),
  env = process.env,
  now = Date.now,
  executable = "",
  pluginDir = "",
  agentDiscovery = null,
  runDiscovery = undefined,
  setAgents = setSkillAgents,
  syncLibrary = syncMagpieLibrary,
  hostAction = runHostAction,
  pageCapability = randomBytes(32).toString("hex"),
  fetchImage = fetch
} = {}) {
  if (!PAGE_TOKEN_RE.test(pageCapability)) {
    throw new AppError("invalid_page_capability", "A service capability is required.", 500);
  }
  const pageDir = pluginDir ? path.join(pluginDir, "page") : "";
  const getAvatar = createAvatarCache(fetchImage);
  const discovery =
    agentDiscovery ||
    createDiscovery({
      env,
      configDir,
      executable,
      runDiscovery
    });

  const sessions = new Map();
  let writeTail = Promise.resolve();
  let pendingWrites = 0;
  let lastOperation = null;

  function pruneSessions() {
    const stamp = now();
    for (const [token, session] of sessions) {
      if (session.expiresAt <= stamp) sessions.delete(token);
    }
    while (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value;
      if (!oldest) break;
      sessions.delete(oldest);
    }
  }

  function pageToken(request) {
    const token = request.headers.get("x-magpie-page") || "";
    if (
      !PAGE_TOKEN_RE.test(token) ||
      !timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(pageCapability, "hex"))
    ) {
      throw new AppError(
        "page_auth_required",
        "This request did not come from an authorized Skills Management page.",
        401
      );
    }
    return token;
  }

  function createSession(request) {
    pruneSessions();
    const token = randomBytes(32).toString("hex");
    const expiresAt = now() + SESSION_TTL_MS;
    sessions.set(token, { expiresAt, pageToken: pageToken(request) });
    return { token, expiresAt };
  }

  function requireSession(request) {
    const token = request.headers.get("x-magpie-session") || "";
    if (!SESSION_TOKEN_RE.test(token)) {
      throw new AppError(
        "session_required",
        "A fresh Skills Management session is required.",
        401
      );
    }
    const session = sessions.get(token);
    if (!session || session.expiresAt <= now()) {
      sessions.delete(token);
      throw new AppError(
        "session_expired",
        "The Skills Management session expired. Reload the page and try again.",
        401
      );
    }
    if (session.pageToken !== pageToken(request)) {
      throw new AppError("session_mismatch", "The session does not match this page.", 401);
    }
  }

  function buildState({ operation = lastOperation } = {}) {
    const library = safeLibrary(configDir);
    const metadata = safeMetadata(configDir);
    const features = safeFeatures(configDir);
    const discoveryState = discovery.snapshot();
    const skills =
      library.state === "ok"
        ? projectSkills(configDir, library, features.data.sources).map((skill) => ({
            ...skill,
            labels: labelsForSkill(metadata.data, skill.name)
          }))
        : [];
    const skillNames = skills.map((skill) => skill.name);
    const labels = labelsWithCounts(metadata.data, skillNames);
    const orphanLinkCount = Object.keys(metadata.data.links).filter(
      (name) => !skillNames.includes(name)
    ).length;
    const canAssign =
      library.state === "ok" &&
      discoveryState.state === "ready" &&
      discoveryState.agents.length > 0 &&
      Boolean(discoveryState.executable);
    const canLabel = metadata.state !== "error";
    const agents = discoveryState.agents
      .filter(
        (agent) =>
          agent &&
          agent.installed !== false &&
          agent.gone !== true &&
          agent.unseen !== true
      )
      .map((agent) => ({
        ...agent,
        icon: AGENT_ICONS[agent.id] || null,
        projectSkillDir: PROJECT_SKILL_DIRS[agent.id] || ""
      }));
    const nativeProjects = library.projects || [];
    const projects = [
      ...features.data.projects.map((project) => projectView(project, nativeProjects, library)),
      ...nativeProjects
    ];

    return {
      ok: true,
      generatedAt: nowIso(now),
      library: {
        state: library.state,
        error: library.error
      },
      metadata: {
        state: metadata.state,
        error: metadata.error,
        orphanLinkCount
      },
      features: {
        state: features.state,
        error: features.error
      },
      discovery: {
        state: discoveryState.state,
        error: discoveryState.error,
        warnings: discoveryState.warnings,
        checkedAt: discoveryState.checkedAt,
        executableAvailable: Boolean(discoveryState.executable)
      },
      capabilities: {
        canAssign,
        canLabel,
        canSetSource: library.state === "ok" && features.state !== "error",
        canManageProjects: library.state === "ok" && features.state !== "error",
        canAssignProject:
          canAssign && (features.state !== "error" || nativeProjects.length > 0)
      },
      agents,
      projectAgents: projectAgents(agents),
      projectSkillDirs: PROJECT_SKILL_DIRS,
      projects,
      labels,
      skills,
      summary: {
        skillCount: skills.length,
        untaggedCount: skills.filter((skill) => skill.labels.length === 0).length,
        labelCount: labels.length,
        projectCount: projects.length
      },
      lastOperation: operation
    };
  }

  function knownSkill(name) {
    const library = loadLibrary(configDir);
    if (library.state !== "ok") {
      throw new AppError("library_unavailable", "Magpie's Library is unavailable.", 503);
    }
    const skill = findSkill(library, name);
    if (!skill) throw new AppError("skill_not_found", "That skill no longer exists.", 404);
    return { library, skill };
  }

  async function skillAction(name, action) {
    const { skill } = knownSkill(name);
    let value = name;
    if (action === "folder") {
      const directory = path.join(configDir, "library", "skills", name);
      if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        throw new AppError("skill_folder_missing", "The Library skill folder is missing.", 409);
      }
      value = directory;
    } else if (action === "browse") {
      value = sourceDetails(
        skill.source,
        loadFeatures(configDir).data.sources[name] || ""
      ).sourceURL;
      if (!value) throw new AppError("source_missing", "Set a web source before opening it.", 409);
    }
    return hostAction({ action, value, env });
  }

  async function mutateProject(id, skillName, body, all = false) {
    return enqueueWrite(async () => {
      const library = loadLibrary(configDir);
      if (!findSkill(library, skillName)) {
        throw new AppError("skill_not_found", "That Library skill no longer exists.", 404);
      }
      if (body.enabled !== true && body.enabled !== false) {
        throw new AppError("invalid_agent_state", "enabled must be true or false.", 400);
      }
      const removeAll = body.removeAll === true;
      const fresh = await discovery.refresh({ force: true });
      if (fresh.state !== "ready") {
        throw new AppError(
          "agent_discovery_failed",
          fresh.error || "Agent discovery failed. Project writes are disabled.",
          503
        );
      }
      const eligible = new Set(projectAgents(fresh.agents).map((agent) => agent.id));
      if (!eligible.size) {
        throw new AppError(
          "no_project_agents",
          "No installed agents support known project skill folders.",
          409
        );
      }
      const ids = all ? eligible : [String(body.agentId || "")];
      for (const agentId of ids) {
        if (!eligible.has(agentId)) {
          throw new AppError(
            "agent_not_eligible",
            "This agent cannot manage project skills here.",
            409
          );
        }
      }

      if (!PROJECT_ID_RE.test(id)) {
        const nativeProject = library.projects.find((item) => item.id === id);
        if (!nativeProject) {
          throw new AppError(
            "project_not_found",
            "That native project no longer exists.",
            404
          );
        }
        // Native projects can contain hidden or unsupported agent IDs. The
        // menu only owns the currently eligible project agents, so removals
        // must leave every other native assignment untouched.
        const next = new Set(nativeProject.assignments[skillName] || []);
        for (const agentId of ids) {
          if (body.enabled) next.add(agentId);
          else next.delete(agentId);
        }
        await setNativeProjectAgents({
          configDir,
          project: nativeProject,
          skillName,
          agentIds: [...next],
          executable: fresh.executable || resolveMagpieExecutable(env) || executable,
          env,
          syncLibrary
        });
        lastOperation = {
          kind: "project.agents",
          skill: skillName,
          project: id,
          at: nowIso(now)
        };
        return buildState();
      }

      const data = loadFeatures(configDir).data;
      const project = data.projects.find((item) => item.id === id);
      if (!project) {
        throw new AppError("project_not_found", "That plugin project no longer exists.", 404);
      }
      if (projectView(project, library.projects, library).readOnly) {
        throw new AppError(
          "project_read_only",
          "This project has a placement conflict. Resolve it before changing skills.",
          409
        );
      }
      const next = removeAll
        ? new Set()
        : new Set(project.assignments[skillName] || []);
      for (const agentId of ids) {
        if (body.enabled) next.add(agentId);
        else next.delete(agentId);
      }
      setProjectAgents(configDir, data, project, library.projects, skillName, [...next]);
      lastOperation = {
        kind: "project.agents",
        skill: skillName,
        project: id,
        at: nowIso(now)
      };
      return buildState();
    });
  }

  function enqueueWrite(work) {
    if (pendingWrites >= MAX_PENDING_WRITES) {
      return Promise.reject(
        new AppError(
          "write_queue_full",
          "Too many changes are waiting. Try again in a moment.",
          429
        )
      );
    }
    pendingWrites += 1;
    const run = writeTail.then(work, work);
    writeTail = run.catch(() => {});
    return run.finally(() => {
      pendingWrites -= 1;
    });
  }

  async function mutateMetadata(action) {
    return enqueueWrite(async () => {
      const loaded = loadMetadata(configDir);
      const before = loaded.data;
      let next = before;
      let operation;

      if (action.kind === "create") {
        const created = createLabel(before, action.name, new Date(now()));
        next = created.data;
        operation = { kind: "label.create", label: created.label.name, at: nowIso(now) };
      } else if (action.kind === "rename") {
        const renamed = renameLabel(before, action.id, action.name);
        next = renamed.data;
        operation = { kind: "label.rename", label: renamed.label.name, at: nowIso(now) };
      } else if (action.kind === "delete") {
        const deleted = deleteLabel(before, action.id);
        next = deleted.data;
        operation = { kind: "label.delete", label: deleted.label.name, at: nowIso(now) };
      } else if (action.kind === "set-skill") {
        const library = loadLibrary(configDir);
        if (library.state !== "ok") {
          throw new AppError(
            "library_unavailable",
            library.error || "Magpie's library is not available.",
            503
          );
        }
        if (!findSkill(library, action.skillName)) {
          throw new AppError("skill_not_found", "That skill no longer exists.", 404);
        }
        next = setSkillLabels(before, action.skillName, action.labelIds);
        operation = {
          kind: "skill.labels",
          skill: action.skillName,
          at: nowIso(now)
        };
      } else {
        throw new AppError("invalid_action", "Unknown label action.", 400);
      }

      saveMetadata(configDir, next);
      lastOperation = operation;
      return buildState({ operation });
    });
  }

  async function mutateAssociation(skillName, operation) {
    return enqueueWrite(async () => {
      const fresh = await discovery.refresh();
      if (fresh.state !== "ready") {
        throw new AppError(
          "agent_discovery_failed",
          fresh.error || "Windows agent discovery failed. Writes are disabled.",
          503
        );
      }
      const libraryBefore = loadLibrary(configDir);
      if (libraryBefore.state !== "ok") {
        throw new AppError(
          "library_unavailable",
          libraryBefore.error || "Magpie's library is not available.",
          503
        );
      }
      const skill = findSkill(libraryBefore, skillName);
      if (!skill) {
        throw new AppError("skill_not_found", "That skill no longer exists.", 404);
      }
      const eligible = new Set(fresh.agents.map((agent) => agent.id));
      if (!eligible.size) {
        throw new AppError(
          "no_eligible_agents",
          "No installed Windows agents with a Skills integration were discovered.",
          409
        );
      }

      const current = new Set(skill.agents);
      const next = operation(current, eligible, fresh.agents);
      if (!sameSet(current, next)) {
        const executablePath =
          fresh.executable || resolveMagpieExecutable(env) || executable;
        await setAgents({
          executable: executablePath,
          cwd: configDir,
          env,
          skillName,
          agentIds: [...next].sort()
        });
        const after = loadLibrary(configDir);
        if (after.state !== "ok") {
          throw new AppError(
            "assignment_verification_failed",
            "Magpie's library could not be read after the change.",
            502
          );
        }
        const updated = findSkill(after, skillName);
        if (!updated || !sameSet(new Set(updated.agents), next)) {
          throw new AppError(
            "assignment_verification_failed",
            "Magpie did not confirm the expected agent associations.",
            502
          );
        }
      }

      const resultOperation = {
        kind: "skill.agents",
        skill: skillName,
        at: nowIso(now)
      };
      lastOperation = resultOperation;
      return buildState({ operation: resultOperation });
    });
  }

  async function handleRequest(request) {
    if (!hostAllowed(request)) {
      return errorResponse(
        request,
        new AppError("invalid_host", "The service only accepts loopback requests.", 403)
      );
    }
    if (!originAllowed(request)) {
      return errorResponse(
        request,
        new AppError("untrusted_origin", "The request origin is not allowed.", 403)
      );
    }

    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") {
      const headers = corsHeaders(request, new Headers());
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Magpie-Page, X-Magpie-Session"
      );
      headers.set("Access-Control-Max-Age", "600");
      return new Response(null, { status: 204, headers });
    }

    if ((method === "GET" || method === "HEAD") && STATIC_ROUTES.has(url.pathname)) {
      const rel = STATIC_ROUTES.get(url.pathname);
      if (pageDir) {
        const file = path.join(pageDir, rel);
        try {
          const body = fs.readFileSync(file);
          const headers = new Headers({
            "Content-Type": STATIC_TYPES[path.extname(file)] || "application/octet-stream",
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer"
          });
          // CSS mask images fetch their SVG under CORS; the page's sandbox
          // gives it an opaque "null" origin even when the URL is local.
          if (request.headers.get("origin") === "null") {
            headers.set("Access-Control-Allow-Origin", "null");
            headers.set("Vary", "Origin");
          }
          return new Response(method === "HEAD" ? null : body, { headers });
        } catch {
          return new Response("not found", { status: 404 });
        }
      }
    }
    const avatar = url.pathname.match(/^\/avatars\/github\/([A-Za-z0-9-]{1,39})\.png$/);
    if ((method === "GET" || method === "HEAD") && avatar) {
      const image = await getAvatar(avatar[1]);
      if (!image) return new Response(null, { status: 404 });
      return new Response(method === "HEAD" ? null : image.body, {
        headers: {
          "Content-Type": image.type,
          "Cache-Control": "private, max-age=86400",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    try {
      pageToken(request);

      if (method === "POST" && url.pathname === "/api/session") {
        await readJsonBody(request);
        const session = createSession(request);
        return jsonResponse(request, { ok: true, ...session });
      }

      if (method === "GET" && url.pathname === "/api/state") {
        if (discovery.snapshot().state === "ready") {
          await discovery.refresh();
        }
        return jsonResponse(request, buildState());
      }

      if (method !== "POST") {
        throw new AppError("method_not_allowed", "Method not allowed.", 405);
      }

      requireSession(request);
      const body = await readJsonBody(request);

      const utility = url.pathname.match(
        /^\/api\/skills\/([^/]+)\/(copy|folder|browse)$/
      );
      if (utility) {
        return jsonResponse(
          request,
          await skillAction(decodeSkillName(utility[1]), utility[2])
        );
      }

      const source = url.pathname.match(/^\/api\/skills\/([^/]+)\/source$/);
      if (source) {
        const name = decodeSkillName(source[1]);
        return jsonResponse(
          request,
          await enqueueWrite(async () => {
            const { skill } = knownSkill(name);
            const webURL = validateWebURL(body.url);
            if (webURL && nativeSourceURL(skill.source)) {
              throw new AppError(
                "native_source_read_only",
                "The official source is read-only; a custom URL is only for missing web origins.",
                409
              );
            }
            const data = loadFeatures(configDir).data;
            if (webURL) data.sources[name] = webURL;
            else delete data.sources[name];
            saveFeatures(configDir, data);
            return buildState();
          })
        );
      }

      if (url.pathname === "/api/projects/choose") {
        return jsonResponse(request, await hostAction({ action: "choose-project", env }));
      }

      if (url.pathname === "/api/projects") {
        return jsonResponse(
          request,
          await enqueueWrite(async () => {
            const data = loadFeatures(configDir).data;
            const library = loadLibrary(configDir);
            if (library.state !== "ok") {
              throw new AppError("library_unavailable", "Magpie's Library is unavailable.", 503);
            }
            const project = addProject(configDir, data, library.projects, body, env);
            return { ...buildState(), createdProjectId: project.id };
          })
        );
      }

      const projectRemove = url.pathname.match(/^\/api\/projects\/([^/]+)\/remove$/);
      if (projectRemove) {
        return jsonResponse(
          request,
          await enqueueWrite(async () => {
            const id = projectRemove[1];
            if (!PROJECT_ID_RE.test(id)) {
              throw new AppError(
                "native_project_read_only",
                "Native projects cannot be removed here.",
                409
              );
            }
            const data = loadFeatures(configDir).data;
            const library = loadLibrary(configDir);
            const project = data.projects.find((item) => item.id === id);
            if (!project) {
              throw new AppError("project_not_found", "That plugin project no longer exists.", 404);
            }
            removeProject(configDir, data, project, library.projects);
            return buildState();
          })
        );
      }

      const projectSkill = url.pathname.match(
        /^\/api\/projects\/([^/]+)\/skills\/([^/]+)\/(agents|all)$/
      );
      if (projectSkill) {
        return jsonResponse(
          request,
          await mutateProject(
            projectSkill[1],
            decodeSkillName(projectSkill[2]),
            body,
            projectSkill[3] === "all"
          )
        );
      }

      if (url.pathname === "/api/discovery/refresh") {
        await discovery.refresh({ force: true });
        return jsonResponse(request, buildState());
      }

      if (url.pathname === "/api/labels") {
        const action = String(body.action || "");
        if (action === "create") {
          return jsonResponse(
            request,
            await mutateMetadata({ kind: "create", name: body.name })
          );
        }
        if (action === "rename") {
          return jsonResponse(
            request,
            await mutateMetadata({
              kind: "rename",
              id: String(body.id || ""),
              name: body.name
            })
          );
        }
        if (action === "delete") {
          return jsonResponse(
            request,
            await mutateMetadata({
              kind: "delete",
              id: String(body.id || "")
            })
          );
        }
        throw new AppError("invalid_action", "Unknown label action.", 400);
      }

      const skillLabels = url.pathname.match(/^\/api\/skills\/([^/]+)\/labels$/);
      if (skillLabels) {
        const skillName = decodeSkillName(skillLabels[1]);
        return jsonResponse(
          request,
          await mutateMetadata({
            kind: "set-skill",
            skillName,
            labelIds: body.labelIds
          })
        );
      }

      const skillAll = url.pathname.match(/^\/api\/skills\/([^/]+)\/agents\/all$/);
      if (skillAll) {
        const skillName = decodeSkillName(skillAll[1]);
        const enabled = body.enabled === true;
        if (body.enabled !== true && body.enabled !== false) {
          throw new AppError("invalid_agent_state", "enabled must be true or false.", 400);
        }
        return jsonResponse(
          request,
          await mutateAssociation(skillName, (current, eligible) => {
            const next = new Set(current);
            for (const id of eligible) {
              if (enabled) next.add(id);
              else next.delete(id);
            }
            return next;
          })
        );
      }

      const skillAgent = url.pathname.match(/^\/api\/skills\/([^/]+)\/agents$/);
      if (skillAgent) {
        const skillName = decodeSkillName(skillAgent[1]);
        const agentId = String(body.agentId || "");
        if (body.enabled !== true && body.enabled !== false) {
          throw new AppError("invalid_agent_state", "enabled must be true or false.", 400);
        }
        return jsonResponse(
          request,
          await mutateAssociation(skillName, (current, eligible) => {
            if (!eligible.has(agentId)) {
              throw new AppError(
                "agent_not_eligible",
                "That agent is not currently installed and eligible on this Windows machine.",
                409
              );
            }
            const next = new Set(current);
            if (body.enabled) next.add(agentId);
            else next.delete(agentId);
            return next;
          })
        );
      }

      throw new AppError("not_found", "Not found.", 404);
    } catch (error) {
      const appError = asAppError(error);
      if (appError.status >= 500) {
        try {
          return errorResponse(request, appError, buildState());
        } catch {
          return errorResponse(request, appError);
        }
      }
      return errorResponse(request, appError);
    }
  }

  // Start discovery in the background so opening the page never waits on
  // a slow agent probe. The page polls while discovery.state is loading.
  void discovery.refresh();

  return {
    fetch: handleRequest,
    buildState,
    discovery,
    enqueueWrite,
    pageCapability
  };
}

let activeServer = null;

export function startSkillsService({
  port = DEFAULT_PORT,
  configDir = process.cwd(),
  env = process.env,
  pluginDir = "",
  pageCapability = "",
  logger = console
} = {}) {
  if (activeServer) return activeServer;
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new AppError("invalid_port", `Invalid Skills Management port: ${port}.`, 500);
  }

  const capability =
    PAGE_TOKEN_RE.test(pageCapability)
      ? pageCapability.toLowerCase()
      : stablePageCapability({
          configDir,
          pluginDir,
          port: parsedPort
        });
  const service = createService({ configDir, env, pluginDir, pageCapability: capability });
  let server;
  try {
    server = Bun.serve({
      hostname: "127.0.0.1",
      port: parsedPort,
      fetch: service.fetch,
      error(error) {
        logger.error(`[skills-manager] request failed: ${errorMessage(error)}`);
        return new Response(
          JSON.stringify({
            ok: false,
            error: { code: "internal_error", message: "The Skills Management service failed." }
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          }
        );
      }
    });
  } catch (error) {
    throw new AppError(
      "port_unavailable",
      `Skills Management could not listen on 127.0.0.1:${parsedPort}: ${errorMessage(error)}`,
      500
    );
  }

  const capabilityFile = pluginDir
    ? path.join(pluginDir, "page", `.service-capability-${parsedPort}.js`)
    : "";
  const capabilityTemp = capabilityFile
    ? `${capabilityFile}.${randomUUID()}.tmp`
    : "";
  if (capabilityFile) {
    try {
      fs.writeFileSync(
        capabilityTemp,
        `window.__skillsManagerCapability = ${JSON.stringify(service.pageCapability)};\n`,
        { encoding: "utf8", mode: 0o600 }
      );
      secureCapabilityFile(capabilityTemp);
      fs.renameSync(capabilityTemp, capabilityFile);
    } catch (error) {
      server.stop(true);
      if (fs.existsSync(capabilityTemp)) fs.unlinkSync(capabilityTemp);
      throw new AppError(
        "capability_publish_failed",
        `Could not publish the protected service capability: ${error.message}`,
        500
      );
    }
  }

  logger.error(`[skills-manager] listening on http://127.0.0.1:${server.port}/`);
  activeServer = {
    server,
    service,
    stop() {
      server.stop(true);
      if (capabilityFile) {
        try {
          fs.unlinkSync(capabilityFile);
        } catch {
          // A stale capability file is harmless after the service stops.
        }
      }
      activeServer = null;
    }
  };
  return activeServer;
}
