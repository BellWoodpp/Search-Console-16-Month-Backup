const els = {
  defaultSiteUrl: document.getElementById("defaultSiteUrl"),
  status: document.getElementById("status"),
  autoStatus: document.getElementById("autoStatus"),
  autoEnabled: document.getElementById("autoEnabled"),
  autoTime: document.getElementById("autoTime"),
  autoMonths: document.getElementById("autoMonths"),
  autoSitesMode: document.getElementById("autoSitesMode"),
  incTotals: document.getElementById("incTotals"),
  incQuery: document.getElementById("incQuery"),
  incPage: document.getElementById("incPage"),
  incDevice: document.getElementById("incDevice"),
  incCountry: document.getElementById("incCountry"),
  incSearchAppearance: document.getElementById("incSearchAppearance"),
  incDate: document.getElementById("incDate"),
  maxRowsQuery: document.getElementById("maxRowsQuery"),
  maxRowsPage: document.getElementById("maxRowsPage"),
  maxRowsCountry: document.getElementById("maxRowsCountry"),
  maxRowsSearchAppearance: document.getElementById("maxRowsSearchAppearance"),
  exportEnabled: document.getElementById("exportEnabled"),
  exportFormat: document.getElementById("exportFormat"),
  grantDownloads: document.getElementById("grantDownloads"),
  save: document.getElementById("save"),
  runNow: document.getElementById("runNow")
};

const AUTO_CONFIG_DEFAULT = {
  enabled: false,
  time: "03:30",
  monthOffsets: [1], // 0 = current month, 1 = previous month, ...
  sitesMode: "default",
  include: {
    totals: true,
    query: false,
    page: false,
    device: false,
    country: false,
    searchAppearance: false,
    date: false
  },
  maxRows: {
    query: 1000,
    page: 1000,
    country: 1000,
    searchAppearance: 1000
  },
  export: {
    enabled: false,
    format: "json"
  }
};

function createMonthCheckboxes() {
  els.autoMonths.innerHTML = "";
  const max = 12;

  const makeCheck = ({ id, value, label }) => {
    const wrap = document.createElement("label");
    wrap.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(value);
    input.id = id;
    const span = document.createElement("span");
    span.textContent = label;
    wrap.appendChild(input);
    wrap.appendChild(span);
    return { wrap, input };
  };

  const items = [];
  items.push(
    makeCheck({
      id: "autoMonth0",
      value: 0,
      label: I18N.t("autoMonthThis")
    })
  );
  for (let i = 1; i <= max; i++) {
    items.push(
      makeCheck({
        id: `autoMonth${i}`,
        value: i,
        label: I18N.t("autoMonthAgo", { n: i })
      })
    );
  }

  for (const it of items) els.autoMonths.appendChild(it.wrap);
  return items.map((it) => it.input);
}

function clampMaxRows(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1000;
  return Math.max(1, Math.min(Math.floor(v), 10000));
}

function mergeAutoConfig(cfg) {
  const merged = structuredClone(AUTO_CONFIG_DEFAULT);
  if (!cfg || typeof cfg !== "object") return merged;
  merged.enabled = Boolean(cfg.enabled);
  merged.time = typeof cfg.time === "string" ? cfg.time : merged.time;
  merged.sitesMode = cfg.sitesMode === "all" ? "all" : "default";

  if (Array.isArray(cfg.monthOffsets) && cfg.monthOffsets.length) {
    const norm = cfg.monthOffsets
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 24);
    merged.monthOffsets = Array.from(new Set(norm)).sort((a, b) => a - b);
  } else if (cfg.monthMode === "current") {
    merged.monthOffsets = [0];
  } else if (cfg.monthMode === "previous") {
    merged.monthOffsets = [1];
  }

  const include = cfg.include && typeof cfg.include === "object" ? cfg.include : {};
  for (const k of Object.keys(merged.include)) {
    merged.include[k] = Boolean(include[k]);
  }

  const maxRows = cfg.maxRows && typeof cfg.maxRows === "object" ? cfg.maxRows : {};
  merged.maxRows.query = clampMaxRows(maxRows.query ?? merged.maxRows.query);
  merged.maxRows.page = clampMaxRows(maxRows.page ?? merged.maxRows.page);
  merged.maxRows.country = clampMaxRows(maxRows.country ?? merged.maxRows.country);
  merged.maxRows.searchAppearance = clampMaxRows(
    maxRows.searchAppearance ?? merged.maxRows.searchAppearance
  );

  const exp = cfg.export && typeof cfg.export === "object" ? cfg.export : {};
  merged.export.enabled = Boolean(exp.enabled);
  merged.export.format = exp.format === "json" ? "json" : "json";
  return merged;
}

function renderAutoStatus({ autoLastRunAt, autoLastError }) {
  const parts = [];
  if (autoLastRunAt) parts.push(I18N.t("autoLastRun", { ts: autoLastRunAt }));
  if (autoLastError) parts.push(I18N.t("autoLastError", { err: autoLastError }));
  els.autoStatus.textContent = parts.join("\n");
}

