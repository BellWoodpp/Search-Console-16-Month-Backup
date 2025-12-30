const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

const AUTO_ALARM_NAME = "autoArchive";
const AUTO_CONFIG_DEFAULT = {
  enabled: false,
  time: "03:30",
  monthOffsets: [1], // 0 = current month, 1 = previous month, ...
  sitesMode: "default", // default | all
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

function getAuthToken({ interactive }) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!token) return reject(new Error("No OAuth token returned."));
      return resolve(token);
    });
  });
}

function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

async function authedFetch(input, init = {}, { interactive = true } = {}) {
  let token = await getAuthToken({ interactive });
  let res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status !== 401) return res;

  await removeCachedToken(token);
  token = await getAuthToken({ interactive });
  res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
  return res;
}

function monthToRange(month) {
  const [y, m] = month.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  return { startDate, endDate };
}

function makeArchiveKey(siteUrl, month) {
  return `archive:${encodeURIComponent(siteUrl)}:${month}`;
}

function makeQueryArchiveKey(siteUrl, month) {
  return `archive:query:${encodeURIComponent(siteUrl)}:${month}`;
}

function makePageArchiveKey(siteUrl, month) {
  return `archive:page:${encodeURIComponent(siteUrl)}:${month}`;
}

function makeDeviceArchiveKey(siteUrl, month) {
  return `archive:device:${encodeURIComponent(siteUrl)}:${month}`;
}

function makeCountryArchiveKey(siteUrl, month) {
  return `archive:country:${encodeURIComponent(siteUrl)}:${month}`;
}

function makeSearchAppearanceArchiveKey(siteUrl, month) {
  return `archive:searchAppearance:${encodeURIComponent(siteUrl)}:${month}`;
}

function makeDateArchiveKey(siteUrl, month) {
  return `archive:date:${encodeURIComponent(siteUrl)}:${month}`;
}

async function listSites({ interactive = true } = {}) {
  const res = await authedFetch(
    "https://searchconsole.googleapis.com/webmasters/v3/sites",
    {},
    { interactive }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List sites failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  const entries = Array.isArray(json.siteEntry) ? json.siteEntry : [];
  return entries.map((e) => ({
    siteUrl: e.siteUrl,
    permissionLevel: e.permissionLevel
  }));
}

async function queryMonthTotals({ siteUrl, month, interactive = true }) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const res = await authedFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [],
      rowLimit: 1
    })
  }, { interactive });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const row = Array.isArray(json.rows) && json.rows.length ? json.rows[0] : null;
  const totals = {
    clicks: Number(row?.clicks ?? 0),
    impressions: Number(row?.impressions ?? 0),
    ctr: Number(row?.ctr ?? 0),
    position: Number(row?.position ?? 0)
  };

  return { siteUrl, month, startDate, endDate, totals };
}

async function queryMonthQueries({
  siteUrl,
  month,
  maxRows = 1000,
  interactive = true
}) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const safeMaxRows = Math.max(1, Math.min(Number(maxRows) || 1000, 10000));
  const pageSize = Math.min(5000, safeMaxRows);

  const rows = [];
  let startRow = 0;
  let truncated = false;

  while (rows.length < safeMaxRows) {
    const limit = Math.min(pageSize, safeMaxRows - rows.length);
    const res = await authedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: limit,
        startRow
      })
    }, { interactive });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Query failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const got = Array.isArray(json.rows) ? json.rows : [];
    for (const r of got) {
      rows.push({
        query: String(Array.isArray(r.keys) ? r.keys[0] : ""),
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        ctr: Number(r.ctr ?? 0),
        position: Number(r.position ?? 0)
      });
      if (rows.length >= safeMaxRows) break;
    }

    if (got.length < limit) break;
    startRow += got.length;
  }

  if (rows.length >= safeMaxRows) truncated = true;
  return {
    siteUrl,
    month,
    startDate,
    endDate,
    dimension: "query",
    maxRows: safeMaxRows,
    truncated,
    rows
  };
}

