/* ============================================================
   DayDayUp 风格个人工作台 · 本地优先、零依赖
   收集(Inbox) → 执行(Todos) → 复盘(Reports) 闭环
   数据存 localStorage，可导出 JSON，归用户所有。
   ============================================================ */
(() => {
  "use strict";

  // ---------- 常量 / 工具 ----------
  const STORE_KEY = "daydayup-workbench-v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (key, n) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n);
    return todayKey(dt);
  };
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const daysBetween = (a, b) => { // b - a in days
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
  };

  // 图片压缩：读入文件 → 缩放 ≤480px → JPEG(0.6) dataURL，便于存 localStorage
  function fileToThumb(file, cb) {
    if (!file) return cb(null);
    if (typeof Image === "undefined") return cb(null);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 480;
          const r = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          try { cb(c.toDataURL("image/jpeg", 0.6)); } catch { cb(null); }
        };
        img.onerror = () => cb(null);
        img.src = reader.result;
      };
      reader.onerror = () => cb(null);
      reader.readAsDataURL(file);
    } catch { cb(null); }
  }

  // ---------- 图标 ----------
  const ICON = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5h13l3.5 6.5v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5z"/></svg>',
    todos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11M3 12h11M3 18h7"/><path d="m17 4 3 3 5-5" transform="translate(-4 2)"/></svg>',
    threads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    habits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.3-2-1-3 2 1 4 3 4 6a7 7 0 0 1-14 0c0-4 3-6 5-10z"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4 10-11"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/><path d="M19 14l.9 2.6L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.4z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5.5a4.5 4.5 0 0 0-7 1 4.5 4.5 0 0 0-7-1C3 7.5 4.5 11 12 18c7.5-7 8.5-10.5 7-12.5z"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v7a2 2 0 0 0 4 0V3M7 3v18M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zm0 9v9"/></svg>',
    run: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="5" r="2"/><path d="M13 8l-3 4 3 2 1 6M10 12l-3 2-2 4M13 8l4 1 3 2"/></svg>',
    mood: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h.01M3 9h14a2 2 0 0 1 2 2v0"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  };

  // ---------- 状态 ----------
  const t = todayKey();
  let state = load();
  const ui = { view: "today", threadFilter: null, reportDate: null, search: "", healthTab: "checkin", healthDate: null, monthCursor: null, monthSel: null, planMode: "自炊", planDays: 7 };

  // 主题颜色（品牌色可选）
  const ACCENTS = [
    { id: "emerald", name: "翡翠", light: "#1C7A4F", dark: "#5FD3A1" },
    { id: "sky", name: "天青", light: "#1D6FB8", dark: "#5AB0F0" },
    { id: "rose", name: "暮霞", light: "#C2456B", dark: "#F07AAE" },
    { id: "violet", name: "紫罗兰", light: "#6C4FD0", dark: "#A98FF0" },
    { id: "amber", name: "暖橙", light: "#C77A16", dark: "#E8A23C" },
    { id: "slate", name: "石墨", light: "#4F5E6B", dark: "#93A4B3" },
  ];
  const accentHex = (id) => (ACCENTS.find((a) => a.id === id) || ACCENTS[0])[state.settings.theme === "dark" ? "dark" : "light"];

  function defaultState() {
    return {
      version: 1,
      user: { name: "我" },
      threads: [
        { id: uid(), name: "个人工作台", headline: "", createdAt: t },
        { id: uid(), name: "阅读清单", headline: "", createdAt: t },
      ],
      tasks: [
        { id: uid(), title: "参考 DayDayUp 搭好自己的工作台", threadId: null, status: "open", priority: "high", due: t, createdAt: t, completedAt: null, deferredCount: 0, agentDelegable: false, notes: "" },
        { id: uid(), title: "读完《Calm Productivity》那篇设计文档", threadId: null, status: "open", priority: "med", due: addDays(t, 2), createdAt: t, completedAt: null, deferredCount: 0, agentDelegable: false, notes: "" },
        { id: uid(), title: "晚上散步 30 分钟", threadId: null, status: "open", priority: "none", due: null, createdAt: t, completedAt: null, deferredCount: 0, agentDelegable: false, notes: "" },
      ],
      inbox: [
        { id: uid(), kind: "link", text: "一篇关于安静生产力的长文", url: "https://example.com/calm", createdAt: t, status: "open" },
        { id: uid(), kind: "note", text: "下个月想学一点陶艺", url: "", createdAt: t, status: "open" },
      ],
      habits: [
        { id: uid(), name: "阅读 20 分钟", icon: "📖", createdAt: t, history: {} },
        { id: uid(), name: "写三行日记", icon: "✍️", createdAt: t, history: {} },
        { id: uid(), name: "早睡", icon: "🌙", createdAt: t, history: {} },
      ],
      reports: [],
      health: {
        checkins: {},
        weekReviews: {},
        meals: [
          { id: uid(), date: t, type: "午餐", food: "米饭一碗 + 鸡蛋两个 + 青菜", kcal: 360 },
          { id: uid(), date: t, type: "晚餐", food: "鸡胸肉 100g + 红薯", kcal: 270 },
        ],
        exercises: [
          { id: uid(), date: t, type: "散步", minutes: 30, kcal: null },
        ],
        moods: [
          { id: uid(), date: t, mood: "🙂", note: "今天状态不错" },
        ],
        expenses: [],
        dietTarget: 1800,
        monthEvents: {},
      },
      reminders: [
        { id: uid(), time: "09:00", label: "喝第一杯水，开启一天", repeat: "daily", enabled: true },
        { id: uid(), time: "21:30", label: "写三行日记 / 准备休息", repeat: "daily", enabled: true },
        { id: uid(), time: "13:00", label: "午后站起来走 5 分钟", repeat: "weekday", enabled: true },
      ],
      settings: { theme: "light", color: "emerald", briefing: "local", llm: { baseUrl: "", apiKey: "", model: "gpt-4o-mini", provider: "openai" }, haptic: true, pin: "" },
    };
  }

  function load() {
    try {
      let raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        // 兼容旧版本（vital-workbench-v1）数据，避免升级后数据丢失
        const legacy = localStorage.getItem("vital-workbench-v1");
        if (legacy) { raw = legacy; try { localStorage.removeItem("vital-workbench-v1"); } catch (e) {} }
      }
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      if (!s || s.version !== 1) return defaultState();
      return migrate(s);
    } catch { return defaultState(); }
  }
  function migrate(s) {
    s.health = s.health || {};
    s.health.checkins = s.health.checkins || {};
    s.health.weekReviews = s.health.weekReviews || {};
    s.health.meals = s.health.meals || [];
    s.health.exercises = s.health.exercises || [];
    s.health.moods = s.health.moods || [];
    s.health.expenses = s.health.expenses || [];
    if (s.health.dietTarget == null) s.health.dietTarget = 1800;
    s.health.monthEvents = s.health.monthEvents || {};
    s.reminders = s.reminders || [];
    s.settings = s.settings || {};
    if (s.settings.color == null) s.settings.color = "emerald";
    if (s.settings.haptic == null) s.settings.haptic = true;
    if (s.settings.pin == null) s.settings.pin = "";
    if (s.settings.agent !== undefined && s.settings.briefing === undefined) s.settings.briefing = s.settings.agent ? "local" : "off";
    s.settings.briefing = s.settings.briefing || "local";
    s.settings.llm = s.settings.llm || { baseUrl: "", apiKey: "", model: "gpt-4o-mini" };
    if (!s.settings.llm.provider) s.settings.llm.provider = "openai";
    delete s.settings.agent;
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast("保存失败：" + e.message); }
  }

  // ---------- 派生计算 ----------
  const openTasks = () => state.tasks.filter((x) => x.status === "open");
  const isOverdue = (task) => task.due && task.due < t && task.status === "open";
  const isDueToday = (task) => task.due === t && task.status === "open";
  const threadName = (id) => (state.threads.find((x) => x.id === id) || {}).name || "无线程";

  function dueLabel(due) {
    if (!due) return null;
    const diff = daysBetween(t, due);
    if (diff < 0) return { text: `${Math.abs(diff)} 天前到期`, cls: "overdue" };
    if (diff === 0) return { text: "今天", cls: "soon" };
    if (diff === 1) return { text: "明天", cls: "soon" };
    if (diff <= 3) return { text: `${diff} 天后`, cls: "" };
    const [, m, d] = due.split("-");
    return { text: `${m}-${d}`, cls: "" };
  }

  function stats() {
    const overdue = openTasks().filter(isOverdue).length;
    const today = openTasks().filter((x) => x.due && daysBetween(t, x.due) <= 0).length;
    const inbox = state.inbox.filter((x) => x.status === "open").length;
    const doneToday = state.tasks.filter((x) => x.completedAt === t).length;
    const habitsTotal = state.habits.length;
    const habitsDone = state.habits.filter((h) => h.history[t]).length;
    return { overdue, today, inbox, doneToday, habitsTotal, habitsDone };
  }

  // ---------- 简报 / 建议 ----------
  // briefing 三态：off（关闭）| local（规则式，不上传）| model（调用你配置的 LLM）
  let modelBriefing = { status: "idle", items: [], error: "" }; // 模型简报缓存（不持久化）

  // 市面常用模型服务商预设（OpenAI 兼容 /chat/completions 端点）
  const LLM_PRESETS = [
    { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1/chat/completions", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "gpt-3.5-turbo"] },
    { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/chat/completions", models: ["deepseek-chat", "deepseek-reasoner"] },
    { id: "qwen", name: "通义千问 (阿里)", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", models: ["qwen-plus", "qwen-max", "qwen-turbo", "qwen2.5-72b-instruct"] },
    { id: "glm", name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions", models: ["glm-4-plus", "glm-4-flash", "glm-4-air", "glm-4-long"] },
    { id: "kimi", name: "Kimi (月之暗面)", baseUrl: "https://api.moonshot.cn/v1/chat/completions", models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"] },
    { id: "doubao", name: "豆包 (火山方舟)", baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions", models: ["doubao-pro-32k", "doubao-pro-256k", "doubao-lite-32k"] },
    { id: "hunyuan", name: "腾讯混元", baseUrl: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions", models: ["hunyuan-pro", "hunyuan-turbo", "hunyuan-standard"] },
    { id: "grok", name: "Grok (xAI)", baseUrl: "https://api.x.ai/v1/chat/completions", models: ["grok-2", "grok-2-mini", "grok-beta"] },
    { id: "gemini", name: "Gemini (Google AI Studio)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"] },
    { id: "ollama", name: "Ollama (本地)", baseUrl: "http://localhost:11434/v1/chat/completions", models: ["llama3.1", "qwen2.5", "deepseek-r1", "phi3"] },
    { id: "custom", name: "自定义端点", baseUrl: "", models: [] },
  ];

  function briefing() {
    const s = stats();
    let lead;
    if (s.overdue > 0) lead = `今天有 <b>${s.overdue}</b> 项已逾期，先处理最久的那一条。`;
    else if (s.today > 0) lead = `接下来做 <b>${s.today}</b> 件事，挑一件开始。`;
    else if (s.inbox > 0) lead = `任务很清爽，收集箱里有 <b>${s.inbox}</b> 条待处理。`;
    else lead = `今天很清爽，做点你想做的事吧。`;
    return { s, lead };
  }

  function suggestions() {
    if (state.settings.briefing !== "local") return [];
    const out = [];
    const inboxOpen = state.inbox.filter((x) => x.status === "open");
    if (inboxOpen.length >= 5) out.push(`收集箱有 ${inboxOpen.length} 条积压，挑一条转成任务。`);
    const deferred = openTasks().filter((x) => x.deferredCount >= 3)
      .sort((a, b) => b.deferredCount - a.deferredCount).slice(0, 2);
    deferred.forEach((x) => out.push(`「${x.title}」已推迟 ${x.deferredCount} 次，是否拆小？`));
    const overdue = openTasks().filter(isOverdue).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 1);
    if (overdue.length && deferred.length < 2) out.push(`「${overdue[0].title}」逾期最久，今天先收尾它。`);
    state.threads.forEach((th) => {
      const cnt = openTasks().filter((x) => x.threadId === th.id).length;
      if (cnt >= 2 && !th.headline) out.push(`线程「${th.name}」有 ${cnt} 条任务，可以写一句话现状。`);
    });
    if (!out.length) out.push("状态良好，没有需要打断你的事。");
    return out;
  }

  // 把今日数据整理成发给模型的提示词
  function briefingPrompt() {
    const s = stats();
    const lines = [`今天是 ${t}。`];
    lines.push(`逾期任务 ${s.overdue} 项，今天到期 ${s.today} 项，收集箱待处理 ${s.inbox} 项，今日已完成 ${s.doneToday} 项，习惯打卡 ${s.habitsDone}/${s.habitsTotal}。`);
    const open = openTasks().filter((x) => x.status === "open").slice(0, 15);
    if (open.length) {
      lines.push("任务列表（节选）：");
      open.forEach((x) => lines.push(`- ${x.title}${x.due ? " (due " + x.due + ")" : ""}${x.deferredCount ? " 推迟" + x.deferredCount + "次" : ""}`));
    }
    if (state.inbox.length) lines.push(`收集箱示例：${state.inbox.slice(0, 5).map((i) => i.text).join(" / ")}`);
    lines.push("请基于以上，给出 3-5 条简短、可执行、不制造焦虑的建议。每条一行，不要编号、不要寒暄。");
    return lines.join("\n");
  }

  // 调用你配置的 OpenAI 兼容端点生成简报
  async function loadModelBriefing(force) {
    if (!force && modelBriefing.status !== "idle") return;
    const cfg = state.settings.llm || {};
    if (!cfg.baseUrl || !cfg.apiKey) {
      modelBriefing = { status: "error", items: [], error: "未配置模型：去「设置 → 智能简报 → 调用模型」填写 Base URL 与 API Key。" };
      render(); return;
    }
    if (typeof fetch !== "function") {
      modelBriefing = { status: "error", items: [], error: "当前运行环境不支持 fetch，无法调用模型。" };
      render(); return;
    }
    modelBriefing = { status: "loading", items: [], error: "" };
    render();
    try {
      const res = await fetch(cfg.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.apiKey },
        body: JSON.stringify({
          model: cfg.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: "你是个人工作台的冷静简报助手。基于用户今日数据，给出 3-5 条简短、可执行、不制造焦虑的建议。" },
            { role: "user", content: briefingPrompt() }
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) { modelBriefing = { status: "error", items: [], error: "模型返回 " + res.status }; render(); return; }
      const data = await res.json();
      const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
      const items = text.split(/\n+/).map((l) => l.replace(/^[-*•\d.\s、，]+/, "").trim()).filter(Boolean).slice(0, 6);
      modelBriefing = { status: "done", items, error: "" };
    } catch (e) { modelBriefing = { status: "error", items: [], error: String((e && e.message) || e) }; }
    render();
  }

  // ---------- 数据操作 ----------
  function addTask(title, opts = {}) {
    title = title.trim(); if (!title) return;
    state.tasks.unshift({ id: uid(), title, threadId: opts.threadId || null, status: "open",
      priority: opts.priority || "none", due: opts.due || null, createdAt: t, completedAt: null,
      deferredCount: 0, agentDelegable: !!opts.agentDelegable, notes: opts.notes || "" });
    save(); render();
  }
  function toggleTask(id) {
    const x = state.tasks.find((z) => z.id === id); if (!x) return;
    if (x.status === "open") { x.status = "done"; x.completedAt = t; }
    else { x.status = "open"; x.completedAt = null; }
    buzz(); save(); render();
  }
  function deferTask(id) {
    const x = state.tasks.find((z) => z.id === id); if (!x) return;
    x.due = addDays(x.due || t, 1); x.deferredCount++; save(); render();
    toast("已推迟到明天");
  }
  function updateTask(id, patch) {
    const x = state.tasks.find((z) => z.id === id); if (!x) return;
    Object.assign(x, patch); save(); render();
  }
  function deleteTask(id) { state.tasks = state.tasks.filter((z) => z.id !== id); save(); render(); }

  function addInbox(text, kind = "note", url = "") {
    text = text.trim(); if (!text) return;
    state.inbox.unshift({ id: uid(), kind, text, url: url || (kind === "link" ? text : ""), createdAt: t, status: "open" });
    save(); render();
  }
  function convertInbox(id) {
    const it = state.inbox.find((z) => z.id === id); if (!it) return;
    const title = it.kind === "link" && it.url && !it.text.startsWith("http") ? it.text : (it.text || it.url);
    state.tasks.unshift({ id: uid(), title: title || "来自收集箱", threadId: null, status: "open",
      priority: "none", due: t, createdAt: t, completedAt: null, deferredCount: 0,
      agentDelegable: false, notes: it.url ? it.url : "" });
    it.status = "done"; save(); render(); toast("已转为今日任务");
  }
  function deleteInbox(id) { state.inbox = state.inbox.filter((z) => z.id !== id); save(); render(); }

  function addThread(name) { name = name.trim(); if (!name) return; state.threads.push({ id: uid(), name, headline: "", createdAt: t }); save(); render(); }
  function updateThread(id, patch) { const x = state.threads.find((z) => z.id === id); if (!x) return; Object.assign(x, patch); save(); render(); }
  function deleteThread(id) { state.threads = state.threads.filter((z) => z.id !== id); state.tasks.forEach((x) => { if (x.threadId === id) x.threadId = null; }); save(); render(); }

  function toggleHabit(id, key = t) {
    const h = state.habits.find((z) => z.id === id); if (!h) return;
    if (h.history[key]) delete h.history[key]; else h.history[key] = true;
    buzz(); save(); render();
  }
  function addHabit(name) { name = name.trim(); if (!name) return; state.habits.push({ id: uid(), name, icon: "🌱", createdAt: t, history: {} }); save(); render(); }
  function deleteHabit(id) { state.habits = state.habits.filter((z) => z.id !== id); save(); render(); }

  function generateReport(key = t) {
    const done = state.tasks.filter((x) => x.completedAt === key);
    const created = state.tasks.filter((x) => x.createdAt === key && x.status !== "done");
    const carried = openTasks().filter((x) => x.due && x.due < key);
    const captured = state.inbox.filter((x) => x.createdAt === key);
    const conv = state.inbox.filter((x) => x.status === "done" && x.createdAt === key);
    const habitsDone = state.habits.filter((h) => h.history[key]);
    const lines = [];
    lines.push(`# ${key} 日报`);
    lines.push("");
    lines.push(`完成 ${done.length} 项 · 新增 ${created.length} 项 · 收集 ${captured.length} 条 · 习惯 ${habitsDone.length}/${state.habits.length}`);
    if (done.length) { lines.push("\n## 今日完成"); done.forEach((x) => lines.push(`- ${x.title}${x.threadId ? " 〔" + threadName(x.threadId) + "〕" : ""}`)); }
    if (carried.length) { lines.push("\n## 结转中（待处理）"); carried.slice(0, 8).forEach((x) => lines.push(`- ${x.title}`)); }
    if (captured.length) { lines.push("\n## 收集箱流入"); captured.slice(0, 6).forEach((x) => lines.push(`- ${x.text}`)); }
    if (habitsDone.length) { lines.push("\n## 习惯"); lines.push(habitsDone.map((h) => h.name).join("、")); }
    lines.push("\n> 明日最重要的一件事：挑一条逾期/今天的事，先把它做完。");
    const existing = state.reports.find((r) => r.date === key);
    const body = lines.join("\n");
    if (existing) existing.body = body; else state.reports.unshift({ id: uid(), date: key, body });
    save(); return body;
  }

  // ---------- 渲染：Rail ----------
  const NAV = [
    { id: "today", icon: "today", label: "今天" },
    { id: "inbox", icon: "inbox", label: "收集箱" },
    { id: "todos", icon: "todos", label: "任务" },
    { id: "threads", icon: "threads", label: "线程" },
    { id: "habits", icon: "habits", label: "习惯" },
    { id: "health", icon: "heart", label: "健康" },
    { id: "reminders", icon: "bell", label: "提醒" },
    { id: "reports", icon: "reports", label: "复盘" },
    { id: "settings", icon: "settings", label: "设置" },
  ];
  function renderRail() {
    const el = $("#rail");
    el.innerHTML =
      `<div class="brand">V</div>` +
      NAV.map((n) => `<button class="nav-item ${ui.view === n.id ? "active" : ""}" data-view="${n.id}" title="${n.label}">${ICON[n.icon]}</button>`).join("") +
      `<div class="spacer"></div>` +
      `<button class="nav-item" data-theme-toggle title="切换主题">${state.settings.theme === "dark" ? ICON.sun : ICON.moon}</button>`;
    el.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => { ui.view = b.dataset.view; ui.threadFilter = null; render(); });
    $("[data-theme-toggle]").onclick = toggleTheme;
  }

  // ---------- 渲染：Library ----------
  function renderLibrary() {
    const el = $("#library");
    const head = {
      today: ["今天", "接下来做什么"],
      inbox: ["收集箱", "先丢进来，再决定"],
      todos: ["任务", "可执行的事"],
      threads: ["线程", "把任务归拢"],
      habits: ["习惯", "每天一点点"],
      reports: ["复盘", "沉淀与回望"],
      settings: ["设置", "你的工作台"],
    }[ui.view] || ["", ""];
    let body = "";
    if (ui.view === "todos") {
      body = `<div class="lib-section-label">按线程</div>` +
        `<button class="lib-row ${!ui.threadFilter ? "active" : ""}" data-th=""><span class="label">全部任务</span><span class="count mono">${openTasks().length}</span></button>` +
        state.threads.map((th) => {
          const c = openTasks().filter((x) => x.threadId === th.id).length;
          return `<button class="lib-row ${ui.threadFilter === th.id ? "active" : ""}" data-th="${th.id}"><span class="label">${escapeHtml(th.name)}</span><span class="count mono">${c}</span></button>`;
        }).join("") +
        `<button class="lib-row" data-th="none"><span class="label">无线程</span><span class="count mono">${openTasks().filter((x) => !x.threadId).length}</span></button>`;
    } else if (ui.view === "threads") {
      body = state.threads.map((th) => {
        const c = openTasks().filter((x) => x.threadId === th.id).length;
        return `<button class="lib-row ${ui.threadFilter === th.id ? "active" : ""}" data-th="${th.id}"><span class="label">${escapeHtml(th.name)}</span><span class="count mono">${c}</span></button>`;
      }).join("") || `<div class="empty" style="padding:24px">还没有线程</div>`;
    } else if (ui.view === "reports") {
      const dates = [...new Set([t, ...state.reports.map((r) => r.date)])].sort().reverse();
      body = dates.map((d) => {
        const has = state.reports.find((r) => r.date === d);
        return `<button class="lib-row ${ui.reportDate === d ? "active" : ""}" data-rep="${d}"><span class="label">${d}${d === t ? " · 今天" : ""}</span>${has ? "" : '<span class="dot"></span>'}</button>`;
      }).join("");
    } else if (ui.view === "health") {
      body = `<div class="lib-section-label">健康管理</div>` + HEALTH_TABS.map((tab) => {
        const c = healthTabCount(tab.id);
        return `<button class="lib-row ${ui.healthTab === tab.id ? "active" : ""}" data-health-tab="${tab.id}"><span class="label">${tab.label}</span>${c != null ? `<span class="count mono">${c}</span>` : ""}</button>`;
      }).join("");
    } else if (ui.view === "reminders") {
      const en = state.reminders.filter((r) => r.enabled).length;
      body = `<div class="lib-section-label">提醒</div>
        <div class="lib-row"><span class="label">已启用</span><span class="count mono">${en}</span></div>` +
        state.reminders.map((r) => `<div class="lib-row"><span class="label">${escapeHtml(r.label)}</span><span class="count mono">${r.time}</span></div>`).join("");
    } else {
      const s = stats();
      const counts = {
        inbox: `<div class="lib-section-label">概览</div>
          <div class="lib-row"><span class="label">逾期</span><span class="count mono ${s.overdue ? "due overdue" : ""}">${s.overdue}</span></div>
          <div class="lib-row"><span class="label">今天</span><span class="count mono">${s.today}</span></div>
          <div class="lib-row"><span class="label">收集箱</span><span class="count mono">${s.inbox}</span></div>
          <div class="lib-row"><span class="label">已完成(今日)</span><span class="count mono">${s.doneToday}</span></div>`,
      };
      body = counts[ui.view] || "";
    }
    el.innerHTML = `<div class="library-head"><h1>${head[0]}</h1><div class="sub">${head[1]}</div></div><div class="library-scroll">${body}</div>`;
    el.querySelectorAll("[data-th]").forEach((b) => b.onclick = () => { ui.threadFilter = b.dataset.th || null; if (ui.view !== "threads") ui.view = "todos"; render(); });
    el.querySelectorAll("[data-rep]").forEach((b) => b.onclick = () => { ui.reportDate = b.dataset.rep; render(); });
    el.querySelectorAll("[data-health-tab]").forEach((b) => b.onclick = () => { ui.healthTab = b.dataset.healthTab; render(); });
  }

  // ---------- 渲染：Focus ----------
  function renderFocus() {
    const el = $("#focus");
    let html = "";
    switch (ui.view) {
      case "today": html = viewToday(); break;
      case "inbox": html = viewInbox(); break;
      case "todos": html = viewTodos(); break;
      case "threads": html = viewThreads(); break;
      case "habits": html = viewHabits(); break;
      case "health": html = viewHealth(); break;
      case "reminders": html = viewReminders(); break;
      case "reports": html = viewReports(); break;
      case "settings": html = viewSettings(); break;
    }
    el.innerHTML = `<div class="${ui.view === "reports" || ui.view === "settings" ? "focus-doc" : "focus-inner"}">${html}</div>`;
    bindFocus();
  }

  // 今天页的建议区：按 briefing 模式渲染
  function suggestHtml() {
    const mode = state.settings.briefing;
    if (mode === "off") return "";
    if (mode === "local") {
      const items = suggestions();
      if (!items.length) return "";
      return `<div class="suggest">${items.map((x) => `<div class="s">${ICON.spark}<span>${escapeHtml(x)}</span></div>`).join("")}</div>`;
    }
    // model
    let h = `<div class="suggest model"><div class="suggest-head"><span class="tag thread">模型简报</span><button class="btn-ghost sm" data-refresh-brief>刷新</button></div>`;
    if (modelBriefing.status === "loading") h += `<div class="s loading">正在请模型分析…</div>`;
    else if (modelBriefing.status === "error") h += `<div class="s err">${escapeHtml(modelBriefing.error)}</div>`;
    else if (modelBriefing.items.length) h += modelBriefing.items.map((x) => `<div class="s">${ICON.spark}<span>${escapeHtml(x)}</span></div>`).join("");
    else h += `<div class="s">尚未生成，点「刷新」或先在设置里配置模型。</div>`;
    return h + `</div>`;
  }

  // 今天
  function viewToday() {
    const { s, lead } = briefing();
    const overdue = openTasks().filter(isOverdue);
    const dueToday = openTasks().filter(isDueToday);
    const noDue = openTasks().filter((x) => !x.due && x.deferredCount === 0).slice(0, 5);
    const habits = state.habits;
    let body = `<section class="brief">
      <div class="lead">${lead}</div>
      <div class="brief-stats">
        <div class="brief-stat"><div class="n">${s.overdue}</div><div class="l">逾期</div></div>
        <div class="brief-stat"><div class="n">${s.today}</div><div class="l">今天</div></div>
        <div class="brief-stat"><div class="n">${s.inbox}</div><div class="l">收集箱</div></div>
        <div class="brief-stat"><div class="n">${s.doneToday}</div><div class="l">已完成</div></div>
        <div class="brief-stat"><div class="n">${state.reminders.filter((r) => r.enabled).length}</div><div class="l">提醒</div></div>
      </div>
      ${suggestHtml()}
    </section>`;
    if (state.settings.briefing === "model" && modelBriefing.status === "idle") setTimeout(() => { if (ui.view === "today") loadModelBriefing(false); }, 0);

    body += composeRow("快速记录一件事 / 一个链接…", (v) => {
      const isLink = /^https?:\/\//.test(v.trim());
      isLink ? addInbox(v.trim(), "link") : addInbox(v.trim(), "note");
    });

    const sections = [];
    if (overdue.length) sections.push(group("逾期", overdue, true));
    if (dueToday.length) sections.push(group("今天", dueToday));
    if (noDue.length) sections.push(group("随时", noDue));
    body += sections.join("") || `<div class="empty"><div class="big">今天没有待办</div>去「任务」里添加，或把收集箱转成任务。</div>`;

    // 习惯打卡
    body += `<div class="group-head"><span class="g-title">今日习惯</span><span class="g-count mono">${s.habitsDone}/${s.habitsTotal}</span></div>`;
    body += habits.map(habitRow).join("") || `<div class="empty">还没有习惯，去「习惯」里添加一个。</div>`;

    // 今日健康概览
    const hc = state.health.checkins[t];
    const moodToday = [...state.health.moods].reverse().find((m) => m.date === t);
    const exToday = state.health.exercises.filter((m) => m.date === t).reduce((a, m) => a + m.minutes, 0);
    const hBits = [];
    if (hc && hc.sleep) hBits.push(`睡眠 ${hc.sleep}h`);
    if (hc && hc.water) hBits.push(`饮水 ${hc.water}ml`);
    if (hc && hc.weight) hBits.push(`体重 ${hc.weight}kg`);
    if (moodToday) hBits.push(moodToday.mood);
    body += `<div class="group-head"><span class="g-title">今日健康</span><button class="btn-ghost" data-go-health style="margin-left:auto;padding:4px 10px">去打卡</button></div>`;
    body += hBits.length
      ? `<div class="meta-line">${hBits.map((b) => `<span class="tag muted">${escapeHtml(b)}</span>`).join(" ")} · 运动 <span class="mono">${exToday}</span> 分钟</div>`
      : `<div class="empty" style="padding:12px">还没记录今天的健康数据，先记一条吧。</div>`;
    return body;
  }

  // 收集箱
  function viewInbox() {
    let body = composeRow("收集：一句话、链接、灵感…", (v) => {
      const isLink = /^https?:\/\//.test(v.trim());
      isLink ? addInbox(v.trim(), "link") : addInbox(v.trim(), "note");
    });
    const items = state.inbox.filter((x) => x.status === "open");
    if (!items.length) return body + `<div class="empty"><div class="big">收集箱是空的</div>任何想法先丢进来，读完后一键转任务。</div>`;
    body += items.map((it) => {
      const icon = it.kind === "link" ? ICON.link : ICON.inbox;
      const sub = it.url ? `<a class="tag muted" href="${escapeHtml(it.url)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">${escapeHtml(it.url.slice(0, 42))}</a>` : "";
      return `<div class="row">
        <div class="grip">${icon}</div>
        <div class="body">
          <div class="title">${escapeHtml(it.text)}</div>
          <div class="meta-line">${sub}</div>
        </div>
        <div class="actions">
          <button class="btn-icon" data-convert="${it.id}" title="转为任务">${ICON.arrow}</button>
          <button class="btn-icon" data-del-in="${it.id}" title="删除">${ICON.trash}</button>
        </div>
      </div>`;
    }).join("");
    return body;
  }

  // 任务
  function viewTodos() {
    let list = openTasks();
    if (ui.threadFilter === "none") list = list.filter((x) => !x.threadId);
    else if (ui.threadFilter) list = list.filter((x) => x.threadId === ui.threadFilter);
    // 排序：逾期>今天>有期>无期；同组按优先级
    const prioW = { high: 0, med: 1, low: 2, none: 3 };
    list.sort((a, b) => {
      const ao = isOverdue(a) ? 0 : a.due ? 1 : 2, bo = isOverdue(b) ? 0 : b.due ? 1 : 2;
      if (ao !== bo) return ao - bo;
      if (prioW[a.priority] !== prioW[b.priority]) return prioW[a.priority] - prioW[b.priority];
      return (a.due || "9999").localeCompare(b.due || "9999");
    });
    const done = state.tasks.filter((x) => x.status === "done").slice(0, 12);
    let body = composeRow("添加任务，回车创建…", (v) => addTask(v));
    body += `<div class="group-head"><span class="g-title">进行中</span><span class="g-count mono">${list.length}</span></div>`;
    body += list.map(taskRow).join("") || `<div class="empty">这个分组没有任务。</div>`;
    if (done.length) {
      body += `<div class="group-head"><span class="g-title">已完成</span><span class="g-count mono">${done.length}</span></div>`;
      body += done.map(taskRow).join("");
    }
    return body;
  }

  // 线程
  function viewThreads() {
    let body = composeRow("新建线程（项目/主题）…", (v) => addThread(v));
    const list = ui.threadFilter ? state.threads.filter((x) => x.id === ui.threadFilter) : state.threads;
    if (!list.length) return body + `<div class="empty"><div class="big">还没有线程</div>线程把相关任务归到一起。</div>`;
    body += list.map((th) => {
      const tasks = state.tasks.filter((x) => x.threadId === th.id && x.status === "open");
      const head = th.headline ? `<div class="meta-line"><span class="tag thread">${escapeHtml(th.headline)}</span></div>` :
        `<div class="meta-line" style="color:var(--text-tertiary)">还没有现状描述</div>`;
      const rows = tasks.length ? tasks.map(taskRow).join("") :
        `<div class="empty" style="padding:12px">无进行中任务</div>`;
      return `<div class="group-head"><span class="g-title">${escapeHtml(th.name)}</span><span class="g-count mono">${tasks.length}</span>
        <button class="btn-icon" data-edit-th="${th.id}" title="编辑现状" style="margin-left:auto">${ICON.edit}</button></div>
        ${head}${rows}`;
    }).join("");
    return body;
  }

  // 习惯
  function viewHabits() {
    let body = composeRow("添加习惯…", (v) => addHabit(v));
    if (!state.habits.length) return body + `<div class="empty"><div class="big">还没有习惯</div>小而持续，比宏大目标有用。</div>`;
    body += state.habits.map(habitRow).join("");
    return body;
  }

  // 复盘
  function viewReports() {
    const key = ui.reportDate || t;
    const rep = state.reports.find((r) => r.date === key);
    let body = `<div class="page-head">
      <span class="eyebrow">复盘</span>
      <h2>${key}${key === t ? " · 今天" : ""}</h2>
      <div class="meta">从完成任务、收集流入与习惯打卡自动生成</div>
    </div>`;
    body += `<div style="margin-bottom:16px"><button class="btn-primary" data-gen="${key}">${rep ? "重新生成日报" : "一键生成日报"}</button></div>`;
    if (rep) body += `<div class="report-card">${escapeHtml(rep.body).replace(/\n/g, "<br>")}</div>`;
    else body += `<div class="empty"><div class="big">还没有这篇日报</div>点上面的按钮，基于今天的数据生成。</div>`;
    return body;
  }

  // 设置
  function viewSettings() {
    const s = state.settings;
    const themeSeg = `<div class="seg">
      <button data-theme-set="light" class="${s.theme === "light" ? "on" : ""}">浅色</button>
      <button data-theme-set="dark" class="${s.theme === "dark" ? "on" : ""}">深色</button></div>`;
    const briefingSeg = `<div class="seg three">
      <button data-briefing-set="off" class="${s.briefing === "off" ? "on" : ""}">关闭</button>
      <button data-briefing-set="local" class="${s.briefing === "local" ? "on" : ""}">不调用模型</button>
      <button data-briefing-set="model" class="${s.briefing === "model" ? "on" : ""}">调用模型</button></div>`;
    const briefDesc = s.briefing === "model"
      ? "调用你配置的模型生成简报（今日数据会发往你填写的端点）"
      : "规则式本地建议，不上传、不调用模型";
    let llmForm = "";
    if (s.briefing === "model") {
      const provider = s.llm.provider || "openai";
      const preset = LLM_PRESETS.find((p) => p.id === provider) || LLM_PRESETS[0];
      const providerOpts = LLM_PRESETS.map((p) => `<option value="${p.id}" ${p.id === provider ? "selected" : ""}>${p.name}</option>`).join("");
      let models = preset.models.slice();
      if (s.llm.model && !models.includes(s.llm.model)) models.push(s.llm.model);
      const isCustom = provider === "custom";
      const modelField = isCustom
        ? `<input id="llm-model" type="text" placeholder="模型名，如 gpt-4o" value="${escapeHtml(s.llm.model || "")}">`
        : `<select id="llm-model">${models.map((m) => `<option value="${m}" ${m === (s.llm.model || models[0]) ? "selected" : ""}>${m}</option>`).join("")}</select>`;
      llmForm = `<div class="llm-form">
        <div class="field"><label class="lbl">服务商</label><select id="llm-provider">${providerOpts}</select></div>
        <div class="field"><label class="lbl">Base URL（OpenAI 兼容 /chat/completions）</label><input id="llm-base" type="text" value="${escapeHtml(s.llm.baseUrl || preset.baseUrl)}"></div>
        <div class="field"><label class="lbl">模型</label>${modelField}</div>
        <div class="field"><label class="lbl">API Key</label><input id="llm-key" type="password" placeholder="粘贴你的 API Key" value="${escapeHtml(s.llm.apiKey || "")}"></div>
        <button class="btn-primary" id="llm-save">保存模型配置</button>
        <div class="hint">选好服务商后 Base URL 与模型已自动填好，你只需粘贴对应的 API Key。配置仅存于本机 localStorage。${isCustom ? "自定义端点请填写 Base URL 与模型名。" : ""}</div>
      </div>`;
    }
    const hapticSeg = `<div class="seg">
      <button data-haptic-set="1" class="${s.haptic ? "on" : ""}">开启</button>
      <button data-haptic-set="0" class="${!s.haptic ? "on" : ""}">关闭</button></div>`;
    const accentRow = `<div class="set-row"><div><div class="k">主题颜色</div><div class="v">品牌主色，浅色深色都适配</div></div>
      <div class="swatches">${ACCENTS.map((a) => `<button class="swatch ${s.color === a.id ? "on" : ""}" data-accent-set="${a.id}" title="${a.name}" style="background:${accentHex(a.id)}"></button>`).join("")}</div></div>`;
    return `<div class="page-head"><span class="eyebrow">设置</span><h2>你的工作台</h2></div>
      <div class="set-row"><div><div class="k">外观</div><div class="v">浅色 / 深色</div></div>${themeSeg}</div>
      ${accentRow}
      <div class="set-row"><div><div class="k">智能简报</div><div class="v">${briefDesc}</div></div>${briefingSeg}</div>
      ${llmForm}
      <div class="set-row"><div><div class="k">震动反馈</div><div class="v">关键操作轻微震动（支持的设备）</div></div>${hapticSeg}</div>
      <div class="set-row"><div><div class="k">隐私锁 (PIN)</div><div class="v">${s.pin ? "已启用 · 打开时须解锁" : "未启用 · 为本地数据加一道软锁"}</div></div><button class="btn-ghost" data-pin-set>${s.pin ? "更改 / 关闭" : "设置"}</button></div>
      <div class="set-row"><div><div class="k">导出数据</div><div class="v">导出为 JSON，数据归你</div></div><button class="btn-ghost" data-export>下载</button></div>
      <div class="set-row"><div><div class="k">导入数据</div><div class="v">从 JSON 恢复（覆盖当前）</div></div><button class="btn-ghost" data-import>选择文件</button></div>
      <div class="set-row"><div><div class="k">清空数据</div><div class="v">恢复为初始示例</div></div><button class="btn-ghost" data-reset>清空</button></div>
      <div class="set-row"><div><div class="k">关于</div><div class="v">参考 ximing/vital 的核心理念与翡翠园设计，本地优先、零依赖。已融合移动端优点：提醒、角标、照片、震动、日历导出、隐私锁。</div></div></div>
      <input type="file" id="importFile" accept="application/json" style="display:none">`;
  }

  // ================= 提醒中心 =================
  function repeatLabel(r) {
    const map = { daily: "每天", weekday: "工作日", weekend: "周末" };
    if (map[r]) return map[r];
    const wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return wd[Number(r)] || "每天";
  }
  function repeatMatches(rep, dow) {
    if (rep === "daily") return true;
    if (rep === "weekday") return dow >= 1 && dow <= 5;
    if (rep === "weekend") return dow === 0 || dow === 6;
    return Number(rep) === dow;
  }
  function viewReminders() {
    const list = state.reminders;
    let body = `<div class="page-head"><span class="eyebrow">提醒</span><h2>到点轻轻提醒你</h2>
      <div class="meta">本地定时提醒：用应用内弹窗，或在 https/localhost 下授权浏览器系统通知</div></div>`;
    if (typeof Notification !== "undefined") {
      const p = Notification.permission;
      body += p === "granted"
        ? `<div class="hint">浏览器系统通知已开启 ✅</div>`
        : `<div class="row-between" style="margin-bottom:12px"><span class="hint" style="margin:0">想要系统级弹窗？授权浏览器通知。</span><button class="btn-ghost" data-rem-notif>开启通知</button></div>`;
    } else {
      body += `<div class="hint">当前环境不支持浏览器通知，将使用应用内弹窗提醒。</div>`;
    }
    body += `<div class="health-form">
      <div class="grid2">
        <div class="field"><label class="lbl">时间</label><input id="rem-time" type="time" value="09:00" /></div>
        <div class="field"><label class="lbl">重复</label><select id="rem-repeat"><option value="daily">每天</option><option value="weekday">工作日</option><option value="weekend">周末</option><option value="1">周一</option><option value="2">周二</option><option value="3">周三</option><option value="4">周四</option><option value="5">周五</option><option value="6">周六</option><option value="0">周日</option></select></div>
      </div>
      <div class="field"><label class="lbl">提醒内容</label><input id="rem-label" placeholder="如：喝杯水 / 站起来走两步" /></div>
      <button class="btn-primary" id="rem-add" style="margin-top:12px">添加提醒</button>
    </div>`;
    body += `<div class="group-head"><span class="g-title">我的提醒</span><span class="g-count mono">${list.length}</span></div>`;
    body += list.length ? list.map(remRow).join("") : `<div class="empty"><div class="big">还没有提醒</div>加一个，让工作台替你记着时间。</div>`;
    return body;
  }
  function remRow(r) {
    return `<div class="row">
      <button class="check ${r.enabled ? "done" : ""}" data-rem-toggle="${r.id}">${ICON.check}</button>
      <div class="body"><div class="title ${r.enabled ? "" : "done"}">${escapeHtml(r.label)}</div>
      <div class="meta-line"><span class="tag thread">${r.time}</span><span class="tag muted">${repeatLabel(r.repeat)}</span></div></div>
      <div class="actions"><button class="btn-icon" data-rem-del="${r.id}" title="删除">${ICON.trash}</button></div>
    </div>`;
  }
  function addReminder(time, label, repeat) {
    label = label.trim(); if (!label) return toast("先写提醒内容");
    state.reminders.unshift({ id: uid(), time, label, repeat: repeat || "daily", enabled: true });
    save(); render(); toast("已添加提醒");
  }
  function toggleReminder(id) { const r = state.reminders.find((z) => z.id === id); if (!r) return; r.enabled = !r.enabled; save(); render(); buzz(); }
  function deleteReminder(id) { state.reminders = state.reminders.filter((z) => z.id !== id); save(); render(); buzz(); }

  // 提醒引擎：定时检查，到点触发应用内弹窗 + 可选系统通知 + 震动
  const _fired = new Set();
  function fireReminder(r) {
    toast("⏰ " + r.label);
    buzz(30);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("工作台提醒", { body: r.label });
      }
    } catch {}
  }
  function startReminderEngine() {
    const check = () => {
      const now = new Date();
      const cur = pad(now.getHours()) + ":" + pad(now.getMinutes());
      const key = todayKey(now);
      const dow = now.getDay();
      state.reminders.forEach((r) => {
        if (!r.enabled || r.time !== cur) return;
        if (!repeatMatches(r.repeat, dow)) return;
        const fk = r.id + key + r.time;
        if (_fired.has(fk)) return;
        _fired.add(fk);
        fireReminder(r);
      });
    };
    check();
    setInterval(check, 15000);
  }
  function bindReminders() {
    const add = $("#rem-add");
    if (add) add.onclick = () => addReminder($("#rem-time").value, $("#rem-label").value, $("#rem-repeat").value);
    const notif = $("[data-rem-notif]");
    if (notif) notif.onclick = () => {
      if (typeof Notification === "undefined") return;
      try {
        const res = Notification.requestPermission(() => { render(); });
        if (res && res.then) res.then(() => render());
      } catch { render(); }
    };
  }

  // ================= 健康管理模块 =================
  const HEALTH_TABS = [
    { id: "checkin", label: "健康打卡" },
    { id: "diet", label: "饮食记录" },
    { id: "exercise", label: "运动打卡" },
    { id: "mood", label: "心情记录" },
    { id: "expense", label: "记账存钱" },
    { id: "plan", label: "饮食计划" },
    { id: "month", label: "月度计划" },
  ];
  // 常见食物热量参考（每 100g 与一份），约 30 种；仅为参考，非医疗建议
  const FOODS = [
    { n: "米饭(熟)", k100: 116, s: "一碗 150g", sk: 174 },
    { n: "白粥", k100: 46, s: "一碗 300g", sk: 138 },
    { n: "馒头", k100: 223, s: "一个 100g", sk: 223 },
    { n: "面条(煮)", k100: 110, s: "一碗 200g", sk: 220 },
    { n: "全麦面包", k100: 250, s: "一片 40g", sk: 100 },
    { n: "鸡蛋", k100: 144, s: "一个 50g", sk: 72 },
    { n: "牛奶", k100: 54, s: "一杯 250ml", sk: 135 },
    { n: "酸奶", k100: 72, s: "一杯 200g", sk: 144 },
    { n: "鸡胸肉(熟)", k100: 165, s: "100g", sk: 165 },
    { n: "瘦牛肉(熟)", k100: 250, s: "100g", sk: 250 },
    { n: "瘦猪肉(熟)", k100: 143, s: "100g", sk: 143 },
    { n: "三文鱼", k100: 208, s: "100g", sk: 208 },
    { n: "豆腐", k100: 76, s: "100g", sk: 76 },
    { n: "豆浆", k100: 31, s: "一杯 250ml", sk: 78 },
    { n: "西兰花", k100: 34, s: "100g", sk: 34 },
    { n: "番茄", k100: 18, s: "100g", sk: 18 },
    { n: "黄瓜", k100: 15, s: "100g", sk: 15 },
    { n: "菠菜", k100: 23, s: "100g", sk: 23 },
    { n: "苹果", k100: 52, s: "一个 200g", sk: 104 },
    { n: "香蕉", k100: 89, s: "一根 120g", sk: 107 },
    { n: "橙子", k100: 47, s: "一个 150g", sk: 70 },
    { n: "葡萄", k100: 43, s: "100g", sk: 43 },
    { n: "西瓜", k100: 30, s: "100g", sk: 30 },
    { n: "土豆(熟)", k100: 87, s: "100g", sk: 87 },
    { n: "红薯(熟)", k100: 86, s: "100g", sk: 86 },
    { n: "玉米", k100: 106, s: "一根 100g", sk: 106 },
    { n: "燕麦(干)", k100: 367, s: "40g", sk: 147 },
    { n: "花生", k100: 567, s: "30g", sk: 170 },
    { n: "核桃", k100: 654, s: "20g", sk: 131 },
    { n: "可乐", k100: 43, s: "一罐 330ml", sk: 142 },
    { n: "啤酒", k100: 43, s: "一罐 330ml", sk: 142 },
    { n: "巧克力", k100: 546, s: "20g", sk: 109 },
    { n: "植物油", k100: 884, s: "10g", sk: 88 },
  ];
  const MOODS = ["😣", "😟", "😐", "🙂", "😄", "😴", "😰", "💪"];

  function weekRange(key) {
    const dt = new Date(...key.split("-").map(Number));
    const dow = (dt.getDay() + 6) % 7; // 周一=0
    const mon = addDays(key, -dow);
    return [mon, addDays(mon, 6)];
  }
  function sparkline(vals) {
    if (vals.length < 2) return "";
    const w = 260, h = 48, p = 6;
    const min = Math.min(...vals), max = Math.max(...vals), span = (max - min) || 1;
    const X = (i) => p + (w - 2 * p) * (i / (vals.length - 1));
    const Y = (v) => h - p - (h - 2 * p) * ((v - min) / span);
    const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
    const lx = X(vals.length - 1).toFixed(1), ly = Y(vals[vals.length - 1]).toFixed(1);
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="3" fill="var(--accent-primary)"/></svg>`;
  }
  function healthTabCount(id) {
    const H = state.health;
    if (id === "checkin") return H.checkins[t] ? "✓" : "·";
    if (id === "diet") { const n = H.meals.filter((m) => m.date === t).length; return n || "·"; }
    if (id === "exercise") { const n = H.exercises.filter((m) => m.date === t).length; return n || "·"; }
    if (id === "mood") return H.moods.some((m) => m.date === t) ? "✓" : "·";
    if (id === "expense") { const s = H.expenses.filter((e) => e.date.slice(0, 7) === t.slice(0, 7) && e.flow === "支出").reduce((a, e) => a + e.amount, 0); return s ? "¥" + s : "·"; }
    if (id === "plan") return H.dietTarget;
    if (id === "month") { const cur = t.slice(0, 7); const n = Object.keys(H.monthEvents).filter((d) => d.slice(0, 7) === cur).reduce((a, d) => a + H.monthEvents[d].length, 0); return n || "·"; }
    return null;
  }

  // ---------- 健康数据操作 ----------
  function saveCheckin(key, patch) {
    const cur = state.health.checkins[key] || {};
    state.health.checkins[key] = Object.assign(cur, patch);
    save(); render(); toast("已保存 " + key + " 的健康记录");
  }
  function deleteCheckin(key) {
    const hasWeek = state.health.weekReviews[weekRange(key)[1]];
    if (hasWeek && !confirm("这一天若含周复盘，复盘也会一并删除，确定？")) return;
    delete state.health.checkins[key];
    delete state.health.weekReviews[weekRange(key)[1]];
    save(); render(); toast("已删除 " + key);
  }
  function saveWeekReview(sunKey, text) { state.health.weekReviews[sunKey] = { text }; save(); render(); toast("周复盘已保存"); }
  function addMeal(date, type, food, kcal, image) { state.health.meals.unshift({ id: uid(), date, type, food: food.trim(), kcal: kcal == null || kcal === "" ? null : Number(kcal), image: image || null }); save(); render(); }
  function deleteMeal(id) { state.health.meals = state.health.meals.filter((x) => x.id !== id); save(); render(); }
  function addExercise(date, type, minutes, kcal) { state.health.exercises.unshift({ id: uid(), date, type: type.trim(), minutes: Number(minutes) || 0, kcal: kcal == null || kcal === "" ? null : Number(kcal) }); save(); render(); }
  function deleteExercise(id) { state.health.exercises = state.health.exercises.filter((x) => x.id !== id); save(); render(); }
  function addMood(date, mood, note, image) { state.health.moods.unshift({ id: uid(), date, mood, note: note.trim(), image: image || null }); save(); render(); }
  function deleteMood(id) { state.health.moods = state.health.moods.filter((x) => x.id !== id); save(); render(); }
  function addExpense(date, flow, category, amount, note) { state.health.expenses.unshift({ id: uid(), date, flow, category: category.trim(), amount: Number(amount) || 0, note: note.trim() }); save(); render(); }
  function deleteExpense(id) { state.health.expenses = state.health.expenses.filter((x) => x.id !== id); save(); render(); }
  function addMonthEvent(date, time, content, color, image) { (state.health.monthEvents[date] = state.health.monthEvents[date] || []).push({ id: uid(), time, content: content.trim(), color: color || "#1C7A4F", image: image || null }); save(); render(); }
  function deleteMonthEvent(date, id) { if (state.health.monthEvents[date]) state.health.monthEvents[date] = state.health.monthEvents[date].filter((e) => e.id !== id); save(); render(); }

  // ---------- 健康视图分发 ----------
  function viewHealth() {
    const map = { checkin: viewHealthCheckin, diet: viewHealthDiet, exercise: viewHealthExercise, mood: viewHealthMood, expense: viewHealthExpense, plan: viewHealthPlan, month: viewHealthMonth };
    const fn = map[ui.healthTab] || viewHealthCheckin;
    return fn();
  }

  function viewHealthCheckin() {
    const key = ui.healthDate || t;
    const rec = state.health.checkins[key] || {};
    const [mon, sun] = weekRange(key);
    const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    const wWeights = days.map((d) => (state.health.checkins[d] || {}).weight).filter((v) => v != null);
    const weekRec = state.health.weekReviews[sun] || {};
    const recent = Array.from({ length: 7 }, (_, i) => addDays(t, -i)).filter((d) => state.health.checkins[d]);
    let body = `<div class="page-head"><span class="eyebrow">健康打卡</span><h2>每天记录真实数据</h2>
      <div class="meta">本周 ${mon} ~ ${sun} · 没测量就留空，不等于零</div></div>`;
    body += `<div class="health-form">
      <div class="row-between" style="margin-bottom:16px"><label class="lbl" style="margin:0">记录日期</label><input type="date" id="hc-date" value="${key}" /></div>
      <div class="grid2">
        <div class="field"><label class="lbl">睡眠（小时）</label><input id="hc-sleep" type="number" step="0.1" placeholder="如 7.5" value="${rec.sleep ?? ""}" /></div>
        <div class="field"><label class="lbl">饮水（ml 累计）</label><input id="hc-water" type="number" placeholder="如 1500" value="${rec.water ?? ""}" /></div>
        <div class="field"><label class="lbl">体重（kg）</label><input id="hc-weight" type="number" step="0.1" placeholder="有测量再填" value="${rec.weight ?? ""}" /></div>
        <div class="field"><label class="lbl">腰围（cm）</label><input id="hc-waist" type="number" step="0.1" placeholder="有测量再填" value="${rec.waist ?? ""}" /></div>
      </div>
      <div class="field"><label class="lbl">身体感受 / 记录来源</label><textarea id="hc-note" placeholder="例如：下午容易困；睡眠来自手表">${escapeHtml(rec.note || "")}</textarea></div>
      <div class="row-between">
        <button class="btn-ghost" id="hc-del">删除这天</button>
        <button class="btn-primary" id="hc-save">保存今日记录</button>
      </div>
    </div>`;
    if (wWeights.length >= 2) body += `<div class="group-head"><span class="g-title">本周体重趋势</span></div>${sparkline(wWeights)}<div class="hint">仅连接实际填写的日期，空白日不连线。</div>`;
    body += `<div class="group-head"><span class="g-title">每周复盘</span><span class="g-count mono">${sun}</span></div>
      <div class="field"><label class="lbl">哪件事做到了 / 困难在哪 / 下周一个小调整</label><textarea id="hc-week" placeholder="例如：坚持了晚饭后散步；最难是早起；下周只在工作日午休走 5 分钟。">${escapeHtml(weekRec.text || "")}</textarea></div>
      <div class="row-between">
        <button class="btn-ghost" id="hc-copy">复制本周记录</button>
        <button class="btn-primary" id="hc-week-save">保存周复盘</button>
      </div>`;
    if (recent.length) {
      body += `<div class="group-head"><span class="g-title">最近记录</span></div>`;
      body += recent.map((d) => {
        const r = state.health.checkins[d];
        const parts = [];
        if (r.sleep) parts.push(`睡 ${r.sleep}h`);
        if (r.water) parts.push(`水 ${r.water}ml`);
        if (r.weight) parts.push(`重 ${r.weight}kg`);
        if (r.waist) parts.push(`腰 ${r.waist}cm`);
        return `<div class="row" data-hc-day="${d}" style="cursor:pointer"><div class="body"><div class="title">${d}</div><div class="meta-line">${parts.length ? parts.map((p) => `<span class="tag muted">${escapeHtml(p)}</span>`).join(" ") : '<span class="tag muted">仅感受记录</span>'}</div></div></div>`;
      }).join("");
    }
    return body;
  }

  function viewHealthDiet() {
    const key = ui.healthDate || t;
    const meals = state.health.meals.filter((m) => m.date === key);
    const sumKcal = meals.reduce((a, m) => a + (m.kcal || 0), 0);
    const pending = meals.filter((m) => m.kcal == null).length;
    const target = state.health.dietTarget;
    let body = `<div class="page-head"><span class="eyebrow">饮食记录</span><h2>先记真实吃了什么</h2>
      <div class="meta">${key}${key === t ? " · 今天" : ""} · 热量知道就填，不知道留空显示「待补」</div></div>`;
    body += `<div class="health-form">
      <div class="row-between" style="margin-bottom:12px"><label class="lbl" style="margin:0">每日热量目标</label>
        <div class="field-inline"><input id="diet-target-val" type="number" value="${target}" style="width:110px" /><button class="btn-ghost" id="diet-target">更新</button></div></div>
      <div class="grid2">
        <div class="field"><label class="lbl">餐次</label><select id="diet-type"><option>早餐</option><option selected>午餐</option><option>晚餐</option><option>加餐</option></select></div>
        <div class="field"><label class="lbl">热量 (kcal，可空)</label><input id="diet-kcal" type="number" placeholder="待补" /></div>
      </div>
      <div class="field"><label class="lbl">食物与份量</label><textarea id="diet-food" placeholder="例如：米饭一碗 + 鸡蛋两个 + 青菜"></textarea></div>
      <div class="field"><label class="lbl">这餐的照片（可选）</label><input id="diet-img" type="file" accept="image/*" /></div>
      <button class="btn-primary" id="diet-add" style="margin-top:12px">记录一餐</button>
    </div>`;
    // 今日热量小结
    if (meals.length) {
      const remain = pending ? null : target - sumKcal;
      body += `<div class="group-head"><span class="g-title">今日摄入</span><span class="g-count mono">${sumKcal} kcal</span></div>`;
      body += pending ? `<div class="hint kcal-pending">有 ${pending} 条热量待补，剩余目标暂不可计。</div>` : `<div class="hint">目标 ${target} kcal，剩余 <b>${remain}</b> kcal${remain < 0 ? "（已超出）" : ""}。</div>`;
    }
    body += meals.map((m) => `<div class="row">
      <div class="body"><div class="title">${escapeHtml(m.food)}</div>${m.image ? `<img class="thumb" src="${m.image}" alt="餐图" />` : ""}
      <div class="meta-line"><span class="tag thread">${escapeHtml(m.type)}</span><span class="meal-kcal">${m.kcal != null ? m.kcal + " kcal" : '<span class="kcal-pending">热量待补</span>'}</span></div></div>
      <div class="actions"><button class="btn-icon" data-del-meal="${m.id}" title="删除">${ICON.trash}</button></div></div>`).join("");
    if (!meals.length) body += `<div class="empty"><div class="big">今天还没记饮食</div>先记一餐，热量不知道就留空。</div>`;
    // 热量搜索
    body += `<div class="group-head"><span class="g-title">热量搜索</span><span class="g-count mono">${FOODS.length} 种常见食物</span></div>
      <div class="compose"><input type="text" id="food-search" placeholder="搜食物名，如 鸡蛋 / 米饭" /><button class="send" id="food-clear">清空</button></div>
      <div class="food-res" id="food-results"></div>
      <div class="hint">内置库仅常见参考，非全网数据库；包装食品请按标签核对，生重熟重注意区分。</div>`;
    return body;
  }

  function viewHealthExercise() {
    const key = ui.healthDate || t;
    const ex = state.health.exercises.filter((m) => m.date === key);
    const week = Array.from({ length: 7 }, (_, i) => addDays(t, -i));
    const weekMin = week.reduce((a, d) => a + state.health.exercises.filter((m) => m.date === d).reduce((s, m) => s + m.minutes, 0), 0);
    const streak = (() => { let n = 0, d = t; while (state.health.exercises.some((m) => m.date === d)) { n++; d = addDays(d, -1); } return n; })();
    let body = `<div class="page-head"><span class="eyebrow">运动打卡</span><h2>动了就记一笔</h2>
      <div class="meta">近 7 天 ${weekMin} 分钟 · 连续打卡 ${streak} 天（按有无记录计）</div></div>`;
    body += `<div class="health-form">
      <div class="grid2">
        <div class="field"><label class="lbl">运动类型</label><input id="ex-type" placeholder="如 散步 / 跑步 / 力量" /></div>
        <div class="field"><label class="lbl">时长（分钟）</label><input id="ex-min" type="number" placeholder="30" /></div>
      </div>
      <div class="field"><label class="lbl">消耗热量 (kcal，可空)</label><input id="ex-kcal" type="number" placeholder="不确定就留空" /></div>
      <button class="btn-primary" id="ex-add" style="margin-top:12px">添加打卡</button>
    </div>`;
    // 近 7 天格子
    body += `<div class="group-head"><span class="g-title">近 7 天</span></div><div class="dots">` +
      week.slice().reverse().map((d) => { const m = state.health.exercises.filter((x) => x.date === d).reduce((s, x) => s + x.minutes, 0); return `<span class="d ${m ? "on" : ""}" title="${d}: ${m} 分钟" style="${m ? "width:auto;padding:0 6px;font-family:var(--font-mono);font-size:11px;color:var(--accent-on)" : ""}">${m ? m + "′" : ""}</span>`; }).join("") + `</div>`;
    body += ex.map((m) => `<div class="row">
      <div class="body"><div class="title">${escapeHtml(m.type)}</div>
      <div class="meta-line"><span class="tag thread">${m.minutes} 分钟</span>${m.kcal != null ? `<span class="meal-kcal">${m.kcal} kcal</span>` : '<span class="kcal-pending">消耗待补</span>'}</div></div>
      <div class="actions"><button class="btn-icon" data-del-ex="${m.id}" title="删除">${ICON.trash}</button></div></div>`).join("");
    if (!ex.length) body += `<div class="empty"><div class="big">今天还没运动记录</div>适合自己强度的活动，动了就记。</div>`;
    return body;
  }

  function viewHealthMood() {
    const key = ui.healthDate || t;
    const list = state.health.moods.filter((m) => m.date === key);
    let body = `<div class="page-head"><span class="eyebrow">心情记录</span><h2>选一个最接近的心情</h2>
      <div class="meta">${key}${key === t ? " · 今天" : ""} · 趋势用于回顾，不是测评或诊断</div></div>`;
    body += `<div class="mood-pick">` + MOODS.map((m) => `<button class="mood-opt ${ui.moodPick === m ? "on" : ""}" data-mood="${m}">${m}</button>`).join("") + `</div>`;
    body += `<div class="health-form"><div class="field"><label class="lbl">简短日记</label><textarea id="mood-note" placeholder="今天发生了什么，感受如何"></textarea></div>
      <div class="field"><label class="lbl">附一张图（可选）</label><input id="mood-img" type="file" accept="image/*" /></div>
      <button class="btn-primary" id="mood-save">保存心情</button></div>`;
    body += `<div class="group-head"><span class="g-title">${key} 的记录</span></div>`;
    body += list.length ? list.map((m) => `<div class="row"><div class="body"><div class="title">${m.mood} ${escapeHtml(m.note || "")}</div>${m.image ? `<img class="thumb" src="${m.image}" alt="记录图" />` : ""}<div class="meta-line"><span class="tag muted">${m.date}</span></div></div>
      <div class="actions"><button class="btn-icon" data-del-mood="${m.id}" title="删除">${ICON.trash}</button></div></div>`).join("")
      : `<div class="empty">这一天还没记心情。</div>`;
    return body;
  }

  function viewHealthExpense() {
    const key = ui.healthDate || t;
    const cur = t.slice(0, 7);
    const month = state.health.expenses.filter((e) => e.date.slice(0, 7) === cur);
    const inc = month.filter((e) => e.flow === "收入").reduce((a, e) => a + e.amount, 0);
    const out = month.filter((e) => e.flow === "支出").reduce((a, e) => a + e.amount, 0);
    const list = state.health.expenses.slice(0, 30);
    let body = `<div class="page-head"><span class="eyebrow">记账存钱</span><h2>收支随手记</h2>
      <div class="meta">本月 收入 <span class="health-stat">¥${inc}</span> · 支出 <span class="health-stat">¥${out}</span> · 不需要可跳过</div></div>`;
    body += `<div class="health-form">
      <div class="grid2">
        <div class="field"><label class="lbl">类型</label><select id="exp-flow"><option>支出</option><option>收入</option></select></div>
        <div class="field"><label class="lbl">分类</label><input id="exp-cat" placeholder="外卖 / 运动装备 / 工资…" /></div>
        <div class="field"><label class="lbl">金额 (元)</label><input id="exp-amt" type="number" placeholder="0" /></div>
        <div class="field"><label class="lbl">备注</label><input id="exp-note" placeholder="可选" /></div>
      </div>
      <button class="btn-primary" id="exp-add" style="margin-top:12px">记一笔</button>
    </div>`;
    body += list.map((m) => `<div class="row">
      <div class="body"><div class="title">${escapeHtml(m.category || (m.flow === "收入" ? "收入" : "支出"))}${m.note ? " · " + escapeHtml(m.note) : ""}</div>
      <div class="meta-line"><span class="tag muted">${m.date}</span></div></div>
      <div class="actions"><span class="meal-kcal ${m.flow === "收入" ? "" : "kcal-pending"}">${m.flow === "收入" ? "+" : "-"}¥${m.amount}</span>
      <button class="btn-icon" data-del-exp="${m.id}" title="删除">${ICON.trash}</button></div></div>`).join("");
    if (!list.length) body += `<div class="empty"><div class="big">还没有记账</div>外卖、装备、工资都能记。</div>`;
    return body;
  }

  // 饮食计划：基于内置规则搭配的简易估算
  const PLAN_POOL = {
    早餐: [["燕麦 + 牛奶 + 鸡蛋", 350], ["全麦面包 + 牛奶 + 水果", 380], ["杂粮粥 + 鸡蛋 + 青菜", 320], ["酸奶 + 麦片 + 香蕉", 340]],
    午餐: [["糙米饭 + 鸡胸 + 西兰花", 520], ["荞麦面 + 牛肉 + 蔬菜", 560], ["杂粮饭 + 鱼 + 青菜", 540], ["藜麦 + 豆腐 + 时蔬", 480]],
    晚餐: [["红薯 + 鸡胸 + 沙拉", 430], ["杂粮饭 + 虾 + 蔬菜", 470], ["豆腐汤 + 蒸蛋 + 青菜", 400], ["玉米 + 瘦肉 + 西兰花", 450]],
    加餐: [["坚果 + 酸奶", 200], ["水果 + 牛奶", 180], ["小份饼干 + 茶", 160]],
  };
  function viewHealthPlan() {
    const target = state.health.dietTarget;
    const splits = [["早餐", 0.25], ["午餐", 0.35], ["晚餐", 0.3], ["加餐", 0.1]];
    let body = `<div class="page-head"><span class="eyebrow">饮食计划</span><h2>给自己一个可执行的安排</h2>
      <div class="meta">内置规则搭配与估算，非个体营养方案；按自己已定目标调整</div></div>`;
    body += `<div class="health-form">
      <div class="grid2">
        <div class="field"><label class="lbl">模式</label><select id="plan-mode"><option ${ui.planMode === "自炊" ? "selected" : ""}>自炊</option><option ${ui.planMode === "外卖" ? "selected" : ""}>外卖</option></select></div>
        <div class="field"><label class="lbl">天数</label><select id="plan-days"><option value="1" ${ui.planDays == 1 ? "selected" : ""}>1 天</option><option value="7" ${ui.planDays == 7 ? "selected" : ""}>7 天</option><option value="28" ${ui.planDays == 28 ? "selected" : ""}>28 天</option></select></div>
      </div>
      <div class="field"><label class="lbl">每日热量目标</label><input id="plan-target" type="number" value="${target}" /></div>
      <button class="btn-primary" id="plan-gen" style="margin-top:12px">生成计划</button>
    </div>`;
    body += `<div id="plan-out"></div>`;
    if (ui.planShown) body += renderPlan(target, ui.planMode, ui.planDays, splits);
    return body;
  }
  function renderPlan(target, mode, days, splits) {
    const out = [];
    const shop = {};
    for (let d = 0; d < days; d++) {
      const items = splits.map(([meal, ratio]) => {
        const pool = PLAN_POOL[meal];
        const pick = pool[(d + meal.length) % pool.length];
        const kcal = Math.round(target * ratio);
        (shop[meal] = shop[meal] || new Set()).add(pick[0]);
        return `<div class="plan-meal"><span>${meal} · ${escapeHtml(pick[0])}</span><span class="meal-kcal">≈${kcal} kcal</span></div>`;
      }).join("");
      const total = splits.reduce((a, [, r]) => a + Math.round(target * r), 0);
      out.push(`<div class="plan-day"><h4>第 ${d + 1} 天${mode === "外卖" ? " · 外卖" : " · 自炊"}</h4>${items}<div class="plan-meal" style="border-top:1px solid var(--border-subtle);margin-top:6px;padding-top:6px"><span>合计</span><span class="meal-kcal">≈${total} kcal</span></div></div>`);
    }
    let html = out.join("");
    html += `<div class="group-head"><span class="g-title">购物清单（去重参考）</span></div><div class="meta-line">` +
      Object.keys(shop).map((m) => `<span class="tag">${m}</span>` + [...shop[m]].map((x) => `<span class="tag muted">${escapeHtml(x)}</span>`).join(" ")).join(" ") + `</div>`;
    html += `<div class="hint">计划不等于真实摄入；吃完再回到「饮食记录」勾选。孕期、慢病、过敏等请按专业方案调整。</div>`;
    return html;
  }

  function viewHealthMonth() {
    const cursor = ui.monthCursor || (ui.healthDate ? ui.healthDate.slice(0, 7) : t.slice(0, 7));
    const [yy, mm] = cursor.split("-").map(Number);
    const first = new Date(yy, mm - 1, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(yy, mm, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${yy}-${pad(mm)}-${pad(d)}`);
    const sel = ui.monthSel;
    const selEvents = sel ? (state.health.monthEvents[sel] || []) : [];
    const palette = ["#1C7A4F", "#B5821F", "#5B6CC4", "#B5471F", "#6E7B70"];
    let body = `<div class="page-head"><span class="eyebrow">月度计划</span><h2>本地月历</h2>
      <div class="meta">适合放体检、复盘时间、运动安排；不与系统日历自动同步</div></div>`;
    body += `<div class="row-between" style="margin-bottom:8px">
      <button class="btn-ghost" data-month-prev>‹ 上月</button>
      <b class="mono">${cursor}</b>
      <button class="btn-ghost" data-month-next>下月 ›</button></div>`;
    body += `<div style="margin-bottom:8px"><button class="btn-ghost" data-export-ics>导出本月日历 (.ics)</button></div>`;
    body += `<div class="cal-head">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<div>${d}</div>`).join("")}</div>`;
    body += `<div class="cal-grid">` + cells.map((c) => {
      if (!c) return `<div></div>`;
      const evs = state.health.monthEvents[c] || [];
      const isToday = c === t ? "border-color:var(--accent-primary)" : "";
      return `<div class="cal-cell ${sel === c ? "sel" : ""}" data-month-day="${c}" style="${isToday}">
        <div class="dnum">${c.slice(5)}</div>${evs.slice(0, 3).map((e) => `<div class="ev" style="color:${e.color}">${escapeHtml(e.time ? e.time + " " : "")}${escapeHtml(e.content)}</div>`).join("")}</div>`;
    }).join("") + `</div>`;
    if (sel) {
      body += `<div class="group-head"><span class="g-title">${sel} 的安排</span></div>`;
      body += selEvents.map((e) => `<div class="row"><div class="body"><div class="title">${escapeHtml(e.content)}</div>${e.image ? `<img class="thumb" src="${e.image}" alt="图" />` : ""}<div class="meta-line"><span class="tag muted">${escapeHtml(e.time || "全天")}</span></div></div>
        <div class="actions"><button class="btn-icon" data-del-ev='${JSON.stringify({ d: sel, id: e.id })}' title="删除">${ICON.trash}</button></div></div>`).join("");
      body += `<div class="health-form" style="margin-top:12px">
        <div class="grid2">
          <div class="field"><label class="lbl">时间</label><input id="me-time" placeholder="如 09:30" /></div>
          <div class="field"><label class="lbl">内容</label><input id="me-content" placeholder="体检 / 复盘…" /></div>
        </div>
        <div class="field"><label class="lbl">颜色</label><select id="me-color">${palette.map((c) => `<option value="${c}">${c}</option>`).join("")}</select></div>
        <div class="field"><label class="lbl">附一张图（可选）</label><input id="me-img" type="file" accept="image/*" /></div>
        <button class="btn-primary" id="me-add" style="margin-top:12px">添加到 ${sel}</button>
      </div>`;
    } else {
      body += `<div class="empty">点一个日期，添加当天的安排。</div>`;
    }
    return body;
  }

  // ---------- 健康交互绑定 ----------
  function bindHealth() {
    const f = $("#focus");
    // 健康打卡
    const hcDate = $("#hc-date"); if (hcDate) hcDate.onchange = (e) => { ui.healthDate = e.target.value; render(); };
    const hcSave = $("#hc-save"); if (hcSave) hcSave.onclick = () => {
      const key = ui.healthDate || t;
      saveCheckin(key, {
        sleep: $("#hc-sleep").value === "" ? null : Number($("#hc-sleep").value),
        water: $("#hc-water").value === "" ? null : Number($("#hc-water").value),
        weight: $("#hc-weight").value === "" ? null : Number($("#hc-weight").value),
        waist: $("#hc-waist").value === "" ? null : Number($("#hc-waist").value),
        note: $("#hc-note").value,
      });
    };
    const hcDel = $("#hc-del"); if (hcDel) hcDel.onclick = () => deleteCheckin(ui.healthDate || t);
    const hcWeek = $("#hc-week-save"); if (hcWeek) hcWeek.onclick = () => saveWeekReview(weekRange(ui.healthDate || t)[1], $("#hc-week").value);
    const hcCopy = $("#hc-copy"); if (hcCopy) hcCopy.onclick = () => {
      const [mon, sun] = weekRange(ui.healthDate || t);
      const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
      const lines = [];
      days.forEach((d) => {
        const c = state.health.checkins[d] || {};
        const ms = state.health.meals.filter((m) => m.date === d).map((m) => `${m.type}:${m.food}`).join("；");
        const xs = state.health.exercises.filter((m) => m.date === d).map((m) => `${m.type}${m.minutes}分`).join("；");
        if (c.sleep || c.water || c.weight || ms || xs) lines.push(`${d} 睡${c.sleep || "-"}h 水${c.water || "-"}ml 重${c.weight || "-"}kg | 饮食:${ms || "-"} | 运动:${xs || "-"}`);
      });
      const txt = `本周健康记录(${mon}~${sun})\n` + (lines.join("\n") || "（无记录）");
      navigator.clipboard?.writeText(txt); toast("本周记录已复制");
    };
    f.querySelectorAll("[data-hc-day]").forEach((b) => b.onclick = () => { ui.healthDate = b.dataset.hcDay; render(); });
    // 饮食
    const dietAdd = $("#diet-add"); if (dietAdd) dietAdd.onclick = () => {
      const food = $("#diet-food").value.trim(); if (!food) return toast("先写食物");
      const file = document.getElementById("diet-img")?.files?.[0];
      const commit = (img) => addMeal(ui.healthDate || t, $("#diet-type").value, food, $("#diet-kcal").value, img);
      if (file) fileToThumb(file, commit); else commit(null);
    };
    const dietTarget = $("#diet-target"); if (dietTarget) dietTarget.onclick = () => { const v = Number($("#diet-target-val").value); if (v) { state.health.dietTarget = v; save(); render(); toast("目标已更新"); } };
    const foodSearch = $("#food-search");
    if (foodSearch) {
      const renderRes = () => {
        const q = foodSearch.value.trim().toLowerCase();
        const res = !q ? FOODS.slice(0, 12) : FOODS.filter((x) => x.n.toLowerCase().includes(q)).slice(0, 12);
        $("#food-results").innerHTML = res.map((x) => `<div class="fr"><span class="k">${escapeHtml(x.n)}</span><span class="v">${x.k100} kcal/100g · 一份 ${x.s}=${x.sk}</span></div>`).join("") || `<div class="hint">没找到，换个字试试。</div>`;
      };
      foodSearch.oninput = renderRes;
      const clear = $("#food-clear"); if (clear) clear.onclick = () => { foodSearch.value = ""; renderRes(); };
      renderRes();
    }
    // 运动
    const exAdd = $("#ex-add"); if (exAdd) exAdd.onclick = () => {
      const type = $("#ex-type").value.trim(); if (!type) return toast("先填运动类型");
      addExercise(ui.healthDate || t, type, $("#ex-min").value, $("#ex-kcal").value);
    };
    // 心情
    f.querySelectorAll(".mood-opt").forEach((b) => b.onclick = () => { ui.moodPick = b.dataset.mood; f.querySelectorAll(".mood-opt").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
    const moodSave = $("#mood-save"); if (moodSave) moodSave.onclick = () => {
      const note = $("#mood-note").value;
      if (!ui.moodPick && !note.trim()) return toast("选个心情或写点什么");
      const file = document.getElementById("mood-img")?.files?.[0];
      const commit = (img) => { addMood(ui.healthDate || t, ui.moodPick || "🙂", note, img); ui.moodPick = ""; };
      if (file) fileToThumb(file, commit); else commit(null);
    };
    // 记账
    const expAdd = $("#exp-add"); if (expAdd) expAdd.onclick = () => {
      const cat = $("#exp-cat").value.trim(); const amt = Number($("#exp-amt").value);
      if (!amt) return toast("金额不能为空");
      addExpense(ui.healthDate || t, $("#exp-flow").value, cat, amt, $("#exp-note").value);
    };
    // 计划
    const planGen = $("#plan-gen"); if (planGen) planGen.onclick = () => {
      ui.planMode = $("#plan-mode").value; ui.planDays = Number($("#plan-days").value);
      state.health.dietTarget = Number($("#plan-target").value) || state.health.dietTarget; save();
      ui.planShown = true; render();
    };
    // 月度
    f.querySelectorAll("[data-month-day]").forEach((b) => b.onclick = () => { ui.monthSel = b.dataset.monthDay; render(); });
    const meAdd = $("#me-add"); if (meAdd) meAdd.onclick = () => {
      if (!ui.monthSel) return; const c = $("#me-content").value.trim(); if (!c) return toast("先填内容");
      const file = document.getElementById("me-img")?.files?.[0];
      const commit = (img) => addMonthEvent(ui.monthSel, $("#me-time").value, c, $("#me-color").value, img);
      if (file) fileToThumb(file, commit); else commit(null);
    };
  }

  // ---------- 行模板 ----------
  function composeRow(placeholder, onSend) {
    return `<div class="compose">
      <input type="text" placeholder="${escapeHtml(placeholder)}" data-compose />
      <button class="send" data-send>添加</button>
    </div>`;
  }
  function group(title, items, overdue = false) {
    return `<div class="group-head"><span class="g-title">${title}</span><span class="g-count mono">${items.length}</span></div>` +
      items.map(taskRow).join("");
  }
  function taskRow(x) {
    const dl = dueLabel(x.due);
    const prio = x.priority && x.priority !== "none" ? `<span class="prio ${x.priority}">${x.priority === "high" ? "高" : x.priority === "med" ? "中" : "低"}</span>` : "";
    const th = x.threadId ? `<span class="tag thread">${escapeHtml(threadName(x.threadId))}</span>` : "";
    const due = dl ? `<span class="due ${dl.cls}">${dl.text}</span>` : "";
    const agent = x.agentDelegable ? `<span class="tag">可交 Agent</span>` : "";
    return `<div class="row">
      <button class="check ${x.status === "done" ? "done" : ""}" data-toggle="${x.id}">${ICON.check}</button>
      <div class="body">
        <div class="title ${x.status === "done" ? "done" : ""}">${escapeHtml(x.title)}</div>
        <div class="meta-line">${prio}${th}${due}${agent}</div>
      </div>
      <div class="actions">
        <button class="btn-icon" data-edit="${x.id}" title="编辑">${ICON.edit}</button>
        <button class="btn-icon" data-defer="${x.id}" title="推迟一天">${ICON.plus}</button>
        <button class="btn-icon" data-del="${x.id}" title="删除">${ICON.trash}</button>
      </div>
    </div>`;
  }
  function habitRow(h) {
    const last7 = Array.from({ length: 7 }, (_, i) => addDays(t, -6 + i));
    const dots = last7.map((d) => `<span class="d ${h.history[d] ? "on" : ""}"></span>`).join("");
    const streak = (() => { let n = 0; let d = t; while (h.history[d]) { n++; d = addDays(d, -1); } return n; })();
    return `<div class="habit">
      <button class="toggle ${h.history[t] ? "on" : ""}" data-habit="${h.id}">${ICON.check}</button>
      <div class="h-name">${h.icon ? h.icon + " " : ""}${escapeHtml(h.name)}</div>
      <div class="dots">${dots}</div>
      <div class="streak">${streak ? "连续 " + streak + " 天" : ""}</div>
      <button class="btn-icon" data-del-h="${h.id}" title="删除">${ICON.trash}</button>
    </div>`;
  }

  // ---------- 事件绑定 ----------
  function bindFocus() {
    const f = $("#focus");
    // 绑定每条 compose 输入条
    f.querySelectorAll(".compose").forEach((c) => {
      const inp = $("[data-compose]", c); const btn = $("[data-send]", c);
      if (!inp || !btn) return;
      const fire = () => { const v = inp.value.trim(); if (!v) return; window._composeHandler(v); inp.value = ""; };
      btn.onclick = fire; inp.onkeydown = (e) => { if (e.key === "Enter") fire(); };
    });
    f.onclick = (e) => {
      const tgt = e.target.closest("[data-toggle],[data-edit],[data-defer],[data-del],[data-convert],[data-del-in],[data-habit],[data-del-h],[data-gen],[data-edit-th],[data-theme-set],[data-accent-set],[data-briefing-set],[data-haptic-set],[data-export],[data-import],[data-reset],[data-go-health],[data-del-meal],[data-del-ex],[data-del-mood],[data-del-exp],[data-del-ev],[data-month-prev],[data-month-next],[data-rem-toggle],[data-rem-del],[data-export-ics],[data-pin-set],[data-refresh-brief]");
      if (!tgt) return;
      if (tgt.dataset.toggle != null) return toggleTask(tgt.dataset.toggle);
      if (tgt.dataset.edit != null) return openTaskModal(tgt.dataset.edit);
      if (tgt.dataset.defer != null) return deferTask(tgt.dataset.defer);
      if (tgt.dataset.del != null) return deleteTask(tgt.dataset.del);
      if (tgt.dataset.convert != null) return convertInbox(tgt.dataset.convert);
      if (tgt.dataset.delIn != null) return deleteInbox(tgt.dataset.delIn);
      if (tgt.dataset.habit != null) return toggleHabit(tgt.dataset.habit);
      if (tgt.dataset.delH != null) return deleteHabit(tgt.dataset.delH);
      if (tgt.dataset.gen != null) { generateReport(tgt.dataset.gen); render(); toast("日报已生成"); return; }
      if (tgt.dataset.editTh != null) return openThreadModal(tgt.dataset.editTh);
      if (tgt.dataset.themeSet != null) { state.settings.theme = tgt.dataset.themeSet; save(); applyTheme(); render(); return; }
      if (tgt.dataset.accentSet != null) { state.settings.color = tgt.dataset.accentSet; save(); applyTheme(); render(); return; }
      if (tgt.dataset.briefingSet != null) { state.settings.briefing = tgt.dataset.briefingSet; if (state.settings.briefing !== "model") modelBriefing = { status: "idle", items: [], error: "" }; save(); render(); return; }
      if (tgt.dataset.refreshBrief != null) { modelBriefing = { status: "idle", items: [], error: "" }; loadModelBriefing(true); return; }
      if (tgt.dataset.hapticSet != null) { state.settings.haptic = tgt.dataset.hapticSet === "1"; save(); render(); return; }
      if (tgt.dataset.export != null) return exportData();
      if (tgt.dataset.import != null) return $("#importFile").click();
      if (tgt.dataset.reset != null) return resetData();
      if (tgt.dataset.goHealth != null) { ui.view = "health"; ui.healthTab = "checkin"; ui.healthDate = t; render(); return; }
      if (tgt.dataset.delMeal != null) return deleteMeal(tgt.dataset.delMeal);
      if (tgt.dataset.delEx != null) return deleteExercise(tgt.dataset.delEx);
      if (tgt.dataset.delMood != null) return deleteMood(tgt.dataset.delMood);
      if (tgt.dataset.delExp != null) return deleteExpense(tgt.dataset.delExp);
      if (tgt.dataset.delEv != null) { const o = JSON.parse(tgt.dataset.delEv); return deleteMonthEvent(o.d, o.id); }
      const shiftMonth = (ym, d) => { let [y, m] = ym.split("-").map(Number); m += d; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } return `${y}-${pad(m)}`; };
      if (tgt.dataset.monthPrev != null) { ui.monthCursor = shiftMonth(ui.monthCursor || (ui.healthDate || t).slice(0, 7), -1); render(); return; }
      if (tgt.dataset.monthNext != null) { ui.monthCursor = shiftMonth(ui.monthCursor || (ui.healthDate || t).slice(0, 7), 1); render(); return; }
      if (tgt.dataset.remToggle != null) return toggleReminder(tgt.dataset.remToggle);
      if (tgt.dataset.remDel != null) return deleteReminder(tgt.dataset.remDel);
      if (tgt.dataset.exportIcs != null) return exportICS();
      if (tgt.dataset.pinSet != null) return openPinModal();
    };
    const imp = $("#importFile"); if (imp) imp.onchange = (e) => importData(e.target.files[0]);
    const llmProvider = $("#llm-provider");
    if (llmProvider) llmProvider.onchange = () => {
      const p = LLM_PRESETS.find((x) => x.id === llmProvider.value);
      state.settings.llm.provider = llmProvider.value;
      state.settings.llm.baseUrl = p ? p.baseUrl : "";
      state.settings.llm.model = p && p.models[0] ? p.models[0] : "";
      save(); render();
    };
    const llmSave = $("#llm-save");
    if (llmSave) llmSave.onclick = () => {
      state.settings.llm = {
        provider: $("#llm-provider") ? $("#llm-provider").value : (state.settings.llm.provider || "openai"),
        baseUrl: $("#llm-base").value.trim(),
        apiKey: $("#llm-key").value.trim(),
        model: $("#llm-model").value.trim() || "gpt-4o-mini",
      };
      save();
      modelBriefing = { status: "idle", items: [], error: "" };
      toast("模型配置已保存");
      if (ui.view === "today") loadModelBriefing(true); else render();
    };
    f.querySelectorAll(".thumb").forEach((img) => { img.onclick = () => openImage(img.getAttribute("src")); });
    bindHealth();
    bindReminders();
  }

  // ---------- 任务编辑浮层 ----------
  function openTaskModal(id) {
    const x = state.tasks.find((z) => z.id === id); if (!x) return;
    const threadOpts = `<option value="">无线程</option>` + state.threads.map((th) => `<option value="${th.id}" ${th.id === x.threadId ? "selected" : ""}>${escapeHtml(th.name)}</option>`).join("");
    const prioOpts = [["none", "无"], ["low", "低"], ["med", "中"], ["high", "高"]].map(([v, l]) => `<option value="${v}" ${v === x.priority ? "selected" : ""}>${l}</option>`).join("");
    openModal(`编辑任务`, `
      <div class="field"><label>标题</label><input id="m-title" value="${escapeHtml(x.title)}" /></div>
      <div class="field"><label>线程</label><select id="m-thread">${threadOpts}</select></div>
      <div class="field"><label>优先级</label><select id="m-prio">${prioOpts}</select></div>
      <div class="field"><label>截止日期</label><input id="m-due" type="date" value="${x.due || ""}" /></div>
      <div class="field"><label>备注 / 链接</label><textarea id="m-notes">${escapeHtml(x.notes)}</textarea></div>
      <div class="field"><label><input type="checkbox" id="m-agent" ${x.agentDelegable ? "checked" : ""} style="width:auto;vertical-align:middle;margin-right:6px">可交给 Agent 起草方案</label></div>
    `, [
      { label: "删除", cls: "btn-ghost", onClick: () => { closeModal(); deleteTask(x.id); } },
      { label: "保存", cls: "btn-primary", onClick: () => {
        updateTask(x.id, {
          title: $("#m-title").value.trim() || x.title,
          threadId: $("#m-thread").value || null,
          priority: $("#m-prio").value,
          due: $("#m-due").value || null,
          notes: $("#m-notes").value,
          agentDelegable: $("#m-agent").checked,
        });
        closeModal(); toast("已保存");
      } },
    ]);
  }

  function openThreadModal(id) {
    const th = state.threads.find((z) => z.id === id); if (!th) return;
    openModal(`线程现状 · ${th.name}`, `
      <div class="field"><label>一句话现状与下一步</label><input id="m-head" value="${escapeHtml(th.headline)}" placeholder="例如：方案已定，等设计稿" /></div>
    `, [
      { label: "删除线程", cls: "btn-ghost", onClick: () => { closeModal(); deleteThread(th.id); } },
      { label: "保存", cls: "btn-primary", onClick: () => { updateThread(th.id, { headline: $("#m-head").value.trim() }); closeModal(); toast("已更新"); } },
    ]);
  }

  // ---------- 通用 Modal ----------
  function openModal(title, body, actions) {
    const ov = $("#overlay");
    ov.innerHTML = `<div class="modal">
      <div class="modal-head"><h3>${escapeHtml(title)}</h3><button class="btn-icon" data-close>${ICON.trash}</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot">${actions.map((a, i) => `<button class="${a.cls}" data-act="${i}">${escapeHtml(a.label)}</button>`).join("")}</div>
    </div>`;
    ov.classList.remove("hidden");
    ov.querySelector("[data-close]").onclick = closeModal;
    ov.onclick = (e) => { if (e.target === ov) closeModal(); };
    ov.querySelectorAll("[data-act]").forEach((b) => b.onclick = () => actions[+b.dataset.act].onClick());
  }
  function closeModal() { const ov = $("#overlay"); ov.classList.add("hidden"); ov.innerHTML = ""; }
  function openImage(src) {
    const ov = $("#overlay");
    ov.classList.add("show-img"); ov.classList.remove("hidden");
    ov.innerHTML = `<img src="${src}" alt="预览" />`;
    ov.onclick = () => { ov.classList.add("hidden"); ov.classList.remove("show-img"); ov.innerHTML = ""; ov.onclick = null; };
  }

  // ---------- 数据导入导出 ----------
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `daydayup-workbench-${t}.json`;
    a.click(); URL.revokeObjectURL(a.href); toast("已导出");
  }
  function importData(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || !s.tasks) throw new Error("格式不对");
        state = s; save(); ui.view = "today"; render(); toast("已导入");
      } catch (e) { toast("导入失败：" + e.message); }
    };
    r.readAsText(file);
  }
  function resetData() {
    openModal("清空数据", `<p style="color:var(--text-secondary);margin:0">将用初始示例覆盖当前所有数据，确定吗？</p>`, [
      { label: "取消", cls: "btn-ghost", onClick: closeModal },
      { label: "清空", cls: "btn-primary", onClick: () => { state = defaultState(); save(); render(); closeModal(); toast("已恢复初始示例"); } },
    ]);
  }

  // 导出月度计划为 .ics 日历（对标 APP 的 READ_CALENDAR / 系统日历能力）
  function exportICS() {
    const evs = state.health.monthEvents;
    const p2 = (n) => String(n).padStart(2, "0");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DayDayUp Workbench//CN", "CALSCALE:GREGORIAN"];
    Object.keys(evs).forEach((d) => {
      const [y, m, dd] = d.split("-").map(Number);
      evs[d].forEach((e) => {
        const hasTime = e.time && /\d{1,2}:\d{2}/.test(e.time);
        let dtStart, dtEnd;
        if (hasTime) {
          const [hh, mm] = e.time.split(":").map(Number);
          const end = hh * 60 + mm + 30; const eh = Math.floor(end / 60) % 24, em = end % 60;
          dtStart = `${y}${p2(m)}${p2(dd)}T${p2(hh)}${p2(mm)}00`;
          dtEnd = `${y}${p2(m)}${p2(dd)}T${p2(eh)}${p2(em)}00`;
        } else { dtStart = `${y}${p2(m)}${p2(dd)}`; dtEnd = dtStart; }
        lines.push("BEGIN:VEVENT");
        lines.push("UID:" + e.id + "@daydayup");
        lines.push("DTSTART" + (hasTime ? ";TZID=Asia/Shanghai:" : ":") + dtStart);
        lines.push("DTEND" + (hasTime ? ";TZID=Asia/Shanghai:" : ":") + dtEnd);
        lines.push("SUMMARY:" + (e.content || "").replace(/[\n,;]/g, " "));
        lines.push("END:VEVENT");
      });
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "daydayup-calendar.ics"; a.click(); URL.revokeObjectURL(a.href);
    toast("已导出 .ics 日历");
  }

  // 隐私锁（对标 APP 的 USE_BIOMETRIC / 指纹锁；网页版用 PIN 软锁）
  function openPinModal() {
    const cur = state.settings.pin;
    openModal(cur ? "更改 / 关闭隐私锁" : "设置隐私锁", `
      ${cur ? `<div class="field"><label>当前 PIN</label><input id="pin-old" type="password" inputmode="numeric" /></div>` : ""}
      <div class="field"><label>${cur ? "新 PIN（留空 = 关闭）" : "设置 PIN"}</label><input id="pin-new" type="password" inputmode="numeric" placeholder="数字，4 位以上" /></div>
    `, [
      { label: "取消", cls: "btn-ghost", onClick: closeModal },
      { label: cur ? "保存" : "开启", cls: "btn-primary", onClick: () => {
        if (cur && document.getElementById("pin-old").value !== cur) { toast("当前 PIN 不正确"); return; }
        const nv = document.getElementById("pin-new").value;
        if (nv && nv.length < 4) { toast("PIN 至少 4 位"); return; }
        state.settings.pin = nv || ""; save(); closeModal(); render(); toast(nv ? "隐私锁已开启" : "隐私锁已关闭");
      } },
    ]);
  }
  function maybeLock() {
    if (!state.settings.pin) return false;
    const ov = document.getElementById("lock");
    if (!ov) return false;
    ov.classList.remove("hidden");
    ov.innerHTML = `<div class="lock-card">
      <div class="lock-title">🔒 隐私锁</div>
      <div class="lock-sub">输入 PIN 解锁工作台</div>
      <input id="lock-pin" type="password" inputmode="numeric" maxlength="16" placeholder="PIN" autofocus />
      <button class="btn-primary" id="lock-go">解锁</button>
      <button class="btn-ghost" id="lock-forgot">忘记 PIN？清空数据解锁</button>
      <div class="lock-err" id="lock-err"></div>
    </div>`;
    const pinInput = document.getElementById("lock-pin");
    const tryUnlock = () => {
      if (pinInput.value === state.settings.pin) { ov.classList.add("hidden"); ov.innerHTML = ""; }
      else { const e = document.getElementById("lock-err"); if (e) e.textContent = "PIN 不正确"; buzz(60); }
    };
    document.getElementById("lock-go").onclick = tryUnlock;
    pinInput.onkeydown = (e) => { if (e.key === "Enter") tryUnlock(); };
    document.getElementById("lock-forgot").onclick = () => {
      openModal("清空数据解锁", `<p style="color:var(--text-secondary);margin:0">忘记 PIN 将用初始示例覆盖所有数据并解锁。确定吗？</p>`, [
        { label: "取消", cls: "btn-ghost", onClick: closeModal },
        { label: "清空并解锁", cls: "btn-primary", onClick: () => { state = defaultState(); save(); closeModal(); ov.classList.add("hidden"); ov.innerHTML = ""; render(); toast("已恢复初始示例"); } },
      ]);
    };
    return true;
  }

  // ---------- 主题 / Toast ----------
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
    document.documentElement.setAttribute("data-accent", state.settings.color || "emerald");
  }
  function toggleTheme() { state.settings.theme = state.settings.theme === "dark" ? "light" : "dark"; save(); applyTheme(); render(); }
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
  }
  // 震动反馈（APP 的 VIBRATE 能力对应物；本地网页用 Web Vibration API）
  function buzz(ms = 12) {
    if (state.settings.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch {} }
  }
  // 桌面角标：用 document.title 显示待办数（网页版等效于手机桌面角标）
  function badgeCount() {
    let n = openTasks().length;
    if (!state.health.checkins[t]) n += 1; // 今天还没打卡
    return n;
  }

  // ---------- 组合输入处理（按当前视图） ----------
  function composeHandler(v) {
    switch (ui.view) {
      case "inbox": { const isLink = /^https?:\/\//.test(v.trim()); isLink ? addInbox(v.trim(), "link") : addInbox(v.trim(), "note"); break; }
      case "todos": addTask(v); break;
      case "threads": addThread(v); break;
      case "habits": addHabit(v); break;
      default: { const isLink = /^https?:\/\//.test(v.trim()); isLink ? addInbox(v.trim(), "link") : addInbox(v.trim(), "note"); }
    }
  }
  window._composeHandler = composeHandler;

  // ---------- 渲染入口 ----------
  function render() {
    renderRail();
    renderLibrary();
    renderFocus();
    const n = badgeCount();
    document.title = (n ? "(" + n + ") " : "") + "工作台 · DayDayUp";
  }

  // ---------- 启动 ----------
  applyTheme();
  render();
  maybeLock();
  try { startReminderEngine(); } catch {}
})();