async function load() {
  await I18N.init();
  await I18N.apply(document);
  await I18N.bindLanguageSelectors(document);
  const monthCheckboxes = createMonthCheckboxes();

  const { defaultSiteUrl, autoConfig, autoLastRunAt, autoLastError } =
    await chrome.storage.local.get({
      defaultSiteUrl: "",
      autoConfig: AUTO_CONFIG_DEFAULT,
      autoLastRunAt: "",
      autoLastError: ""
    });

  els.defaultSiteUrl.value = defaultSiteUrl;

  const cfg = mergeAutoConfig(autoConfig);
  els.autoEnabled.checked = cfg.enabled;
  els.autoTime.value = cfg.time;
  els.autoSitesMode.value = cfg.sitesMode;

  for (const cb of monthCheckboxes) {
    const offset = Number(cb.value);
    cb.checked = cfg.monthOffsets.includes(offset);
  }

  els.incTotals.checked = cfg.include.totals;
  els.incQuery.checked = cfg.include.query;
  els.incPage.checked = cfg.include.page;
  els.incDevice.checked = cfg.include.device;
  els.incCountry.checked = cfg.include.country;
  els.incSearchAppearance.checked = cfg.include.searchAppearance;
  els.incDate.checked = cfg.include.date;

  els.maxRowsQuery.value = String(cfg.maxRows.query);
  els.maxRowsPage.value = String(cfg.maxRows.page);
  els.maxRowsCountry.value = String(cfg.maxRows.country);
  els.maxRowsSearchAppearance.value = String(cfg.maxRows.searchAppearance);

  els.exportEnabled.checked = Boolean(cfg.export?.enabled);
  els.exportFormat.value = cfg.export?.format === "json" ? "json" : "json";

  renderAutoStatus({ autoLastRunAt, autoLastError });
}

async function save() {
  const defaultSiteUrl = els.defaultSiteUrl.value.trim();

  const monthOffsets = Array.from(
    els.autoMonths.querySelectorAll('input[type="checkbox"]')
  )
    .filter((el) => el.checked)
    .map((el) => Number(el.value))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 24)
    .sort((a, b) => a - b);

  if (!monthOffsets.length) {
    els.status.textContent = I18N.t("autoMonthNoneError");
    setTimeout(() => (els.status.textContent = ""), 2500);
    return;
  }

  const autoConfig = {
    enabled: Boolean(els.autoEnabled.checked),
    time: String(els.autoTime.value || "03:30"),
    monthOffsets,
    sitesMode: els.autoSitesMode.value === "all" ? "all" : "default",
    include: {
      totals: Boolean(els.incTotals.checked),
      query: Boolean(els.incQuery.checked),
      page: Boolean(els.incPage.checked),
      device: Boolean(els.incDevice.checked),
      country: Boolean(els.incCountry.checked),
      searchAppearance: Boolean(els.incSearchAppearance.checked),
      date: Boolean(els.incDate.checked)
    },
    maxRows: {
      query: clampMaxRows(els.maxRowsQuery.value),
      page: clampMaxRows(els.maxRowsPage.value),
      country: clampMaxRows(els.maxRowsCountry.value),
      searchAppearance: clampMaxRows(els.maxRowsSearchAppearance.value)
    },
    export: {
      enabled: Boolean(els.exportEnabled.checked),
      format: els.exportFormat.value === "json" ? "json" : "json"
    }
  };

  await chrome.storage.local.set({ defaultSiteUrl, autoConfig });

  // Ask the service worker to reschedule immediately (storage.onChanged should also handle it).
  chrome.runtime.sendMessage({ type: "rescheduleAutoArchive" });

  els.status.textContent = I18N.t("savedToast");
  setTimeout(() => (els.status.textContent = ""), 1500);
}

async function runNow() {
  els.status.textContent = I18N.t("autoRunningToast");
  const resp = await chrome.runtime.sendMessage({ type: "runAutoArchiveNow" });
  if (!resp?.ok) {
    els.status.textContent = resp?.error ?? I18N.t("autoRunFailedToast");
    return;
  }
  els.status.textContent = I18N.t("autoRunOkToast");
  await load();
  setTimeout(() => (els.status.textContent = ""), 1500);
}

async function grantDownloads() {
  const granted = await new Promise((resolve) => {
    chrome.permissions.request({ permissions: ["downloads"] }, (ok) => {
      resolve(Boolean(ok));
    });
  });
  els.status.textContent = granted
    ? I18N.t("autoExportGrantedToast")
    : I18N.t("autoExportDeniedToast");
  setTimeout(() => (els.status.textContent = ""), 2000);
}

els.save.addEventListener("click", save);
els.runNow.addEventListener("click", runNow);
els.grantDownloads.addEventListener("click", grantDownloads);
load();