async function queryMonthPages({
  siteUrl,
  month,
  maxRows = 1000,
  interactive = true
}) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const safeMaxRows = Math.max(1, Math.min(Number(maxRows) || 1000, 10000));
  const pageSize = Math.min(5000, safeMaxRows);

  const rows = [];
  let startRow = 0;
  let truncated = false;

  while (rows.length < safeMaxRows) {
    const limit = Math.min(pageSize, safeMaxRows - rows.length);
    const res = await authedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: limit,
        startRow
      })
    }, { interactive });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Query failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const got = Array.isArray(json.rows) ? json.rows : [];
    for (const r of got) {
      rows.push({
        page: String(Array.isArray(r.keys) ? r.keys[0] : ""),
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        ctr: Number(r.ctr ?? 0),
        position: Number(r.position ?? 0)
      });
      if (rows.length >= safeMaxRows) break;
    }

    if (got.length < limit) break;
    startRow += got.length;
  }

  if (rows.length >= safeMaxRows) truncated = true;
  return {
    siteUrl,
    month,
    startDate,
    endDate,
    dimension: "page",
    maxRows: safeMaxRows,
    truncated,
    rows
  };
}

async function queryMonthDevices({ siteUrl, month, interactive = true }) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const res = await authedFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["device"],
      rowLimit: 50
    })
  }, { interactive });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const got = Array.isArray(json.rows) ? json.rows : [];
  const rows = got.map((r) => ({
    device: String(Array.isArray(r.keys) ? r.keys[0] : ""),
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0)
  }));

  return {
    siteUrl,
    month,
    startDate,
    endDate,
    dimension: "device",
    rows
  };
}

async function queryMonthCountries({
  siteUrl,
  month,
  maxRows = 1000,
  interactive = true
}) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const safeMaxRows = Math.max(1, Math.min(Number(maxRows) || 1000, 10000));
  const pageSize = Math.min(5000, safeMaxRows);

  const rows = [];
  let startRow = 0;
  let truncated = false;

  while (rows.length < safeMaxRows) {
    const limit = Math.min(pageSize, safeMaxRows - rows.length);
    const res = await authedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["country"],
        rowLimit: limit,
        startRow
      })
    }, { interactive });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Query failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const got = Array.isArray(json.rows) ? json.rows : [];
    for (const r of got) {
      rows.push({
        country: String(Array.isArray(r.keys) ? r.keys[0] : ""),
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        ctr: Number(r.ctr ?? 0),
        position: Number(r.position ?? 0)
      });
      if (rows.length >= safeMaxRows) break;
    }

    if (got.length < limit) break;
    startRow += got.length;
  }

  if (rows.length >= safeMaxRows) truncated = true;
  return {
    siteUrl,
    month,
    startDate,
    endDate,
    dimension: "country",
    maxRows: safeMaxRows,
    truncated,
    rows
  };
}

async function queryMonthSearchAppearances({
  siteUrl,
  month,
  maxRows = 1000,
  interactive = true
}) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const safeMaxRows = Math.max(1, Math.min(Number(maxRows) || 1000, 10000));
  const pageSize = Math.min(5000, safeMaxRows);

  const rows = [];
  let startRow = 0;
  let truncated = false;

  while (rows.length < safeMaxRows) {
    const limit = Math.min(pageSize, safeMaxRows - rows.length);
    const res = await authedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["searchAppearance"],
        rowLimit: limit,
        startRow
      })
    }, { interactive });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Query failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const got = Array.isArray(json.rows) ? json.rows : [];
    for (const r of got) {
      rows.push({
        searchAppearance: String(Array.isArray(r.keys) ? r.keys[0] : ""),
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        ctr: Number(r.ctr ?? 0),
        position: Number(r.position ?? 0)
      });
      if (rows.length >= safeMaxRows) break;
    }

    if (got.length < limit) break;
    startRow += got.length;
  }

  if (rows.length >= safeMaxRows) truncated = true;
  return {
    siteUrl,
    month,
    startDate,
    endDate,
    dimension: "searchAppearance",
    maxRows: safeMaxRows,
    truncated,
    rows
  };
}

async function queryMonthDates({ siteUrl, month, interactive = true }) {
  const { startDate, endDate } = monthToRange(month);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const res = await authedFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["date"],
      rowLimit: 400
    })
  }, { interactive });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const got = Array.isArray(json.rows) ? json.rows : [];
  const rows = got
    .map((r) => ({
      date: String(Array.isArray(r.keys) ? r.keys[0] : ""),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0)
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return {
    siteUrl,
    month,
    startDate,
    endDate,
    dimension: "date",
    rows
  };
}

function addMonthsLocal(date, deltaMonths) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + deltaMonths);
  return d;
}

