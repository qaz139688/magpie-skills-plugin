(() => {
  "use strict";

  const PAGE_TOKEN_RE = /^[0-9a-f]{32}$/i;
  const RETRYABLE_STATUS = new Set([0, 502, 503, 504]);

  const ICON_PATHS = {
    layers:
      '<path d="m12 3 8.5 4.8L12 12.6 3.5 7.8 12 3Z"/><path d="m4.2 12 7.8 4.4 7.8-4.4"/><path d="m4.2 16.2 7.8 4.4 7.8-4.4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh:
      '<path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4v7h-7"/>',
    tag:
      '<path d="M20 13 13 20l-9-9V4h7l9 9Z"/><circle cx="8.2" cy="8.2" r="1"/>',
    edit:
      '<path d="m14.5 5.5 4 4"/><path d="M4 20h4l10.7-10.7a2.8 2.8 0 0 0-4-4L4 16v4Z"/>',
    trash:
      '<path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5M14 11v5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    warning:
      '<path d="M12 4 3.8 19h16.4L12 4Z"/><path d="M12 9v4.5"/><path d="M12 16.7h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v5"/><path d="M12 7.7h.01"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    folder:
      '<path d="M3.5 6.5h6l2 2h9v9.5a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18V6.5Z"/>',
    spark:
      '<path d="M12 3.5 13.5 9l5.5 1.5-5.5 1.5-1.5 5.5-1.5-5.5L5 10.5 10.5 9 12 3.5Z"/>'
  };

  const STRINGS = {
    en: {
      railTitle: "Skills",
      railSubtitle: "Labels and Windows agents",
      allSkills: "All skills",
      untagged: "Untagged",
      labels: "Labels",
      newLabel: "New label",
      refresh: "Refresh",
      searchPlaceholder: "Search name or description",
      loading: "Loading skills",
      noLabels: "No labels yet.",
      allSkillsTitle: "All skills",
      untaggedTitle: "Untagged",
      skillCount: "{count} skills",
      filteredCount: "{shown} of {total} skills",
      skillCountOne: "1 skill",
      filteredCountOne: "{shown} of {total} skill",
      eligibleAgents: "{count} eligible Windows agents",
      eligibleAgentsOne: "1 eligible Windows agent",
      noEligibleAgents: "No eligible Windows agents",
      findingAgents: "Finding installed Windows agents",
      discoveryError: "Agent discovery failed",
      discoveryLoading: "Checking Windows agents",
      discoveryLoadingBody:
        "Skills stay readable while Magpie checks which installed agents can manage skills.",
      discoveryErrorBody:
        "Assignment controls are disabled until Magpie can reliably discover installed Windows agents.",
      discoveryWarning: "Agent catalog warning",
      libraryError: "Library unavailable",
      metadataError: "Label metadata error",
      orphanLinks: "Saved label links",
      orphanLinksBody:
        "{count} saved label links point to skills no longer in the library. They were kept and are not attached to another skill.",
      noSkillsTitle: "No skills in this view",
      noSkillsBody:
        "Install a skill in Magpie's Library, or choose another label. Labels do not change a skill's files.",
      noMatchesTitle: "No matches",
      noMatchesBody: "No skill name or description matches this search in the current view.",
      clearSearch: "Clear search",
      editLabels: "Edit labels",
      noDescription: "No description in SKILL.md.",
      allOn: "All on",
      allOff: "All off",
      mixed: "Mixed",
      unavailable: "Unavailable",
      selectedAgents: "{selected} of {total} selected",
      noAgentsBody: "No installed Windows agent with a Skills integration was discovered.",
      offHere:
        "Off on this computer. Association changes are saved, but Magpie will not give this skill to agents until it is turned on in Library.",
      enableAgent: "Enable {agent} for {skill}",
      disableAgent: "Disable {agent} for {skill}",
      globalOn: "Assign every eligible agent to {skill}",
      globalOff: "Unassign every eligible agent from {skill}",
      busy: "Applying",
      appliedOn: "{skill} is assigned to every eligible agent.",
      appliedOff: "{skill} is unassigned from every eligible agent.",
      agentApplied: "{agent} was updated for {skill}.",
      labelCreateTitle: "New label",
      labelRenameTitle: "Rename label",
      labelCreateNote: "Group skills without changing their files or assignments.",
      labelRenameNote: "The label's saved links stay in place.",
      labelName: "Label name",
      labelNameHint: "Use a short name. Labels are case-insensitive for duplicates.",
      createLabel: "Create label",
      saveLabel: "Save label",
      cancel: "Cancel",
      save: "Save",
      editLabelsTitle: "Edit labels",
      editLabelsNote: "{skill} can have more than one label.",
      noLabelsToChoose: "Create a label first, then attach it here.",
      createFromSheet: "New label",
      saveLabels: "Save labels",
      deleteLabelTitle: "Delete label?",
      deleteLabelBody:
        "Delete {label}? This removes only the classification. Skills and agent assignments stay unchanged.",
      delete: "Delete label",
      confirm: "Delete",
      labelCreated: "Label created.",
      labelRenamed: "Label renamed.",
      labelDeleted: "Label deleted.",
      labelsSaved: "Labels saved.",
      refreshed: "State refreshed.",
      fatalTitle: "Skills Management could not start",
      bridgeMissing:
        "The Magpie page bridge did not load. Reload the page from Magpie's Plugins section.",
      tokenMissing:
        "This page has no Magpie capability token. Open it from the Skills Management tab in Magpie.",
      serviceMissing:
        "The Skills Management service did not answer. Check the Plugins page for a port or load error.",
      serviceExpired: "The local session expired. Reload the page and try again.",
      retry: "Retry",
      footNote:
        "Assignments are applied through Magpie. Shared-folder skills may remain available outside its control.",
      lastChecked: "Checked {time}",
      noDescriptionShort: "No description",
      openInLibrary: "Open Library",
      errorFallback: "Something went wrong.",
      labelNameRequired: "Enter a label name.",
      labelNameDuplicate: "That label already exists.",
      unknownLabel: "Unknown label",
      mixedHint: "Some agents selected",
      allOnHint: "Every eligible agent selected",
      allOffHint: "No eligible agent selected",
      unavailableHint: "No eligible agents discovered"
    },
    zh: {
      railTitle: "技能",
      railSubtitle: "标签与 Windows Agent",
      allSkills: "全部技能",
      untagged: "未分类",
      labels: "标签",
      newLabel: "新建标签",
      refresh: "刷新",
      searchPlaceholder: "搜索名称或描述",
      loading: "正在加载技能",
      noLabels: "还没有标签。",
      allSkillsTitle: "全部技能",
      untaggedTitle: "未分类",
      skillCount: "{count} 个技能",
      filteredCount: "{shown} / {total} 个技能",
      skillCountOne: "1 个技能",
      filteredCountOne: "{shown} / {total} 个技能",
      eligibleAgents: "{count} 个可用 Windows Agent",
      eligibleAgentsOne: "1 个可用 Windows Agent",
      noEligibleAgents: "没有可用的 Windows Agent",
      findingAgents: "正在检测已安装的 Windows Agent",
      discoveryError: "Agent 检测失败",
      discoveryLoading: "正在检测 Windows Agent",
      discoveryLoadingBody:
        "技能列表可以先读取；Magpie 正在确认哪些已安装 Agent 支持 Skills。",
      discoveryErrorBody:
        "在 Magpie 可靠识别已安装 Windows Agent 之前，分配开关会保持禁用。",
      discoveryWarning: "Agent 目录提示",
      libraryError: "Library 不可用",
      metadataError: "标签元数据错误",
      orphanLinks: "保留的标签关联",
      orphanLinksBody:
        "有 {count} 条标签关联指向 Library 中已不存在的技能。记录已保留，不会自动改挂到其他技能。",
      noSkillsTitle: "当前视图没有技能",
      noSkillsBody:
        "先在 Magpie Library 安装技能，或切换另一个标签。标签不会改动技能文件。",
      noMatchesTitle: "没有匹配结果",
      noMatchesBody: "当前视图里没有技能名称或描述匹配这个搜索。",
      clearSearch: "清除搜索",
      editLabels: "编辑标签",
      noDescription: "SKILL.md 没有描述。",
      allOn: "全开",
      allOff: "全关",
      mixed: "混合",
      unavailable: "不可用",
      selectedAgents: "已选 {selected} / {total}",
      noAgentsBody: "没有发现已安装且支持 Skills 的 Windows Agent。",
      offHere:
        "此技能在本机被关闭。关联修改会保存，但在 Library 中重新开启前，Magpie 不会把它交给 Agent。",
      enableAgent: "为 {skill} 启用 {agent}",
      disableAgent: "为 {skill} 禁用 {agent}",
      globalOn: "为 {skill} 开启全部可用 Agent",
      globalOff: "为 {skill} 关闭全部可用 Agent",
      busy: "正在应用",
      appliedOn: "{skill} 已分配给全部可用 Agent。",
      appliedOff: "{skill} 已从全部可用 Agent 取消分配。",
      agentApplied: "{skill} 的 {agent} 状态已更新。",
      labelCreateTitle: "新建标签",
      labelRenameTitle: "重命名标签",
      labelCreateNote: "给技能分组，不改技能文件，也不改 Agent 分配。",
      labelRenameNote: "标签已有的技能关联会保留。",
      labelName: "标签名称",
      labelNameHint: "用简短名称。名称只差大小写或首尾空格会被视为重复。",
      createLabel: "创建标签",
      saveLabel: "保存标签",
      cancel: "取消",
      save: "保存",
      editLabelsTitle: "编辑标签",
      editLabelsNote: "{skill} 可以有多个标签。",
      noLabelsToChoose: "先创建一个标签，再回到这里关联。",
      createFromSheet: "新建标签",
      saveLabels: "保存标签",
      deleteLabelTitle: "删除标签？",
      deleteLabelBody:
        "删除 {label}？只会移除分类关系，技能内容和 Agent 分配都不会改变。",
      delete: "删除标签",
      confirm: "删除",
      labelCreated: "标签已创建。",
      labelRenamed: "标签已重命名。",
      labelDeleted: "标签已删除。",
      labelsSaved: "标签已保存。",
      refreshed: "状态已刷新。",
      fatalTitle: "技能管理无法启动",
      bridgeMissing: "Magpie 页面桥接没有加载。请从 Plugins 里重新打开这个页面。",
      tokenMissing: "这个页面没有 Magpie 能力令牌。请从 Magpie 的技能管理标签页打开。",
      serviceMissing: "技能管理本地服务没有响应。请检查 Plugins 页里的端口或加载错误。",
      serviceExpired: "本地会话已过期。重新加载页面后再试。",
      retry: "重试",
      footNote:
        "分配操作通过 Magpie 执行。共享目录里的技能可能不受这里开关的完全控制。",
      lastChecked: "检查于 {time}",
      noDescriptionShort: "没有描述",
      openInLibrary: "打开 Library",
      errorFallback: "操作失败。",
      labelNameRequired: "请输入标签名称。",
      labelNameDuplicate: "这个标签已经存在。",
      unknownLabel: "未知标签",
      mixedHint: "部分 Agent 已选",
      allOnHint: "全部可用 Agent 已选",
      allOffHint: "没有选中可用 Agent",
      unavailableHint: "没有发现可用 Agent"
    }
  };

  const state = {
    data: null,
    filter: { kind: "all", labelId: null },
    query: "",
    loading: true,
    fatal: "",
    busySkill: "",
    refreshing: false,
    rowErrors: new Map(),
    lang: "en",
    pageToken: "",
    session: "",
    sessionExpiresAt: 0,
    pollTimer: 0,
    toastTimer: 0,
    labelMode: "create",
    labelId: "",
    labelSkill: "",
    returnToSkillLabels: false,
    deleteLabelId: ""
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function t(key, values = {}) {
    const dictionary = STRINGS[state.lang] || STRINGS.en;
    const template = dictionary[key] ?? STRINGS.en[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${name}}`
    );
  }

  function icon(name) {
    return `<span class="icon-slot" aria-hidden="true"><svg viewBox="0 0 24 24">${
      ICON_PATHS[name] || ICON_PATHS.info
    }</svg></span>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
  }

  function countText(total, shown = total) {
    if (state.query.trim() || state.filter.kind !== "all") {
      return t(total === 1 ? "filteredCountOne" : "filteredCount", {
        shown,
        total
      });
    }
    return t(total === 1 ? "skillCountOne" : "skillCount", { count: total });
  }

  function setIcon(element, name) {
    if (!element) return;
    element.innerHTML = icon(name);
  }

  function renderStaticIcons() {
    setIcon($("#rail-mark"), "layers");
    setIcon($("#new-label .icon-slot"), "plus");
    setIcon($("#refresh-rail .icon-slot"), "refresh");
    setIcon($("#refresh-top .icon-slot"), "refresh");
    setIcon($(".search-icon"), "search");
    setIcon($("#create-label-from-sheet .icon-slot"), "plus");
  }

  function applyStaticText() {
    document.title = t("railTitle");
    $("#app-title").textContent = t("railTitle");
    $("#app-subtitle").textContent = t("railSubtitle");
    $("#labels-heading").textContent = t("labels");
    $("#new-label").setAttribute("aria-label", t("newLabel"));
    $("#new-label").setAttribute("title", t("newLabel"));
    $("#refresh-rail-label").textContent = t("refresh");
    $("#refresh-top-label").textContent = t("refresh");
    $("#search").placeholder = t("searchPlaceholder");
    $("#foot-note").textContent = t("footNote");
    $("#label-cancel").textContent = t("cancel");
    $("#skill-labels-cancel").textContent = t("cancel");
    $("#confirm-cancel").textContent = t("cancel");
    $("#label-name-label").textContent = t("labelName");
    $("#label-name-hint").textContent = t("labelNameHint");
    $("#create-label-from-sheet-label").textContent = t("createFromSheet");
    $("#skill-labels-save").textContent = t("saveLabels");
    $("#confirm-delete").textContent = t("delete");
  }

  function decodeBase64Utf8(value) {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function parseBootHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    let tokens = {};
    const encoded = params.get("tokens");
    if (encoded) {
      try {
        const parsed = JSON.parse(decodeBase64Utf8(encoded));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) tokens = parsed;
      } catch {
        tokens = {};
      }
    }
    return {
      page: params.get("page") || "",
      theme: params.get("theme") === "dark" ? "dark" : "light",
      lang: params.get("lang") || "",
      tokens
    };
  }

  function applyBootTheme(boot) {
    state.lang = /^zh/i.test(boot?.lang || "") ? "zh" : "en";
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.theme = boot?.theme === "dark" ? "dark" : "light";
    document.documentElement.style.colorScheme = boot?.theme === "dark" ? "dark" : "light";
    for (const [key, value] of Object.entries(boot?.tokens || {})) {
      if (value != null && String(value).trim()) {
        document.documentElement.style.setProperty(`--magpie-${key}`, String(value));
      }
    }
    applyStaticText();
    if (state.data) renderAll();
  }

  function skeletonRows(count = 4) {
    return Array.from(
      { length: count },
      () => `
        <div class="skeleton-row" aria-hidden="true">
          <div>
            <div class="skeleton-line title"></div>
            <div class="skeleton-line body"></div>
            <div><span class="skeleton-chip"></span><span class="skeleton-chip"></span></div>
          </div>
          <div>
            <div class="skeleton-toggle"></div>
            <div class="skeleton-toggle"></div>
          </div>
        </div>`
    ).join("");
  }

  function renderLoading() {
    state.loading = true;
    $("#skill-list").setAttribute("aria-busy", "true");
    $("#skill-list").innerHTML = skeletonRows();
    $("#view-nav").innerHTML = `
      <div class="nav-row"><div class="nav-button"><span class="skeleton-line short" style="width:100%"></span></div></div>
      <div class="nav-row"><div class="nav-button"><span class="skeleton-line short" style="width:78%"></span></div></div>`;
    $("#label-nav").innerHTML = "";
    $("#rail-status").textContent = t("loading");
    $("#view-title").textContent = t("allSkillsTitle");
    $("#view-count").textContent = t("loading");
    $("#foot-meta").textContent = "";
  }

  function renderFatal(message) {
    state.fatal = message || t("serviceMissing");
    state.loading = false;
    const shell = $("#app-shell");
    if (!shell) return;
    shell.innerHTML = `
      <div class="fatal">
        <div class="fatal-card">
          <h1>${escapeHtml(t("fatalTitle"))}</h1>
          <p>${escapeHtml(state.fatal)}</p>
        </div>
      </div>`;
  }

  function navRow({ kind, label, iconName, count, labelId = "", actions = "" }) {
    const active =
      state.filter.kind === kind &&
      (kind !== "label" || state.filter.labelId === labelId);
    return `
      <div class="nav-row">
        <button class="nav-button" type="button" data-filter-kind="${escapeAttr(kind)}"${
          labelId ? ` data-filter-label="${escapeAttr(labelId)}"` : ""
        } aria-current="${active ? "true" : "false"}">
          ${icon(iconName)}
          <span class="nav-label">${escapeHtml(label)}</span>
          <span class="nav-count">${escapeHtml(String(count ?? ""))}</span>
        </button>
        ${actions}
      </div>`;
  }

  function renderRail() {
    const data = state.data;
    if (!data) {
      renderLoading();
      return;
    }
    const labels = data.labels || [];
    const canLabel = Boolean(data.capabilities?.canLabel);
    $("#new-label").disabled = !canLabel || state.refreshing;
    $("#view-nav").innerHTML = [
      navRow({
        kind: "all",
        label: t("allSkills"),
        iconName: "layers",
        count: data.summary?.skillCount ?? 0
      }),
      navRow({
        kind: "untagged",
        label: t("untagged"),
        iconName: "folder",
        count: data.summary?.untaggedCount ?? 0
      })
    ].join("");

    $("#label-nav").innerHTML = labels.length
      ? labels
          .map((label) => {
            const actions = `
              <span class="nav-actions">
                <button class="icon-button" type="button" data-action="rename-label" data-label-id="${escapeAttr(
                  label.id
                )}" aria-label="${escapeAttr(t("labelRenameTitle"))}" title="${escapeAttr(
                  t("labelRenameTitle")
                )}"${canLabel ? "" : " disabled"}>${icon("edit")}</button>
                <button class="icon-button" type="button" data-action="delete-label" data-label-id="${escapeAttr(
                  label.id
                )}" aria-label="${escapeAttr(t("deleteLabelTitle"))}" title="${escapeAttr(
                  t("deleteLabelTitle")
                )}"${canLabel ? "" : " disabled"}>${icon("trash")}</button>
              </span>`;
            return navRow({
              kind: "label",
              label: label.name,
              iconName: "tag",
              count: label.count,
              labelId: label.id,
              actions
            });
          })
          .join("")
      : `<div class="rail-status">${escapeHtml(t("noLabels"))}</div>`;

    const discovery = data.discovery || {};
    let status = t("findingAgents");
    if (discovery.state === "ready") {
      status = t(
        (data.agents?.length || 0) === 1 ? "eligibleAgentsOne" : "eligibleAgents",
        { count: data.agents?.length || 0 }
      );
    } else if (discovery.state === "error") {
      status = t("discoveryError");
    }
    $("#rail-status").textContent = status;
  }

  function currentViewTitle() {
    if (state.filter.kind === "untagged") return t("untaggedTitle");
    if (state.filter.kind === "label") {
      const label = state.data?.labels?.find((item) => item.id === state.filter.labelId);
      return label?.name || t("allSkillsTitle");
    }
    return t("allSkillsTitle");
  }

  function filteredSkills() {
    if (!state.data) return [];
    const query = state.query.trim().toLocaleLowerCase();
    return state.data.skills.filter((skill) => {
      if (state.filter.kind === "untagged" && skill.labels.length) return false;
      if (state.filter.kind === "label" && !skill.labels.includes(state.filter.labelId)) {
        return false;
      }
      if (!query) return true;
      return `${skill.name}\n${skill.description}`.toLocaleLowerCase().includes(query);
    });
  }

  function renderHeader() {
    if (!state.data) return;
    const total = state.data.skills.length;
    const shown = filteredSkills().length;
    $("#view-title").textContent = currentViewTitle();
    $("#view-count").textContent = countText(total, shown);
  }

  function banner(kind, title, body, action = "") {
    const iconName = kind === "error" ? "warning" : kind === "warn" ? "warning" : "info";
    return `
      <div class="banner banner-${kind}">
        ${icon(iconName)}
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(body)}</p>
        </div>
        ${action}
      </div>`;
  }

  function renderBanners() {
    const data = state.data;
    if (!data) {
      $("#banners").innerHTML = "";
      return;
    }
    const banners = [];
    if (data.library.state === "error") {
      banners.push(banner("error", t("libraryError"), data.library.error || t("errorFallback")));
    }
    if (data.metadata.state === "error") {
      banners.push(banner("error", t("metadataError"), data.metadata.error || t("errorFallback")));
    }
    if (data.metadata.orphanLinkCount > 0) {
      banners.push(
        banner(
          "info",
          t("orphanLinks"),
          t("orphanLinksBody", { count: data.metadata.orphanLinkCount })
        )
      );
    }
    if (data.discovery.state === "loading") {
      banners.push(
        banner(
          "info",
          t("discoveryLoading"),
          t("discoveryLoadingBody"),
          `<span class="spinner banner-action" aria-label="${escapeAttr(t("busy"))}"></span>`
        )
      );
    } else if (data.discovery.state === "error") {
      banners.push(
        banner(
          "error",
          t("discoveryError"),
          data.discovery.error || t("discoveryErrorBody"),
          `<button class="quiet-button banner-action" type="button" data-action="retry-discovery">${escapeHtml(
            t("retry")
          )}</button>`
        )
      );
    } else if (!data.agents.length) {
      banners.push(banner("warn", t("noEligibleAgents"), t("noAgentsBody")));
    }
    if (data.discovery.warnings?.length) {
      banners.push(
        banner("warn", t("discoveryWarning"), data.discovery.warnings.slice(0, 4).join(" "))
      );
    }
    $("#banners").innerHTML = banners.join("");
  }

  function labelName(id) {
    return state.data?.labels?.find((label) => label.id === id)?.name || t("unknownLabel");
  }

  function aggregate(skill) {
    const agents = state.data?.agents || [];
    const assigned = new Set(skill.assignedAgents || []);
    const selected = agents.filter((agent) => assigned.has(agent.id));
    if (!agents.length) {
      return { key: "unavailable", selected: 0, total: 0 };
    }
    if (selected.length === agents.length) {
      return { key: "on", selected: selected.length, total: agents.length };
    }
    if (selected.length === 0) {
      return { key: "off", selected: 0, total: agents.length };
    }
    return { key: "mixed", selected: selected.length, total: agents.length };
  }

  function aggregateCopy(value) {
    if (value.key === "on") {
      return { label: t("allOn"), hint: t("allOnHint") };
    }
    if (value.key === "off") {
      return { label: t("allOff"), hint: t("allOffHint") };
    }
    if (value.key === "mixed") {
      return { label: t("mixed"), hint: t("mixedHint") };
    }
    return { label: t("unavailable"), hint: t("unavailableHint") };
  }

  function renderAgentChips(skill, disabled) {
    const assigned = new Set(skill.assignedAgents || []);
    if (!state.data.agents.length) {
      return `<div class="no-agents">${icon("warning")}<span>${escapeHtml(
        t("noAgentsBody")
      )}</span></div>`;
    }
    const showNames = state.data.agents.length <= 6;
    const groupLabel = t(
      state.data.agents.length === 1 ? "eligibleAgentsOne" : "eligibleAgents",
      { count: state.data.agents.length }
    );
    return `<div class="agent-list" role="group" aria-label="${escapeAttr(groupLabel)}">${state.data.agents
      .map((agent) => {
        const on = assigned.has(agent.id);
        const label = t(on ? "disableAgent" : "enableAgent", {
          agent: agent.name,
          skill: skill.name
        });
        return `<button class="agent-chip${showNames ? "" : " icon-only"}" type="button" data-action="toggle-agent" data-skill="${escapeAttr(
          skill.name
        )}" data-agent-id="${escapeAttr(agent.id)}" data-enabled="${on ? "false" : "true"}" aria-pressed="${
          on ? "true" : "false"
        }" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}"${
          disabled ? " disabled" : ""
        }><span class="monogram">${escapeHtml(agent.initials || "?")}</span>${
          showNames ? `<span class="agent-name">${escapeHtml(agent.name)}</span>` : ""
        }</button>`;
      })
      .join("")}</div>`;
  }

  function renderSkillRow(skill) {
    const data = state.data;
    const busy = state.busySkill === skill.name;
    const disabled = busy || !data.capabilities.canAssign;
    const value = aggregate(skill);
    const copy = aggregateCopy(value);
    const chips = skill.labels
      .map(
        (id) =>
          `<button class="label-chip" type="button" data-action="filter-label" data-label-id="${escapeAttr(
            id
          )}">${escapeHtml(labelName(id))}</button>`
      )
      .join("");
    const description = skill.description || t("noDescription");
    const source = skill.sourceLabel
      ? `<span class="source-pill" title="${escapeAttr(skill.sourceLabel)}">${escapeHtml(
          skill.sourceLabel
        )}</span>`
      : "";
    const warning = skill.offHere
      ? `<div class="inline-warning">${icon("warning")}<span>${escapeHtml(
          t("offHere")
        )}</span></div>`
      : "";
    const rowError = state.rowErrors.get(skill.name);
    const error = rowError
      ? `<div class="row-error">${icon("warning")}<span>${escapeHtml(rowError)}</span></div>`
      : "";
    const busyMark = busy
      ? `<span class="spinner" aria-label="${escapeAttr(t("busy"))}"></span>`
      : "";
    const selectedText = t("selectedAgents", {
      selected: value.selected,
      total: value.total
    });

    return `
      <article class="skill-row${busy ? " is-busy" : ""}" data-skill-row="${escapeAttr(skill.name)}">
        <div class="skill-main">
          <div class="skill-title-line">
            <h3>${escapeHtml(skill.name)}</h3>
            ${source}
            ${busyMark}
          </div>
          <p class="skill-description">${escapeHtml(description)}</p>
          <div class="skill-labels">
            ${chips}
            <button class="edit-labels-button" type="button" data-action="edit-labels" data-skill="${escapeAttr(
              skill.name
            )}"${busy || !data.capabilities.canLabel ? " disabled" : ""}>${escapeHtml(
              t("editLabels")
            )}</button>
          </div>
          ${warning}
          ${error}
        </div>
        <div class="skill-controls">
          <div class="aggregate">
            <div class="aggregate-copy">
              <span class="aggregate-state">${escapeHtml(copy.label)}</span>
              <span class="aggregate-note">${escapeHtml(
                value.total ? selectedText : copy.hint
              )}</span>
            </div>
            <div class="segmented" role="group" aria-label="${escapeAttr(
              t("globalOn", { skill: skill.name })
            )}">
              <button type="button" data-action="global" data-skill="${escapeAttr(
                skill.name
              )}" data-enabled="true" aria-pressed="${value.key === "on" ? "true" : "false"}" aria-label="${escapeAttr(
                t("globalOn", { skill: skill.name })
              )}"${disabled ? " disabled" : ""}>${escapeHtml(t("allOn"))}</button>
              <button type="button" data-action="global" data-skill="${escapeAttr(
                skill.name
              )}" data-enabled="false" aria-pressed="${
                value.key === "off" ? "true" : "false"
              }" aria-label="${escapeAttr(
                t("globalOff", { skill: skill.name })
              )}"${disabled ? " disabled" : ""}>${escapeHtml(t("allOff"))}</button>
            </div>
          </div>
          ${renderAgentChips(skill, disabled)}
        </div>
      </article>`;
  }

  function renderList() {
    if (state.fatal) {
      renderFatal(state.fatal);
      return;
    }
    if (state.loading && !state.data) {
      renderLoading();
      return;
    }
    const list = $("#skill-list");
    list.setAttribute("aria-busy", "false");
    const data = state.data;
    if (!data) {
      list.innerHTML = "";
      return;
    }
    if (data.library.state === "error") {
      list.innerHTML = `
        <div class="empty-state">
          <div>
            <div class="empty-icon">${icon("warning")}</div>
            <h3>${escapeHtml(t("libraryError"))}</h3>
            <p>${escapeHtml(data.library.error || t("errorFallback"))}</p>
            <button class="quiet-button" type="button" data-action="refresh">${escapeHtml(
              t("retry")
            )}</button>
          </div>
        </div>`;
      return;
    }
    const skills = filteredSkills();
    if (!skills.length) {
      const searching = Boolean(state.query.trim());
      list.innerHTML = `
        <div class="empty-state">
          <div>
            <div class="empty-icon">${icon(searching ? "search" : "layers")}</div>
            <h3>${escapeHtml(searching ? t("noMatchesTitle") : t("noSkillsTitle"))}</h3>
            <p>${escapeHtml(searching ? t("noMatchesBody") : t("noSkillsBody"))}</p>
            ${
              searching
                ? `<button class="quiet-button" type="button" data-action="clear-search">${escapeHtml(
                    t("clearSearch")
                  )}</button>`
                : ""
            }
          </div>
        </div>`;
      return;
    }
    list.innerHTML = skills.map(renderSkillRow).join("");
  }

  function formatChecked(epoch) {
    if (!epoch) return "";
    try {
      return new Intl.DateTimeFormat(state.lang === "zh" ? "zh-CN" : "en", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(epoch));
    } catch {
      return "";
    }
  }

  function renderFooter() {
    const checked = formatChecked(state.data?.discovery?.checkedAt);
    $("#foot-meta").textContent = checked
      ? t("lastChecked", { time: checked })
      : "";
  }

  function renderAll() {
    if (state.fatal) {
      renderFatal(state.fatal);
      return;
    }
    renderRail();
    renderHeader();
    renderBanners();
    renderList();
    renderFooter();
    const disabled = state.refreshing || state.loading;
    for (const button of $$('[data-action="refresh"]')) button.disabled = disabled;
  }

  function setData(data) {
    state.data = data;
    state.loading = false;
    state.rowErrors.clear();
    if (
      state.filter.kind === "label" &&
      !data.labels.some((label) => label.id === state.filter.labelId)
    ) {
      state.filter = { kind: "all", labelId: null };
    }
    renderAll();
    schedulePoll();
  }

  function setFilter(kind, labelId = null) {
    state.filter = { kind, labelId };
    renderAll();
  }

  function showToast(message, kind = "info") {
    const toast = $("#toast");
    if (!toast) return;
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", kind === "error");
    toast.classList.add("is-visible");
    state.toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3200);
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    try {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } catch {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function serviceUrl(path) {
    return new URL(path.replace(/^\/+/, ""), location.href).href;
  }

  async function fetchJson(url, options = {}, timeoutMs = 120_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok || body?.ok === false) {
        const error = new Error(
          body?.error?.message || `${response.status} ${response.statusText || t("errorFallback")}`
        );
        error.status = response.status;
        error.code = body?.error?.code || "";
        error.state = body?.state;
        throw error;
      }
      return body;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error(t("serviceMissing"));
        timeoutError.status = 0;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function ensureSession(force = false) {
    if (!force && state.session && state.sessionExpiresAt > Date.now() + 5000) {
      return state.session;
    }
    const body = await fetchJson(
      serviceUrl("api/session"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Magpie-Page": state.pageToken
        },
        body: "{}"
      },
      15_000
    );
    state.session = body.token;
    state.sessionExpiresAt = body.expiresAt;
    return state.session;
  }

  async function api(path, { method = "GET", body = null, retry = true } = {}) {
    const headers = { "X-Magpie-Page": state.pageToken };
    let payload;
    if (method !== "GET") {
      headers["X-Magpie-Session"] = await ensureSession();
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body ?? {});
    }
    try {
      return await fetchJson(serviceUrl(path), {
        method,
        headers,
        body: payload
      });
    } catch (error) {
      if (error.status === 401 && retry) {
        state.session = "";
        state.sessionExpiresAt = 0;
        return api(path, { method, body, retry: false });
      }
      throw error;
    }
  }

  function retryable(error) {
    return (
      error.status === undefined ||
      error.status === 0 ||
      RETRYABLE_STATUS.has(error.status)
    );
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadInitial() {
    renderLoading();
    let lastError = null;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      try {
        await ensureSession();
        const data = await api("api/state", { retry: false });
        setData(data);
        return;
      } catch (error) {
        lastError = error;
        if (!retryable(error) || attempt === 8) break;
        await delay(650 + attempt * 250);
      }
    }
    state.loading = false;
    renderFatal(
      lastError?.status === undefined
        ? t("serviceMissing")
        : lastError?.message || t("serviceMissing")
    );
  }

  async function refreshState(force = false) {
    if (state.refreshing) return;
    state.refreshing = true;
    renderAll();
    try {
      const data = force
        ? await api("api/discovery/refresh", { method: "POST", body: {} })
        : await api("api/state");
      setData(data);
      if (force) showToast(t("refreshed"));
    } catch (error) {
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.refreshing = false;
      renderAll();
    }
  }

  function schedulePoll() {
    clearTimeout(state.pollTimer);
    if (state.data?.discovery?.state === "loading" && !document.hidden) {
      state.pollTimer = setTimeout(() => {
        refreshState(false);
      }, 1200);
    }
  }

  async function mutateGlobal(skillName, enabled) {
    if (state.busySkill) return;
    state.busySkill = skillName;
    state.rowErrors.delete(skillName);
    renderAll();
    try {
      const data = await api(
        `api/skills/${encodeURIComponent(skillName)}/agents/all`,
        { method: "POST", body: { enabled } }
      );
      setData(data);
      showToast(t(enabled ? "appliedOn" : "appliedOff", { skill: skillName }));
    } catch (error) {
      if (error.state) setData(error.state);
      state.rowErrors.set(skillName, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.busySkill = "";
      renderAll();
    }
  }

  async function mutateAgent(skillName, agentId, enabled) {
    if (state.busySkill) return;
    state.busySkill = skillName;
    state.rowErrors.delete(skillName);
    renderAll();
    try {
      const data = await api(
        `api/skills/${encodeURIComponent(skillName)}/agents`,
        { method: "POST", body: { agentId, enabled } }
      );
      setData(data);
      const agent = state.data.agents.find((item) => item.id === agentId);
      showToast(
        t("agentApplied", {
          agent: agent?.name || agentId,
          skill: skillName
        })
      );
    } catch (error) {
      if (error.state) setData(error.state);
      state.rowErrors.set(skillName, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.busySkill = "";
      renderAll();
    }
  }

  function openLabelDialog(mode = "create", label = null, returnToSkillLabels = false) {
    if (!state.data?.capabilities?.canLabel) return;
    state.labelMode = mode;
    state.labelId = label?.id || "";
    state.returnToSkillLabels = returnToSkillLabels;
    $("#label-dialog-title").textContent =
      mode === "rename" ? t("labelRenameTitle") : t("labelCreateTitle");
    $("#label-dialog-note").textContent =
      mode === "rename" ? t("labelRenameNote") : t("labelCreateNote");
    $("#label-name-input").value = label?.name || "";
    $("#label-save").textContent = mode === "rename" ? t("saveLabel") : t("createLabel");
    $("#label-form-error").textContent = "";
    openDialog("label-dialog");
    requestAnimationFrame(() => $("#label-name-input").focus());
  }

  async function submitLabelForm(event) {
    event?.preventDefault?.();
    const name = $("#label-name-input").value.trim();
    if (!name) {
      $("#label-form-error").textContent = t("labelNameRequired");
      return;
    }
    const save = $("#label-save");
    save.disabled = true;
    $("#label-form-error").textContent = "";
    try {
      const action = state.labelMode === "rename" ? "rename" : "create";
      const data = await api("api/labels", {
        method: "POST",
        body:
          action === "rename"
            ? { action, id: state.labelId, name }
            : { action, name }
      });
      setData(data);
      closeDialog("label-dialog");
      showToast(t(action === "rename" ? "labelRenamed" : "labelCreated"));
      if (state.returnToSkillLabels && state.labelSkill) {
        const skill = state.data.skills.find((item) => item.name === state.labelSkill);
        if (skill) openSkillLabels(state.labelSkill);
      }
    } catch (error) {
      $("#label-form-error").textContent = error.message || t("errorFallback");
    } finally {
      save.disabled = false;
    }
  }

  function openSkillLabels(skillName) {
    if (!state.data?.capabilities?.canLabel) return;
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    if (!skill) return;
    state.labelSkill = skillName;
    state.returnToSkillLabels = false;
    $("#skill-labels-title").textContent = t("editLabelsTitle");
    $("#skill-labels-note").textContent = t("editLabelsNote", { skill: skillName });
    $("#skill-labels-error").textContent = "";
    const selected = new Set(skill.labels);
    const labels = state.data.labels;
    $("#skill-label-options").innerHTML = labels.length
      ? labels
          .map(
            (label) => `
              <label class="check-row">
                <input type="checkbox" value="${escapeAttr(label.id)}"${
                  selected.has(label.id) ? " checked" : ""
                }>
                <span>${escapeHtml(label.name)}</span>
                <small>${escapeHtml(String(label.count))}</small>
              </label>`
          )
          .join("")
      : `<div class="check-empty">${escapeHtml(t("noLabelsToChoose"))}</div>`;
    openDialog("skill-labels-dialog");
  }

  async function submitSkillLabels(event) {
    event?.preventDefault?.();
    const labelIds = $$("#skill-label-options input:checked").map((input) => input.value);
    const save = $("#skill-labels-save");
    save.disabled = true;
    $("#skill-labels-error").textContent = "";
    try {
      const data = await api(
        `api/skills/${encodeURIComponent(state.labelSkill)}/labels`,
        { method: "POST", body: { labelIds } }
      );
      setData(data);
      closeDialog("skill-labels-dialog");
      showToast(t("labelsSaved"));
    } catch (error) {
      $("#skill-labels-error").textContent = error.message || t("errorFallback");
    } finally {
      save.disabled = false;
    }
  }

  function openConfirm(labelId) {
    if (!state.data?.capabilities?.canLabel) return;
    const label = state.data?.labels?.find((item) => item.id === labelId);
    if (!label) return;
    state.deleteLabelId = labelId;
    $("#confirm-title").textContent = t("deleteLabelTitle");
    $("#confirm-note").textContent = "";
    $("#confirm-copy").textContent = t("deleteLabelBody", { label: label.name });
    openDialog("confirm-dialog");
  }

  async function submitConfirm(event) {
    event?.preventDefault?.();
    if (!state.deleteLabelId) return;
    const button = $("#confirm-delete");
    button.disabled = true;
    try {
      const data = await api("api/labels", {
        method: "POST",
        body: { action: "delete", id: state.deleteLabelId }
      });
      setData(data);
      closeDialog("confirm-dialog");
      state.deleteLabelId = "";
      showToast(t("labelDeleted"));
    } catch (error) {
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      button.disabled = false;
    }
  }

  function handleAction(element) {
    const action = element.dataset.action;
    if (action === "refresh") {
      refreshState(true);
      return;
    }
    if (action === "retry-discovery") {
      refreshState(true);
      return;
    }
    if (action === "edit-labels") {
      openSkillLabels(element.dataset.skill);
      return;
    }
    if (action === "new-label") {
      openLabelDialog("create");
      return;
    }
    if (action === "rename-label") {
      const label = state.data?.labels?.find((item) => item.id === element.dataset.labelId);
      if (label) openLabelDialog("rename", label);
      return;
    }
    if (action === "delete-label") {
      openConfirm(element.dataset.labelId);
      return;
    }
    if (action === "filter-label") {
      setFilter("label", element.dataset.labelId);
      return;
    }
    if (action === "global") {
      mutateGlobal(element.dataset.skill, element.dataset.enabled === "true");
      return;
    }
    if (action === "toggle-agent") {
      mutateAgent(
        element.dataset.skill,
        element.dataset.agentId,
        element.dataset.enabled === "true"
      );
      return;
    }
    if (action === "clear-search") {
      state.query = "";
      $("#search").value = "";
      renderAll();
    }
  }

  function wireEvents() {
    document.addEventListener("click", (event) => {
      const close = event.target.closest("[data-close]");
      if (close) {
        closeDialog(close.dataset.close);
        return;
      }
      const action = event.target.closest("[data-action]");
      if (action) {
        event.preventDefault();
        handleAction(action);
        return;
      }
      const filter = event.target.closest("[data-filter-kind]");
      if (filter) {
        setFilter(filter.dataset.filterKind, filter.dataset.filterLabel || null);
      }
    });

    $("#new-label").addEventListener("click", () => openLabelDialog("create"));
    $("#search").addEventListener("input", (event) => {
      state.query = event.target.value;
      renderHeader();
      renderList();
    });
    $("#label-save").addEventListener("click", submitLabelForm);
    $("#skill-labels-save").addEventListener("click", submitSkillLabels);
    $("#confirm-delete").addEventListener("click", submitConfirm);
    $("#label-name-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitLabelForm(event);
      }
    });
    $("#create-label-from-sheet").addEventListener("click", () => {
      closeDialog("skill-labels-dialog");
      openLabelDialog("create", null, true);
    });

    for (const dialog of $$("dialog")) {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        $("#search").focus();
      }
      if (event.key === "Escape" && document.activeElement === $("#search")) {
        state.query = "";
        $("#search").value = "";
        renderAll();
        $("#search").blur();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        if (state.data?.discovery?.state === "loading") refreshState(false);
        else schedulePoll();
      }
    });
  }

  async function bootstrap() {
    const boot = parseBootHash();
    applyBootTheme(boot);
    renderStaticIcons();
    state.pageToken = boot.page;
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      // The fragment is not sent to the service; leave it if the sandbox
      // refuses history changes.
    }
    if (!PAGE_TOKEN_RE.test(state.pageToken)) {
      renderFatal(t("tokenMissing"));
      return;
    }

    wireEvents();
    await loadInitial();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
