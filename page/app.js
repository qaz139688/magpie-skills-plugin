(() => {
  "use strict";

  const PAGE_TOKEN_RE = /^[0-9a-f]{64}$/i;
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
    copy:
      '<rect x="8" y="8" width="10" height="11" rx="1.5"/><path d="M6 15H5.5A1.5 1.5 0 0 1 4 13.5v-9A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5V5"/>',
    "folder-open":
      '<path d="M3.5 7.5h6l2 2h8.5"/><path d="M4.2 19h14.6l1.7-7.5H5.9L4.2 19Z"/>',
    external:
      '<path d="M14 4h6v6"/><path d="m20 4-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    project:
      '<path d="M3.5 6.5h6l2 2h9v9.5a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18V6.5Z"/><path d="M8 13h8M12 10v6"/>',
    link:
      '<path d="M10 13.5a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7-.1l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    globe:
      '<circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.2 3.2 8.5s-1.1 6.2-3.2 8.5c-2.1-2.3-3.2-5.2-3.2-8.5S9.9 5.8 12 3.5Z"/>',
    remove:
      '<path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/>',
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
      projects: "Projects",
      addProject: "Add project",
      noProjects: "No projects yet.",
      projectCount: "{count} skills",
      projectCountOne: "1 skill",
      nativeProject: "Magpie project",
      pluginProject: "Plugin project",
      projectReadOnly: "Read-only here",
      projectContext: "Project skills",
      projectPath: "Folder: {path}",
      projectReadOnlyHint:
        "This project view is read-only. Use a skill's Add to project menu to add skills.",
      projectSharedHint:
        "Agents sharing a project skill folder may read the same placement.",
      projectWarnings: "Project needs attention",
      projectAddTitle: "Add project",
      projectAddNote: "Choose a local folder for project-specific skills.",
      projectName: "Project name",
      projectPathLabel: "Project folder",
      chooseFolder: "Choose folder",
      projectHint:
        "Adding a plugin project creates only its own Junctions. Native project settings stay untouched until you add a skill from a skill menu.",
      projectAdded: "Project added.",
      projectRemoved: "Project removed.",
      projectRemoveTitle: "Remove project?",
      projectRemoveBody:
        "Remove {name}? Only Junctions owned by this plugin are removed. The folder, skills, and Magpie projects stay untouched.",
      removeProject: "Remove project",
      projectNameRequired: "Choose a project folder.",
      projectSave: "Add project",
      projectNoAgents: "No installed agent supports project skills.",
      projectAgentEnable: "Add {agent} to {skill} in {project}",
      projectAgentDisable: "Remove {agent} from {skill} in {project}",
      projectAllOn: "Add every eligible agent to {skill} in {project}",
      projectAllOff: "Remove every eligible agent from {skill} in {project}",
      projectAppliedOn: "{skill} is added to every eligible project agent.",
      projectAppliedOff: "{skill} is removed from every eligible project agent.",
      projectAgentApplied: "{agent} was updated for {skill} in the project.",
      copySkill: "Copy {skill}",
      copied: "{skill} copied.",
      copyFailed: "Could not copy the skill name.",
      openFolder: "Open {skill} folder",
      folderOpened: "Opened the skill folder.",
      folderFailed: "Could not open the skill folder.",
      openSource: "Open source for {skill}",
      sourceOpened: "Opened the source in your browser.",
      sourceMissing: "No web source is recorded.",
      setSource: "Set source",
      noSource: "No source recorded",
      officialSource: "Official source",
      customSource: "Custom source",
      sourceReadonly: "The official source cannot be changed here.",
      sourceSaved: "Source saved.",
      sourceCleared: "Source cleared.",
      sourceInvalid: "Enter a valid HTTP or HTTPS URL.",
      sourceDialogTitle: "Set source",
      sourceDialogNote: "Add a web address for {skill}.",
      sourceUrl: "Source URL",
      sourceHint: "Only an HTTP or HTTPS web address is accepted.",
      clearSource: "Clear source",
      saveSource: "Save source",
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
      projects: "项目",
      addProject: "添加项目",
      noProjects: "还没有项目。",
      projectCount: "{count} 个技能",
      projectCountOne: "1 个技能",
      nativeProject: "Magpie 项目",
      pluginProject: "插件项目",
      projectReadOnly: "此处只读",
      projectContext: "项目技能",
      projectPath: "文件夹：{path}",
      projectReadOnlyHint: "此项目页保持只读；需要加入技能时，请使用技能上的“加入项目”菜单。",
      projectSharedHint: "读取同一项目技能文件夹的 Agent 会看到同一份链接。",
      projectWarnings: "项目需要处理",
      projectAddTitle: "添加项目",
      projectAddNote: "选择本地文件夹，为它单独启用技能。",
      projectName: "项目名称",
      projectPathLabel: "项目文件夹",
      chooseFolder: "选择文件夹",
      projectHint:
        "添加插件项目时只创建它自己的 Junction；只有从技能菜单加入项目时，才会改动原生项目设置。",
      projectAdded: "项目已添加。",
      projectRemoved: "项目已移除。",
      projectRemoveTitle: "移除项目？",
      projectRemoveBody:
        "移除 {name}？只会移除插件拥有的 Junction，项目文件夹、技能和 Magpie 项目都会保留。",
      removeProject: "移除项目",
      projectNameRequired: "请选择项目文件夹。",
      projectSave: "添加项目",
      projectNoAgents: "没有支持项目技能的已安装 Agent。",
      projectAgentEnable: "在 {project} 中为 {skill} 添加 {agent}",
      projectAgentDisable: "从 {project} 的 {skill} 移除 {agent}",
      projectAllOn: "在 {project} 中为 {skill} 添加全部可用 Agent",
      projectAllOff: "从 {project} 的 {skill} 移除全部可用 Agent",
      projectAppliedOn: "{skill} 已添加到全部可用项目 Agent。",
      projectAppliedOff: "{skill} 已从全部可用项目 Agent 移除。",
      projectAgentApplied: "{project} 中的 {skill} 已更新 {agent}。",
      copySkill: "复制 {skill}",
      copied: "{skill} 已复制。",
      copyFailed: "复制技能名称失败。",
      openFolder: "打开 {skill} 文件夹",
      folderOpened: "已打开技能文件夹。",
      folderFailed: "打开技能文件夹失败。",
      openSource: "打开 {skill} 来源",
      sourceOpened: "已在默认浏览器打开来源。",
      sourceMissing: "没有记录网页来源。",
      setSource: "设置来源",
      noSource: "未记录来源",
      officialSource: "官方来源",
      customSource: "自定义来源",
      sourceReadonly: "官方来源不能在这里修改。",
      sourceSaved: "来源已保存。",
      sourceCleared: "来源已清除。",
      sourceInvalid: "请输入有效的 HTTP 或 HTTPS 地址。",
      sourceDialogTitle: "设置来源",
      sourceDialogNote: "为 {skill} 添加网页来源。",
      sourceUrl: "来源 URL",
      sourceHint: "只接受 HTTP 或 HTTPS 网页地址。",
      clearSource: "清除来源",
      saveSource: "保存来源",
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

  Object.assign(STRINGS.en, {
    expandDescription: "Show more",
    collapseDescription: "Show less",
    addToProject: "Add to project",
    alreadyInProject: "Already in project",
    projectMembership: "Project membership",
    projectMembershipHint: "This skill is assigned to these projects.",
    projectSkillAdded: "{skill} was added to {project}.",
    projectSkillRemoved: "{skill} was removed from {project}.",
    projectRemoveHint: "Click again to remove",
    removeFromProject: "Remove from {project}",
    projectAddUnavailable: "Project writes are unavailable.",
    projectReadOnlyAction: "Read-only project"
  });

  Object.assign(STRINGS.zh, {
    expandDescription: "展开",
    collapseDescription: "收起",
    addToProject: "加入项目",
    alreadyInProject: "已在项目中",
    projectMembership: "归属项目",
    projectMembershipHint: "此技能已加入以下项目。",
    projectSkillAdded: "{skill} 已加入 {project}。",
    projectSkillRemoved: "{skill} 已从 {project} 移除。",
    projectRemoveHint: "再次点击移除",
    removeFromProject: "从 {project} 移除",
    projectAddUnavailable: "当前无法写入项目。",
    projectReadOnlyAction: "只读项目"
  });

  const state = {
    data: null,
    filter: { kind: "all", labelId: null, projectId: null },
    query: "",
    loading: true,
    fatal: "",
    busySkills: new Set(),
    busyProjectSkill: "",
    refreshing: false,
    rowErrors: new Map(),
    agentIntents: new Map(),
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
    deleteLabelId: "",
    deleteProjectId: "",
    confirmMode: "label",
    sourceSkill: "",
    expandedDescriptions: new Set()
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
    setIcon($("#new-project .icon-slot"), "plus");
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
    $("#projects-heading").textContent = t("projects");
    $("#labels-heading").textContent = t("labels");
    $("#new-project").setAttribute("aria-label", t("addProject"));
    $("#new-project").setAttribute("title", t("addProject"));
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
    $("#project-dialog-title").textContent = t("projectAddTitle");
    $("#project-dialog-note").textContent = t("projectAddNote");
    $("#project-name-label").textContent = t("projectName");
    $("#project-path-label").textContent = t("projectPathLabel");
    $("#choose-project").textContent = t("chooseFolder");
    $("#project-hint").textContent = t("projectHint");
    $("#project-cancel").textContent = t("cancel");
    $("#project-save").textContent = t("projectSave");
    $("#source-dialog-title").textContent = t("sourceDialogTitle");
    $("#source-url-label").textContent = t("sourceUrl");
    $("#source-hint").textContent = t("sourceHint");
    $("#source-clear").textContent = t("clearSource");
    $("#source-save").textContent = t("saveSource");
    $("#source-cancel").textContent = t("cancel");
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
    $("#project-nav").innerHTML = "";
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

  function navRow({
    kind,
    label,
    iconName,
    count,
    labelId = "",
    projectId = "",
    badge = "",
    actions = ""
  }) {
    const active =
      state.filter.kind === kind &&
      (kind !== "label" || state.filter.labelId === labelId) &&
      (kind !== "project" || state.filter.projectId === projectId);
    return `
      <div class="nav-row">
        <button class="nav-button" type="button" data-filter-kind="${escapeAttr(kind)}"${
          labelId ? ` data-filter-label="${escapeAttr(labelId)}"` : ""
        }${
          projectId ? ` data-filter-project="${escapeAttr(projectId)}"` : ""
        } aria-current="${active ? "true" : "false"}">
          ${icon(iconName)}
          <span class="nav-label">${escapeHtml(label)}</span>
          ${badge ? `<span class="nav-badge">${escapeHtml(badge)}</span>` : ""}
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
    const canManageProjects = Boolean(data.capabilities?.canManageProjects);
    const projects = data.projects || [];
    $("#new-label").disabled = !canLabel || state.refreshing;
    $("#new-project").disabled = !canManageProjects || state.refreshing;
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

    $("#project-nav").innerHTML = projects.length
      ? projects
          .map((project) => {
            const actions =
              project.origin === "plugin" && canManageProjects
                ? `<span class="nav-actions"><button class="icon-button" type="button" data-action="remove-project" data-project-id="${escapeAttr(
                    project.id
                  )}" aria-label="${escapeAttr(t("removeProject"))}" title="${escapeAttr(
                    t("removeProject")
                  )}">${icon("remove")}</button></span>`
                : "";
            return navRow({
              kind: "project",
              label: project.name,
              iconName: "project",
              count: project.skillCount ?? 0,
              projectId: project.id,
              badge: project.origin === "native" ? t("projectReadOnly") : "",
              actions
            });
          })
          .join("")
      : `<div class="rail-status">${escapeHtml(t("noProjects"))}</div>`;

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
    if (state.filter.kind === "project") {
      const project = state.data?.projects?.find(
        (item) => item.id === state.filter.projectId
      );
      return project?.name || t("projectContext");
    }
    if (state.filter.kind === "untagged") return t("untaggedTitle");
    if (state.filter.kind === "label") {
      const label = state.data?.labels?.find((item) => item.id === state.filter.labelId);
      return label?.name || t("allSkillsTitle");
    }
    return t("allSkillsTitle");
  }

  function skillsInScope() {
    if (!state.data) return [];
    if (state.filter.kind !== "project") return state.data.skills;
    const project = currentProject();
    if (!project) return [];
    return state.data.skills.filter((skill) => {
      const agents = project.assignments?.[skill.name];
      return Array.isArray(agents) && agents.length > 0;
    });
  }

  function filteredSkills() {
    if (!state.data) return [];
    const query = state.query.trim().toLocaleLowerCase();
    return skillsInScope().filter((skill) => {
      if (state.filter.kind === "untagged" && skill.labels.length) return false;
      if (state.filter.kind === "label" && !skill.labels.includes(state.filter.labelId)) {
        return false;
      }
      if (!query) return true;
      return `${skill.name}\n${skill.description}\n${skill.sourceLabel || ""}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }

  function renderHeader() {
    if (!state.data) return;
    const total = skillsInScope().length;
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
    if (data.features?.state === "error") {
      banners.push(
        banner("error", t("projectWarnings"), data.features.error || t("errorFallback"))
      );
    }
    const project = data.projects?.find(
      (item) => item.id === state.filter.projectId
    );
    if (state.filter.kind === "project" && project) {
      const kind = project.origin === "native" ? t("nativeProject") : t("pluginProject");
      const detail = `${kind} · ${t("projectPath", { path: project.dir })}${
        project.origin === "native" ? ` · ${t("projectReadOnlyHint")}` : ""
      }`;
      banners.push(banner("info", project.name, detail));
      if (project.warnings?.length) {
        banners.push(
          banner("warn", t("projectWarnings"), project.warnings.slice(0, 4).join(" "))
        );
      }
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

  function agentIcon(agent) {
    const generic = (hidden = false) =>
      `<span class="agent-icon agent-icon-generic"${
        hidden ? " hidden" : ""
      } aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M8 2.2 13.2 5.1v5.8L8 13.8 2.8 10.9V5.1Z"/><path d="M8 8v5.8M2.8 5.1 8 8l5.2-2.9"/></svg></span>`;
    if (!agent.icon?.file) {
      return generic();
    }
    if (agent.icon.mode === "mask") {
      return `<span class="agent-icon agent-icon-mask" style="--agent-icon:url('icons/${escapeAttr(
        agent.icon.file
      )}')" aria-hidden="true"></span>`;
    }
    return `<img class="agent-icon" src="icons/${escapeAttr(
      agent.icon.file
    )}" alt="" data-image-fallback>${generic(
      true
    )}`;
  }

  function sourceAvatar(skill) {
    if (skill.sourceOwner) {
      return `<span class="source-avatar-wrap" aria-hidden="true"><img class="source-avatar" src="avatars/github/${escapeAttr(
        skill.sourceOwner
      )}.png" alt="" loading="lazy" data-image-fallback><span class="source-avatar source-avatar-fallback" hidden>${escapeHtml(
        skill.sourceOwner.charAt(0).toUpperCase()
      )}</span></span>`;
    }
    return `<span class="source-avatar-wrap source-avatar-neutral" aria-hidden="true">${icon(
      skill.sourceURL ? "globe" : "folder"
    )}</span>`;
  }

  function sourceLine(skill) {
    if (skill.sourceURL) {
      return `<button class="source-line" type="button" data-action="open-source" data-skill="${escapeAttr(
        skill.name
      )}" title="${escapeAttr(t("openSource", { skill: skill.name }))}">${icon(
        skill.customSource ? "link" : "external"
      )}<span>${escapeHtml(skill.sourceLabel || skill.sourceURL)}</span>${
        skill.customSource
          ? `<small>${escapeHtml(t("customSource"))}</small>`
          : ""
      }</button>`;
    }
    if (skill.canEditSource) {
      return `<button class="source-line source-line-empty" type="button" data-action="set-source" data-skill="${escapeAttr(
        skill.name
      )}" title="${escapeAttr(t("setSource"))}">${icon(
        "link"
      )}<span>${escapeHtml(t("noSource"))}</span><small>${escapeHtml(
        t("setSource")
      )}</small></button>`;
    }
    return `<span class="source-line source-line-empty">${icon(
      "folder"
    )}<span>${escapeHtml(t("noSource"))}</span></span>`;
  }

  function agentIntentKey(skillName, agentId) {
    return `${skillName}\n${agentId}`;
  }

  function pendingAgentIds(skillName) {
    const ids = new Set();
    for (const key of state.agentIntents.keys()) {
      const [name, agentId] = key.split("\n");
      if (name === skillName) ids.add(agentId);
    }
    return ids;
  }

  function setSkillAgentState(skillName, agentId, enabled) {
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    if (!skill) return;
    const agents = new Set(skill.assignedAgents || []);
    if (enabled) agents.add(agentId);
    else agents.delete(agentId);
    skill.assignedAgents = [...agents].sort();
  }

  function setSkillAllAgentsState(skillName, enabled) {
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    if (!skill) return;
    const agents = new Set(skill.assignedAgents || []);
    for (const agent of state.data.agents || []) {
      if (enabled) agents.add(agent.id);
      else agents.delete(agent.id);
    }
    skill.assignedAgents = [...agents].sort();
  }

  function applyPendingAgentIntents() {
    for (const [key, intent] of state.agentIntents) {
      const [skillName, agentId] = key.split("\n");
      setSkillAgentState(skillName, agentId, intent.enabled);
    }
  }

  function renderAgentChips(skill, disabled, pendingIds) {
    const assigned = new Set(skill.assignedAgents || []);
    if (!state.data.agents.length) {
      return `<div class="no-agents">${icon("warning")}<span>${escapeHtml(
        t("noAgentsBody")
      )}</span></div>`;
    }
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
        const pending = pendingIds.has(agent.id);
        return `<button class="agent-chip${pending ? " is-applying" : ""}" type="button" data-action="toggle-agent" data-skill="${escapeAttr(
          skill.name
        )}" data-agent-id="${escapeAttr(agent.id)}" data-enabled="${on ? "false" : "true"}" aria-pressed="${
          on ? "true" : "false"
        }" aria-busy="${pending ? "true" : "false"}" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}"${
          disabled ? " disabled" : ""
        }>${agentIcon(agent)}</button>`;
      })
      .join("")}</div>`;
  }

  function currentProject() {
    if (state.filter.kind !== "project") return null;
    return (
      state.data?.projects?.find((item) => item.id === state.filter.projectId) ||
      null
    );
  }

  function projectMemberships(skill) {
    return (state.data?.projects || []).filter((project) => {
      const agents = project.assignments?.[skill.name];
      return Array.isArray(agents) && agents.length > 0;
    });
  }

  function hasActiveProjectAssignment(project, skill) {
    const agents = project.assignments?.[skill.name];
    if (!Array.isArray(agents) || !agents.length) return false;
    if (project.origin !== "native") return true;
    const eligible = new Set((state.data?.projectAgents || []).map((agent) => agent.id));
    return agents.some((agentId) => eligible.has(agentId));
  }

  function projectAddMenu(skill) {
    const projects = state.data?.projects || [];
    const memberships = new Set(
      projects
        .filter((project) => hasActiveProjectAssignment(project, skill))
        .map((project) => project.id)
    );
    const canAddProject = Boolean(state.data?.capabilities?.canAssignProject);
    const options = projects.length
      ? projects
          .map((project) => {
            const joined = memberships.has(project.id);
            const unavailable =
              !canAddProject ||
              (project.origin !== "native" && project.readOnly);
            const detail = joined
              ? t("projectRemoveHint")
              : !canAddProject
                ? t("projectAddUnavailable")
                : project.origin === "native"
                  ? t("nativeProject")
                  : project.readOnly
                    ? t("projectReadOnlyAction")
                    : t("pluginProject");
            return `<button class="project-add-option${
              joined ? " is-joined" : ""
            }" type="button" data-action="add-to-project" data-project-id="${escapeAttr(
              project.id
            )}" data-skill="${escapeAttr(skill.name)}" data-joined="${
              joined ? "true" : "false"
            }"${unavailable ? " disabled" : ""} title="${escapeAttr(
              joined
                ? t("removeFromProject", { project: project.name })
                : project.name
            )}" aria-pressed="${joined ? "true" : "false"}"><span class="project-add-name">${
              joined
                ? `<span class="project-add-check">${icon("check")}</span>`
                : ""
            }<span>${escapeHtml(project.name)}</span></span><small>${escapeHtml(
              detail
            )}</small></button>`;
          })
          .join("")
      : `<div class="project-add-empty">${escapeHtml(t("noProjects"))}</div>`;
    return `<details class="project-add">
      <summary class="icon-button skill-action project-add-trigger" aria-label="${escapeAttr(
        t("addToProject")
      )}" title="${escapeAttr(t("addToProject"))}">${icon("project")}</summary>
      <div class="project-add-menu">
        <div class="project-add-title">${escapeHtml(t("addToProject"))}</div>
        ${options}
      </div>
    </details>`;
  }

  function projectMembershipBlock(skill) {
    const projects = projectMemberships(skill);
    if (!projects.length) return "";
    return `<div class="project-membership">
      <div class="project-membership-title">${escapeHtml(t("projectMembership"))}</div>
      <div class="project-membership-list">${projects
        .map(
          (project) =>
            `<button class="project-membership-chip" type="button" data-action="filter-project" data-project-id="${escapeAttr(
              project.id
            )}" title="${escapeAttr(t("projectMembershipHint"))}">${escapeHtml(
              project.name
            )}</button>`
        )
        .join("")}</div>
    </div>`;
  }

  function projectAgentChips(project, skill, disabled) {
    const agents = state.data.projectAgents || [];
    if (!agents.length) {
      return `<div class="no-agents">${icon("warning")}<span>${escapeHtml(
        t("projectNoAgents")
      )}</span></div>`;
    }
    const assigned = new Set(project.assignments?.[skill.name] || []);
    return `<div class="agent-list" role="group" aria-label="${escapeAttr(
      t("projectContext")
    )}">${agents
      .map((agent) => {
        const on = assigned.has(agent.id);
        const label = t(on ? "projectAgentDisable" : "projectAgentEnable", {
          agent: agent.name,
          skill: skill.name,
          project: project.name
        });
        return `<button class="agent-chip" type="button" data-action="project-agent" data-project-id="${escapeAttr(
          project.id
        )}" data-skill="${escapeAttr(skill.name)}" data-agent-id="${escapeAttr(
          agent.id
        )}" data-enabled="${on ? "false" : "true"}" aria-pressed="${
          on ? "true" : "false"
        }" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}"${
          disabled ? " disabled" : ""
        }>${agentIcon(agent)}</button>`;
      })
      .join("")}</div>`;
  }

  function projectControls(project, skill) {
    const agents = state.data.projectAgents || [];
    const assigned = new Set(project.assignments?.[skill.name] || []);
    const selected = agents.filter((agent) => assigned.has(agent.id));
    const value =
      !agents.length
        ? { key: "unavailable", selected: 0, total: 0 }
        : selected.length === agents.length
          ? { key: "on", selected: selected.length, total: agents.length }
          : selected.length
            ? { key: "mixed", selected: selected.length, total: agents.length }
            : { key: "off", selected: 0, total: agents.length };
    const copy = aggregateCopy(value);
    const busy = state.busyProjectSkill === `${project.id}:${skill.name}`;
    const disabled =
      busy || project.readOnly || !state.data.capabilities?.canAssignProject;
    return `
      <div class="project-controls">
        <div class="aggregate">
          <div class="aggregate-copy">
            <span class="aggregate-state">${escapeHtml(t("projectContext"))} · ${escapeHtml(
              copy.label
            )}</span>
            <span class="aggregate-note">${escapeHtml(
              value.total ? t("selectedAgents", value) : copy.hint
            )}</span>
          </div>
          ${
            project.readOnly
              ? `<span class="readonly-badge">${escapeHtml(t("projectReadOnly"))}</span>`
              : `<div class="segmented" role="group" aria-label="${escapeAttr(
                  t("projectAllOn", { skill: skill.name, project: project.name })
                )}">
                  <button type="button" data-action="project-global" data-project-id="${escapeAttr(
                    project.id
                  )}" data-skill="${escapeAttr(skill.name)}" data-enabled="true" aria-pressed="${
                    value.key === "on" ? "true" : "false"
                  }"${disabled ? " disabled" : ""}>${escapeHtml(t("allOn"))}</button>
                  <button type="button" data-action="project-global" data-project-id="${escapeAttr(
                    project.id
                  )}" data-skill="${escapeAttr(skill.name)}" data-enabled="false" aria-pressed="${
                    value.key === "off" ? "true" : "false"
                  }"${disabled ? " disabled" : ""}>${escapeHtml(t("allOff"))}</button>
                </div>`
          }
        </div>
        ${projectAgentChips(project, skill, project.readOnly || disabled)}
        <p class="project-note">${escapeHtml(t("projectSharedHint"))}</p>
      </div>`;
  }

  function renderSkillRow(skill) {
    const data = state.data;
    const project = currentProject();
    const projectBusy = project
      ? state.busyProjectSkill === `${project.id}:${skill.name}`
      : false;
    const pendingIds = pendingAgentIds(skill.name);
    const globalBusy = state.busySkills.has(skill.name);
    const busy = globalBusy || pendingIds.size > 0 || projectBusy;
    const disabled = globalBusy || projectBusy || !data.capabilities.canAssign;
    const globalDisabled = disabled || pendingIds.size > 0;
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
    const warning = skill.offHere
      ? `<div class="inline-warning">${icon("warning")}<span>${escapeHtml(
          t("offHere")
        )}</span></div>`
      : "";
    const errorKey = project ? `${project.id}:${skill.name}` : skill.name;
    const rowError = state.rowErrors.get(errorKey);
    const error = rowError
      ? `<div class="row-error">${icon("warning")}<span>${escapeHtml(rowError)}</span></div>`
      : "";
    const descriptionExpanded = state.expandedDescriptions.has(skill.name);
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
            ${sourceAvatar(skill)}
            <h3>${escapeHtml(skill.name)}</h3>
            <div class="skill-actions">
              <button class="icon-button skill-action" type="button" data-action="copy-skill" data-skill="${escapeAttr(
                skill.name
              )}" aria-label="${escapeAttr(
                t("copySkill", { skill: skill.name })
              )}" title="${escapeAttr(
                t("copySkill", { skill: skill.name })
              )}">${icon("copy")}</button>
              <button class="icon-button skill-action" type="button" data-action="open-folder" data-skill="${escapeAttr(
                skill.name
              )}" aria-label="${escapeAttr(
                t("openFolder", { skill: skill.name })
              )}" title="${escapeAttr(
                t("openFolder", { skill: skill.name })
              )}">${icon("folder-open")}</button>
              ${projectAddMenu(skill)}
            </div>
            ${busyMark}
          </div>
          ${sourceLine(skill)}
          <p class="skill-description${descriptionExpanded ? " is-expanded" : ""}">${escapeHtml(
            description
          )}</p>
          <button class="description-toggle" type="button" data-action="toggle-description" data-skill="${escapeAttr(
            skill.name
          )}" aria-expanded="${descriptionExpanded ? "true" : "false"}"${
            descriptionExpanded ? "" : " hidden"
          }>${escapeHtml(
            t(descriptionExpanded ? "collapseDescription" : "expandDescription")
          )}</button>
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
          ${
            project
              ? projectControls(project, skill)
              : `<div class="aggregate">
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
                    )}" data-enabled="true" aria-pressed="${
                      value.key === "on" ? "true" : "false"
                    }" aria-label="${escapeAttr(
                      t("globalOn", { skill: skill.name })
                    )}"${globalDisabled ? " disabled" : ""}>${escapeHtml(t("allOn"))}</button>
                    <button type="button" data-action="global" data-skill="${escapeAttr(
                      skill.name
                    )}" data-enabled="false" aria-pressed="${
                      value.key === "off" ? "true" : "false"
                    }" aria-label="${escapeAttr(
                      t("globalOff", { skill: skill.name })
                    )}"${globalDisabled ? " disabled" : ""}>${escapeHtml(t("allOff"))}</button>
                  </div>
                </div>
                ${renderAgentChips(skill, disabled, pendingIds)}`
          }
          ${projectMembershipBlock(skill)}
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
    syncDescriptionToggles();
  }

  function syncDescriptionToggles() {
    for (const row of $$("[data-skill-row]")) {
      const skillName = row.dataset.skillRow;
      const description = row.querySelector(".skill-description");
      const toggle = row.querySelector(".description-toggle");
      if (!description || !toggle) continue;

      if (state.expandedDescriptions.has(skillName)) {
        toggle.hidden = false;
        continue;
      }

      // Measure the rendered text instead of relying on a character count:
      // narrow layouts can exceed three lines with a fairly short sentence.
      toggle.hidden =
        description.scrollHeight <= description.clientHeight + 1 &&
        description.textContent.trim().length <= 120;
    }
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
    applyPendingAgentIntents();
    state.loading = false;
    state.rowErrors.clear();
    if (
      state.filter.kind === "label" &&
      !data.labels.some((label) => label.id === state.filter.labelId)
    ) {
      state.filter = { kind: "all", labelId: null, projectId: null };
    }
    if (
      state.filter.kind === "project" &&
      !data.projects?.some((project) => project.id === state.filter.projectId)
    ) {
      state.filter = { kind: "all", labelId: null, projectId: null };
    }
    renderAll();
    schedulePoll();
  }

  function setFilter(kind, labelId = null, projectId = null) {
    state.filter = { kind, labelId, projectId };
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
    if (state.busySkills.has(skillName) || pendingAgentIds(skillName).size > 0) return;
    state.busySkills.add(skillName);
    state.rowErrors.delete(skillName);
    const skillBefore = state.data?.skills?.find((item) => item.name === skillName);
    const agentsBefore = [...(skillBefore?.assignedAgents || [])];
    setSkillAllAgentsState(skillName, enabled);
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
      else if (skillBefore) skillBefore.assignedAgents = agentsBefore;
      state.rowErrors.set(skillName, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.busySkills.delete(skillName);
      renderAll();
    }
  }

  async function mutateAgent(skillName, agentId, enabled) {
    if (state.busySkills.has(skillName)) return;
    const key = agentIntentKey(skillName, agentId);
    const existing = state.agentIntents.get(key);
    if (existing) {
      existing.enabled = enabled;
      setSkillAgentState(skillName, agentId, enabled);
      renderAll();
      return;
    }
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    const intent = {
      enabled,
      initial: Boolean(skill?.assignedAgents?.includes(agentId))
    };
    state.agentIntents.set(key, intent);
    state.rowErrors.delete(skillName);
    setSkillAgentState(skillName, agentId, enabled);
    renderAll();
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      let sent = null;
      let wrote = false;
      while (sent !== intent.enabled) {
        sent = intent.enabled;
        // Returning to the initial state is a no-op only before any write.
        if (!wrote && sent === intent.initial) break;
        wrote = true;
        const data = await api(
          `api/skills/${encodeURIComponent(skillName)}/agents`,
          { method: "POST", body: { agentId, enabled: sent } }
        );
        setData(data);
        if (intent.enabled !== sent) {
          setSkillAgentState(skillName, agentId, intent.enabled);
          renderAll();
        }
      }
      if (!wrote) return;
      const agent = state.data.agents.find((item) => item.id === agentId);
      showToast(
        t("agentApplied", {
          agent: agent?.name || agentId,
          skill: skillName
        })
      );
    } catch (error) {
      if (error.state) setData(error.state);
      else setSkillAgentState(skillName, agentId, intent.initial);
      state.rowErrors.set(skillName, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.agentIntents.delete(key);
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
    state.confirmMode = "label";
    state.deleteLabelId = labelId;
    state.deleteProjectId = "";
    $("#confirm-title").textContent = t("deleteLabelTitle");
    $("#confirm-note").textContent = "";
    $("#confirm-copy").textContent = t("deleteLabelBody", { label: label.name });
    $("#confirm-delete").textContent = t("delete");
    openDialog("confirm-dialog");
  }

  async function submitConfirm(event) {
    event?.preventDefault?.();
    if (state.confirmMode === "project") {
      if (!state.deleteProjectId) return;
      const button = $("#confirm-delete");
      button.disabled = true;
      try {
        const data = await api(`api/projects/${encodeURIComponent(state.deleteProjectId)}/remove`, {
          method: "POST",
          body: {}
        });
        setData(data);
        closeDialog("confirm-dialog");
        state.deleteProjectId = "";
        showToast(t("projectRemoved"));
      } catch (error) {
        showToast(error.message || t("errorFallback"), "error");
      } finally {
        button.disabled = false;
      }
      return;
    }
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
      state.confirmMode = "label";
      showToast(t("labelDeleted"));
    } catch (error) {
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      button.disabled = false;
    }
  }

  async function runSkillAction(action, skillName) {
    try {
      await api(`api/skills/${encodeURIComponent(skillName)}/${action}`, {
        method: "POST",
        body: {}
      });
      if (action === "copy") showToast(t("copied", { skill: skillName }));
      else if (action === "folder") showToast(t("folderOpened"));
      else showToast(t("sourceOpened"));
    } catch (error) {
      const fallback =
        action === "copy"
          ? t("copyFailed")
          : action === "folder"
            ? t("folderFailed")
            : t("sourceMissing");
      showToast(error.message || fallback, "error");
    }
  }

  function openSourceDialog(skillName) {
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    if (!skill || !state.data?.capabilities?.canSetSource || !skill.canEditSource) return;
    state.sourceSkill = skillName;
    $("#source-dialog-note").textContent = t("sourceDialogNote", { skill: skillName });
    $("#source-url-input").value = skill.customSource ? skill.sourceURL : "";
    $("#source-form-error").textContent = "";
    $("#source-clear").disabled = !skill.customSource;
    openDialog("source-dialog");
    requestAnimationFrame(() => $("#source-url-input").focus());
  }

  async function submitSource(clear = false) {
    if (!state.sourceSkill) return;
    const button = $("#source-save");
    button.disabled = true;
    $("#source-form-error").textContent = "";
    try {
      const data = await api(
        `api/skills/${encodeURIComponent(state.sourceSkill)}/source`,
        {
          method: "POST",
          body: { url: clear ? "" : $("#source-url-input").value.trim() }
        }
      );
      setData(data);
      closeDialog("source-dialog");
      showToast(t(clear ? "sourceCleared" : "sourceSaved"));
      state.sourceSkill = "";
    } catch (error) {
      $("#source-form-error").textContent = error.message || t("sourceInvalid");
    } finally {
      button.disabled = false;
    }
  }

  function openProjectDialog() {
    if (!state.data?.capabilities?.canManageProjects) return;
    $("#project-name-input").value = "";
    $("#project-path-input").value = "";
    $("#project-form-error").textContent = "";
    openDialog("project-dialog");
    requestAnimationFrame(() => $("#project-name-input").focus());
  }

  async function chooseProjectFolder() {
    const button = $("#choose-project");
    button.disabled = true;
    try {
      const result = await api("api/projects/choose", { method: "POST", body: {} });
      if (result.path) {
        $("#project-path-input").value = result.path;
        if (!$("#project-name-input").value.trim()) {
          const parts = result.path.split(/[\\/]/).filter(Boolean);
          $("#project-name-input").value = parts.at(-1) || "";
        }
      }
    } catch (error) {
      $("#project-form-error").textContent = error.message || t("errorFallback");
    } finally {
      button.disabled = false;
    }
  }

  async function submitProject(event) {
    event?.preventDefault?.();
    const dir = $("#project-path-input").value.trim();
    if (!dir) {
      $("#project-form-error").textContent = t("projectNameRequired");
      return;
    }
    const button = $("#project-save");
    button.disabled = true;
    $("#project-form-error").textContent = "";
    try {
      const data = await api("api/projects", {
        method: "POST",
        body: { dir, name: $("#project-name-input").value.trim() }
      });
      const projectId = data.createdProjectId;
      setData(data);
      closeDialog("project-dialog");
      showToast(t("projectAdded"));
      if (projectId) setFilter("project", null, projectId);
    } catch (error) {
      $("#project-form-error").textContent = error.message || t("errorFallback");
    } finally {
      button.disabled = false;
    }
  }

  function openProjectConfirm(projectId) {
    const project = state.data?.projects?.find((item) => item.id === projectId);
    if (!project || project.origin !== "plugin") return;
    state.confirmMode = "project";
    state.deleteProjectId = projectId;
    $("#confirm-title").textContent = t("projectRemoveTitle");
    $("#confirm-note").textContent = "";
    $("#confirm-copy").textContent = t("projectRemoveBody", { name: project.name });
    $("#confirm-delete").textContent = t("removeProject");
    openDialog("confirm-dialog");
  }

  async function mutateProjectGlobal(
    projectId,
    skillName,
    enabled,
    added = null,
    removeAll = false
  ) {
    const key = `${projectId}:${skillName}`;
    if (state.busyProjectSkill) return;
    state.busyProjectSkill = key;
    state.rowErrors.delete(key);
    renderAll();
    try {
      const data = await api(
        `api/projects/${encodeURIComponent(projectId)}/skills/${encodeURIComponent(
          skillName
        )}/all`,
        { method: "POST", body: removeAll ? { enabled, removeAll: true } : { enabled } }
      );
      setData(data);
      const projectName =
        state.data.projects.find((item) => item.id === projectId)?.name || projectId;
      if (added === true) {
        showToast(t("projectSkillAdded", { skill: skillName, project: projectName }));
      } else if (added === false) {
        showToast(
          t("projectSkillRemoved", { skill: skillName, project: projectName })
        );
      } else {
        showToast(
          t(enabled ? "projectAppliedOn" : "projectAppliedOff", { skill: skillName })
        );
      }
    } catch (error) {
      if (error.state) setData(error.state);
      state.rowErrors.set(key, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.busyProjectSkill = "";
      renderAll();
    }
  }

  async function mutateProjectAgent(projectId, skillName, agentId, enabled) {
    const key = `${projectId}:${skillName}`;
    if (state.busyProjectSkill) return;
    state.busyProjectSkill = key;
    state.rowErrors.delete(key);
    renderAll();
    try {
      const data = await api(
        `api/projects/${encodeURIComponent(projectId)}/skills/${encodeURIComponent(
          skillName
        )}/agents`,
        { method: "POST", body: { agentId, enabled } }
      );
      setData(data);
      const agent = state.data.projectAgents.find((item) => item.id === agentId);
      const project = state.data.projects.find((item) => item.id === projectId);
      showToast(
        t("projectAgentApplied", {
          agent: agent?.name || agentId,
          skill: skillName,
          project: project?.name || projectId
        })
      );
    } catch (error) {
      if (error.state) setData(error.state);
      state.rowErrors.set(key, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.busyProjectSkill = "";
      renderAll();
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
    if (action === "copy-skill") {
      runSkillAction("copy", element.dataset.skill);
      return;
    }
    if (action === "open-folder") {
      runSkillAction("folder", element.dataset.skill);
      return;
    }
    if (action === "toggle-description") {
      const skillName = element.dataset.skill;
      if (state.expandedDescriptions.has(skillName)) {
        state.expandedDescriptions.delete(skillName);
      } else {
        state.expandedDescriptions.add(skillName);
      }
      renderList();
      return;
    }
    if (action === "add-to-project") {
      const details = element.closest("details");
      if (details) details.removeAttribute("open");
      const joined = element.dataset.joined === "true";
      mutateProjectGlobal(
        element.dataset.projectId,
        element.dataset.skill,
        !joined,
        !joined,
        joined
      );
      return;
    }
    if (action === "filter-project") {
      setFilter("project", null, element.dataset.projectId);
      return;
    }
    if (action === "open-source") {
      runSkillAction("browse", element.dataset.skill);
      return;
    }
    if (action === "set-source") {
      openSourceDialog(element.dataset.skill);
      return;
    }
    if (action === "remove-project") {
      openProjectConfirm(element.dataset.projectId);
      return;
    }
    if (action === "project-global") {
      mutateProjectGlobal(
        element.dataset.projectId,
        element.dataset.skill,
        element.dataset.enabled === "true"
      );
      return;
    }
    if (action === "project-agent") {
      mutateProjectAgent(
        element.dataset.projectId,
        element.dataset.skill,
        element.dataset.agentId,
        element.dataset.enabled === "true"
      );
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
    document.addEventListener(
      "error",
      (event) => {
        const image = event.target;
        if (
          !(image instanceof HTMLImageElement) ||
          !image.hasAttribute("data-image-fallback")
        ) {
          return;
        }
        image.hidden = true;
        if (image.nextElementSibling) image.nextElementSibling.hidden = false;
      },
      true
    );

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
        setFilter(
          filter.dataset.filterKind,
          filter.dataset.filterLabel || null,
          filter.dataset.filterProject || null
        );
      }
    });

    $("#new-label").addEventListener("click", () => openLabelDialog("create"));
    $("#new-project").addEventListener("click", openProjectDialog);
    $("#choose-project").addEventListener("click", chooseProjectFolder);
    $("#project-save").addEventListener("click", submitProject);
    $("#source-save").addEventListener("click", () => submitSource(false));
    $("#source-clear").addEventListener("click", () => submitSource(true));
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