function toMonthString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function computeNextWhenMs(timeHHMM) {
  const m = /^([01]\\d|2[0-3]):([0-5]\\d)$/.exec(String(timeHHMM || ""));
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hh, mm, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
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

async function getAutoConfig() {
  const { autoConfig } = await chrome.storage.local.get({
    autoConfig: AUTO_CONFIG_DEFAULT
  });
  return mergeAutoConfig(autoConfig);
}

async function rescheduleAutoArchive() {
  const cfg = await getAutoConfig();
  if (!cfg.enabled) {
    await chrome.alarms.clear(AUTO_ALARM_NAME);
    return;
  }
  const when = computeNextWhenMs(cfg.time);
  if (!when) {
    await chrome.alarms.clear(AUTO_ALARM_NAME);
    await chrome.storage.local.set({
      autoLastError: `Invalid time: ${cfg.time}`
    });
    return;
  }
  chrome.alarms.create(AUTO_ALARM_NAME, {
    when,
    periodInMinutes: 24 * 60
  });
}

function isoCompact() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function hasDownloadsPermission() {
  if (!chrome.permissions?.contains) return false;
  return await new Promise((resolve) => {
    chrome.permissions.contains({ permissions: ["downloads"] }, (ok) =>
      resolve(Boolean(ok))
    );
  });
}

async function downloadTextFile({ filename, text, mimeType }) {
  if (!chrome.downloads?.download) {
    throw new Error("chrome.downloads is unavailable (missing permission?).");
  }
  const blob = new Blob([text], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const downloadId = await new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        conflictAction: "uniquify",
        saveAs: false
      },
      (id) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        if (!id) return reject(new Error("No download id returned."));
        resolve(id);
      }
    );
  });

  // Revoke URL after download completes/interrupted.
  const onChanged = (delta) => {
    if (delta.id !== downloadId) return;
    if (!delta.state?.current) return;
    if (delta.state.current !== "complete" && delta.state.current !== "interrupted")
      return;
    chrome.downloads.onChanged.removeListener(onChanged);
    URL.revokeObjectURL(url);
  };
  chrome.downloads.onChanged.addListener(onChanged);
}

async function runAutoArchive({ interactive, force = false }) {
  const cfg = await getAutoConfig();
  if (!cfg.enabled && !force) return { ok: true, skipped: true };

  const monthBase = new Date();
  const offsets = Array.isArray(cfg.monthOffsets) && cfg.monthOffsets.length ? cfg.monthOffsets : [1];
  const months = offsets.map((off) => toMonthString(addMonthsLocal(monthBase, -Number(off || 0))));

  const { defaultSiteUrl } = await chrome.storage.local.get({
    defaultSiteUrl: ""
  });

  let siteUrls = [];
  if (cfg.sitesMode === "all") {
    const sites = await listSites({ interactive });
    siteUrls = sites.map((s) => s.siteUrl).filter(Boolean);
  } else {
    if (!defaultSiteUrl) {
      throw new Error("defaultSiteUrl is empty (set it in Options).");
    }
    siteUrls = [defaultSiteUrl];
  }

  const exportPayload = {
    runAt: new Date().toISOString(),
    months,
    sitesMode: cfg.sitesMode,
    include: cfg.include,
    maxRows: cfg.maxRows,
    results: []
  };

  const results = [];
  for (const siteUrl of siteUrls) {
    const perSite = { siteUrl, months: [] };
    for (const month of months) {
      const r = { month, saved: [] };
      if (cfg.include.totals) {
        const rec = await queryMonthTotals({ siteUrl, month, interactive });
        await saveArchive(rec);
        r.saved.push("totals");
        exportPayload.results.push({ type: "totals", record: rec });
      }
      if (cfg.include.query) {
        const rec = await queryMonthQueries({
          siteUrl,
          month,
          maxRows: cfg.maxRows.query,
          interactive
        });
        await saveQueryArchive(rec);
        r.saved.push("query");
        exportPayload.results.push({ type: "query", record: rec });
      }
      if (cfg.include.page) {
        const rec = await queryMonthPages({
          siteUrl,
          month,
          maxRows: cfg.maxRows.page,
          interactive
        });
        await savePageArchive(rec);
        r.saved.push("page");
        exportPayload.results.push({ type: "page", record: rec });
      }
      if (cfg.include.device) {
        const rec = await queryMonthDevices({ siteUrl, month, interactive });
        await saveDeviceArchive(rec);
        r.saved.push("device");
        exportPayload.results.push({ type: "device", record: rec });
      }
      if (cfg.include.country) {
        const rec = await queryMonthCountries({
          siteUrl,
          month,
          maxRows: cfg.maxRows.country,
          interactive
        });
        await saveCountryArchive(rec);
        r.saved.push("country");
        exportPayload.results.push({ type: "country", record: rec });
      }
      if (cfg.include.searchAppearance) {
        const rec = await queryMonthSearchAppearances({
          siteUrl,
          month,
          maxRows: cfg.maxRows.searchAppearance,
          interactive
        });
        await saveSearchAppearanceArchive(rec);
        r.saved.push("searchAppearance");
        exportPayload.results.push({ type: "searchAppearance", record: rec });
      }
      if (cfg.include.date) {
        const rec = await queryMonthDates({ siteUrl, month, interactive });
        await saveDateArchive(rec);
        r.saved.push("date");
        exportPayload.results.push({ type: "date", record: rec });
      }
      perSite.months.push(r);
    }
    results.push(perSite);
  }

  if (cfg.export?.enabled) {
    const ok = await hasDownloadsPermission();
    if (!ok) {
      throw new Error("Downloads permission not granted (enable it in Options).");
    }
    const from = months[0] || "unknown";
    const to = months[months.length - 1] || from;
    const filename = `gsc-auto-archive-${from}_to_${to}-${isoCompact()}.json`;
    await downloadTextFile({
      filename,
      text: JSON.stringify(exportPayload, null, 2),
      mimeType: "application/json"
    });
  }

  return { ok: true, months, results, exported: Boolean(cfg.export?.enabled) };
}

async function saveArchive(record) {
  const key = makeArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function saveQueryArchive(record) {
  const key = makeQueryArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function savePageArchive(record) {
  const key = makePageArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function saveDeviceArchive(record) {
  const key = makeDeviceArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function saveCountryArchive(record) {
  const key = makeCountryArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function saveSearchAppearanceArchive(record) {
  const key = makeSearchAppearanceArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function saveDateArchive(record) {
  const key = makeDateArchiveKey(record.siteUrl, record.month);
  const payload = { ...record, archivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [key]: payload });
  return payload;
}

async function getQueryArchive({ siteUrl, month }) {
  const key = makeQueryArchiveKey(siteUrl, month);
  const got = await chrome.storage.local.get(key);
  return got[key] ?? null;
}

async function getPageArchive({ siteUrl, month }) {
  const key = makePageArchiveKey(siteUrl, month);
  const got = await chrome.storage.local.get(key);
  return got[key] ?? null;
}

async function getDeviceArchive({ siteUrl, month }) {
  const key = makeDeviceArchiveKey(siteUrl, month);
  const got = await chrome.storage.local.get(key);
  return got[key] ?? null;
}

async function getCountryArchive({ siteUrl, month }) {
  const key = makeCountryArchiveKey(siteUrl, month);
  const got = await chrome.storage.local.get(key);
  return got[key] ?? null;
}

async function getSearchAppearanceArchive({ siteUrl, month }) {
  const key = makeSearchAppearanceArchiveKey(siteUrl, month);
  const got = await chrome.storage.local.get(key);
  return got[key] ?? null;
}

async function getDateArchive({ siteUrl, month }) {
  const key = makeDateArchiveKey(siteUrl, month);
  const got = await chrome.storage.local.get(key);
  return got[key] ?? null;
}

async function getAllArchives() {
  const all = await chrome.storage.local.get(null);
  const archives = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith("archive:")) continue;
    if (key.startsWith("archive:query:")) continue;
    if (key.startsWith("archive:page:")) continue;
    if (key.startsWith("archive:device:")) continue;
    if (key.startsWith("archive:country:")) continue;
    if (key.startsWith("archive:searchAppearance:")) continue;
    if (key.startsWith("archive:date:")) continue;
    if (value && typeof value === "object") archives.push(value);
  }
  archives.sort((a, b) => {
    const sa = String(a.siteUrl ?? "");
    const sb = String(b.siteUrl ?? "");
    if (sa !== sb) return sa.localeCompare(sb);
    return String(a.month ?? "").localeCompare(String(b.month ?? ""));
  });
  return archives;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "auth") {
        const token = await getAuthToken({ interactive: true });
        sendResponse({ ok: true, tokenPresent: Boolean(token), scopes: SCOPES });
        return;
      }

      if (msg?.type === "listSites") {
        const sites = await listSites();
        sendResponse({ ok: true, sites });
        return;
      }

      if (msg?.type === "archiveMonthTotals") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthTotals({ siteUrl, month });
        const saved = await saveArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "archiveMonthQueries") {
        const { siteUrl, month, maxRows } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthQueries({ siteUrl, month, maxRows });
        const saved = await saveQueryArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "archiveMonthPages") {
        const { siteUrl, month, maxRows } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthPages({ siteUrl, month, maxRows });
        const saved = await savePageArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "archiveMonthDevices") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthDevices({ siteUrl, month });
        const saved = await saveDeviceArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "archiveMonthCountries") {
        const { siteUrl, month, maxRows } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthCountries({ siteUrl, month, maxRows });
        const saved = await saveCountryArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "archiveMonthSearchAppearances") {
        const { siteUrl, month, maxRows } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthSearchAppearances({
          siteUrl,
          month,
          maxRows
        });
        const saved = await saveSearchAppearanceArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "archiveMonthDates") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await queryMonthDates({ siteUrl, month });
        const saved = await saveDateArchive(record);
        sendResponse({ ok: true, record: saved });
        return;
      }

      if (msg?.type === "getArchives") {
        const archives = await getAllArchives();
        sendResponse({ ok: true, archives });
        return;
      }

      if (msg?.type === "getQueryArchive") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await getQueryArchive({ siteUrl, month });
        sendResponse({ ok: true, record });
        return;
      }

      if (msg?.type === "getPageArchive") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await getPageArchive({ siteUrl, month });
        sendResponse({ ok: true, record });
        return;
      }

      if (msg?.type === "getDeviceArchive") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await getDeviceArchive({ siteUrl, month });
        sendResponse({ ok: true, record });
        return;
      }

      if (msg?.type === "getCountryArchive") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await getCountryArchive({ siteUrl, month });
        sendResponse({ ok: true, record });
        return;
      }

      if (msg?.type === "getSearchAppearanceArchive") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await getSearchAppearanceArchive({ siteUrl, month });
        sendResponse({ ok: true, record });
        return;
      }

      if (msg?.type === "getDateArchive") {
        const { siteUrl, month } = msg ?? {};
        if (!siteUrl || !month) throw new Error("siteUrl and month required.");
        const record = await getDateArchive({ siteUrl, month });
        sendResponse({ ok: true, record });
        return;
      }

      if (msg?.type === "runAutoArchiveNow") {
        const result = await runAutoArchive({ interactive: true, force: true });
        await chrome.storage.local.set({
          autoLastRunAt: new Date().toISOString(),
          autoLastError: ""
        });
        chrome.action.setBadgeText({ text: "" });
        sendResponse({ ok: true, result });
        return;
      }

      if (msg?.type === "rescheduleAutoArchive") {
        await rescheduleAutoArchive();
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: `Unknown message type: ${msg?.type}` });
    } catch (e) {
      sendResponse({ ok: false, error: e?.message ?? String(e) });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  rescheduleAutoArchive();
});

chrome.runtime.onStartup.addListener(() => {
  rescheduleAutoArchive();
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.autoConfig) return;
  rescheduleAutoArchive();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== AUTO_ALARM_NAME) return;
  (async () => {
    try {
      const result = await runAutoArchive({ interactive: false });
      if (result?.skipped) return;
      await chrome.storage.local.set({
        autoLastRunAt: new Date().toISOString(),
        autoLastError: ""
      });
      chrome.action.setBadgeText({ text: "" });
    } catch (e) {
      const msg = e?.message ?? String(e);
      await chrome.storage.local.set({
        autoLastRunAt: new Date().toISOString(),
        autoLastError: msg
      });
      chrome.action.setBadgeBackgroundColor({ color: "#b00020" });
      chrome.action.setBadgeText({ text: "!" });
    }
  })();
});
