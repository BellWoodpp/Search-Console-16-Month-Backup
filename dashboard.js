const els = {
  auth: document.getElementById("auth"),
  listSites: document.getElementById("listSites"),
  authState: document.getElementById("authState"),
  siteSelect: document.getElementById("siteSelect"),
  month: document.getElementById("month"),
  sync: document.getElementById("sync"),
  status: document.getElementById("status"),
  openOptions: document.getElementById("openOptions"),
  rangeStart: document.getElementById("rangeStart"),
  rangeEnd: document.getElementById("rangeEnd"),
  runRange: document.getElementById("runRange"),
  rangeIncTotals: document.getElementById("rangeIncTotals"),
  rangeIncQuery: document.getElementById("rangeIncQuery"),
  rangeIncPage: document.getElementById("rangeIncPage"),
  rangeIncDevice: document.getElementById("rangeIncDevice"),
  rangeIncCountry: document.getElementById("rangeIncCountry"),
  rangeIncSearchAppearance: document.getElementById("rangeIncSearchAppearance"),
  rangeIncDate: document.getElementById("rangeIncDate"),
  rangeMaxRowsQuery: document.getElementById("rangeMaxRowsQuery"),
  rangeMaxRowsPage: document.getElementById("rangeMaxRowsPage"),
  rangeMaxRowsCountry: document.getElementById("rangeMaxRowsCountry"),
  rangeMaxRowsSearchAppearance: document.getElementById(
    "rangeMaxRowsSearchAppearance"
  ),
  refresh: document.getElementById("refresh"),
  exportAll: document.getElementById("exportAll"),
  exportExcel: document.getElementById("exportExcel"),
  exportLibreOffice: document.getElementById("exportLibreOffice"),
  queryMeta: document.getElementById("queryMeta"),
  queryMaxRows: document.getElementById("queryMaxRows"),
  syncQueries: document.getElementById("syncQueries"),
  exportQueryJson: document.getElementById("exportQueryJson"),
  exportQueryExcel: document.getElementById("exportQueryExcel"),
  exportQueryLibreOffice: document.getElementById("exportQueryLibreOffice"),
  queryRows: document.getElementById("queryRows"),
  pageMeta: document.getElementById("pageMeta"),
  pageMaxRows: document.getElementById("pageMaxRows"),
  syncPages: document.getElementById("syncPages"),
  exportPageJson: document.getElementById("exportPageJson"),
  exportPageExcel: document.getElementById("exportPageExcel"),
  exportPageLibreOffice: document.getElementById("exportPageLibreOffice"),
  pageRows: document.getElementById("pageRows"),
  deviceMeta: document.getElementById("deviceMeta"),
  syncDevices: document.getElementById("syncDevices"),
  exportDeviceJson: document.getElementById("exportDeviceJson"),
  exportDeviceExcel: document.getElementById("exportDeviceExcel"),
  exportDeviceLibreOffice: document.getElementById("exportDeviceLibreOffice"),
  deviceRows: document.getElementById("deviceRows"),
  countryMeta: document.getElementById("countryMeta"),
  countryMaxRows: document.getElementById("countryMaxRows"),
  syncCountries: document.getElementById("syncCountries"),
  exportCountryJson: document.getElementById("exportCountryJson"),
  exportCountryExcel: document.getElementById("exportCountryExcel"),
  exportCountryLibreOffice: document.getElementById("exportCountryLibreOffice"),
  countryRows: document.getElementById("countryRows"),
  searchAppearanceMeta: document.getElementById("searchAppearanceMeta"),
  searchAppearanceMaxRows: document.getElementById("searchAppearanceMaxRows"),
  syncSearchAppearances: document.getElementById("syncSearchAppearances"),
  exportSearchAppearanceJson: document.getElementById("exportSearchAppearanceJson"),
  exportSearchAppearanceExcel: document.getElementById("exportSearchAppearanceExcel"),
  exportSearchAppearanceLibreOffice: document.getElementById(
    "exportSearchAppearanceLibreOffice"
  ),
  searchAppearanceRows: document.getElementById("searchAppearanceRows"),
  dateMeta: document.getElementById("dateMeta"),
  syncDates: document.getElementById("syncDates"),
  exportDateJson: document.getElementById("exportDateJson"),
  exportDateExcel: document.getElementById("exportDateExcel"),
  exportDateLibreOffice: document.getElementById("exportDateLibreOffice"),
  dateRows: document.getElementById("dateRows"),
  archives: document.getElementById("archives")
};

function setStatus(text, { danger = false } = {}) {
  els.status.textContent = text ?? "";
  els.status.classList.toggle("danger", Boolean(danger));
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function excelCell(value) {
  if (value === null || value === undefined) {
    return `<Cell><Data ss:Type="String"></Data></Cell>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function downloadExcelXmlTable({ filename, sheetName, header, rows }) {
  const tableRows = [];
  tableRows.push(`<Row>${header.map((h) => excelCell(h)).join("")}</Row>`);
  for (const row of rows) {
    tableRows.push(`<Row>${row.map((v) => excelCell(v)).join("")}</Row>`);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n` +
    ` xmlns:o="urn:schemas-microsoft-com:office:office"\n` +
    ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n` +
    ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n` +
    ` xmlns:html="http://www.w3.org/TR/REC-html40">\n` +
    `<Worksheet ss:Name="${escapeXml(sheetName)}">\n` +
    `<Table>\n` +
    `${tableRows.join("\n")}\n` +
    `</Table>\n` +
    `</Worksheet>\n` +
    `</Workbook>\n`;

  const blob = new Blob(["\ufeff", xml], {
    type: "application/vnd.ms-excel"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function u16le(n) {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}

function u32le(n) {
  return new Uint8Array([
    n & 0xff,
    (n >>> 8) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 24) & 0xff
  ]);
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const { dosTime, dosDate } = toDosDateTime();

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = typeof f.data === "string" ? encoder.encode(f.data) : f.data;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = concatBytes([
      u32le(0x04034b50),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(dosTime),
      u16le(dosDate),
      u32le(crc),
      u32le(size),
      u32le(size),
      u16le(nameBytes.length),
      u16le(0),
      nameBytes
    ]);

    localParts.push(localHeader, dataBytes);

    const centralHeader = concatBytes([
      u32le(0x02014b50),
      u16le(20),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(dosTime),
      u16le(dosDate),
      u32le(crc),
      u32le(size),
      u32le(size),
      u16le(nameBytes.length),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(0),
      u32le(offset),
      nameBytes
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDir = concatBytes(centralParts);
  const centralOffset = offset;
  const centralSize = centralDir.length;

  const eocd = concatBytes([
    u32le(0x06054b50),
    u16le(0),
    u16le(0),
    u16le(files.length),
    u16le(files.length),
    u32le(centralSize),
    u32le(centralOffset),
    u16le(0)
  ]);

  return concatBytes([...localParts, centralDir, eocd]);
}

function escapeXmlText(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function odsCell(value) {
  const p = `<text:p>${escapeXmlText(value ?? "")}</text:p>`;
  return `<table:table-cell office:value-type="string">${p}</table:table-cell>`;
}

function odsNumberCell(value) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const p = `<text:p>${escapeXmlText(String(n))}</text:p>`;
  return `<table:table-cell office:value-type="float" office:value="${n}">${p}</table:table-cell>`;
}

function odsAutoCell(value) {
  if (typeof value === "number" && Number.isFinite(value))
    return odsNumberCell(value);
  return odsCell(value ?? "");
}

function buildOdsContentXmlTable({ sheetName, header, rows }) {
  const tableRows = [];
  tableRows.push(`<table:table-row>${header.map((h) => odsCell(h)).join("")}</table:table-row>`);
  for (const row of rows) {
    tableRows.push(`<table:table-row>${row.map((v) => odsAutoCell(v)).join("")}</table:table-row>`);
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<office:document-content ` +
    `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ` +
    `xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ` +
    `xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ` +
    `xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" ` +
    `office:version="1.2">\n` +
    `<office:body>\n` +
    `<office:spreadsheet>\n` +
    `<table:table table:name="${escapeXmlText(sheetName)}">\n` +
    `${tableRows.join("\n")}\n` +
    `</table:table>\n` +
    `</office:spreadsheet>\n` +
    `</office:body>\n` +
    `</office:document-content>\n`
  );
}

function buildOdsManifestXml() {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<manifest:manifest ` +
    `xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" ` +
    `manifest:version="1.2">\n` +
    `<manifest:file-entry manifest:full-path="/" ` +
    `manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>\n` +
    `<manifest:file-entry manifest:full-path="content.xml" ` +
    `manifest:media-type="text/xml"/>\n` +
    `<manifest:file-entry manifest:full-path="META-INF/manifest.xml" ` +
    `manifest:media-type="text/xml"/>\n` +
    `</manifest:manifest>\n`
  );
}

function downloadOdsTable({ filename, sheetName, header, rows }) {
  const contentXml = buildOdsContentXmlTable({ sheetName, header, rows });
  const manifestXml = buildOdsManifestXml();

  const zipBytes = zipStore([
    {
      name: "mimetype",
      data: "application/vnd.oasis.opendocument.spreadsheet"
    },
    { name: "content.xml", data: contentXml },
    { name: "META-INF/manifest.xml", data: manifestXml }
  ]);

  const blob = new Blob([zipBytes], {
    type: "application/vnd.oasis.opendocument.spreadsheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fmtNumber(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function fmtCtr(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return `${(n * 100).toFixed(2)}%`;
}

function getMonthTotalsRows(archives) {
  const header = [
    I18N.t("thSite"),
    I18N.t("thMonth"),
    I18N.t("thClicks"),
    I18N.t("thImpressions"),
    I18N.t("thCtr"),
    I18N.t("thPosition"),
    I18N.t("thArchivedAt")
  ];

  const rows = archives.map((r) => {
    const ctrPct =
      typeof r?.totals?.ctr === "number" && Number.isFinite(r.totals.ctr)
        ? `${(r.totals.ctr * 100).toFixed(2)}%`
        : "";
    return [
      r.siteUrl ?? "",
      r.month ?? "",
      Number(r?.totals?.clicks ?? 0),
      Number(r?.totals?.impressions ?? 0),
      ctrPct,
      Number(r?.totals?.position ?? 0),
      r.archivedAt ?? ""
    ];
  });

  return { header, rows };
}

function renderArchives(items) {
  els.archives.innerHTML = "";
  if (!items.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "muted";
    td.textContent = I18N.t("noArchives");
    tr.appendChild(td);
    els.archives.appendChild(tr);
    return;
  }

  for (const a of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(String(a.siteUrl ?? ""))}</td>
      <td>${escapeHtml(String(a.month ?? ""))}</td>
      <td>${fmtNumber(a.totals?.clicks)}</td>
      <td>${fmtNumber(a.totals?.impressions)}</td>
      <td>${fmtCtr(a.totals?.ctr)}</td>
      <td>${fmtNumber(a.totals?.position)}</td>
      <td>${escapeHtml(String(a.archivedAt ?? ""))}</td>
    `;
    els.archives.appendChild(tr);
  }
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sendMessage(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, (resp) => {
      resolve(resp);
    });
  });
}

async function loadDefaultSite() {
  const { defaultSiteUrl } = await chrome.storage.local.get({
    defaultSiteUrl: ""
  });
  if (!defaultSiteUrl) return;
  const opt = document.createElement("option");
  opt.value = defaultSiteUrl;
  opt.textContent = defaultSiteUrl;
  els.siteSelect.insertBefore(opt, els.siteSelect.firstChild);
  els.siteSelect.value = defaultSiteUrl;
}

async function refreshArchives() {
  const resp = await sendMessage("getArchives");
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadArchivesFailed"), {
      danger: true
    });
    return;
  }
  renderArchives(resp.archives ?? []);
}

function renderQueryArchive(record) {
  els.queryRows.innerHTML = "";
  els.queryMeta.textContent = "";

  if (!record) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = I18N.t("noQueryArchive");
    tr.appendChild(td);
    els.queryRows.appendChild(tr);
    return;
  }

  const rowCount = Array.isArray(record.rows) ? record.rows.length : 0;
  const truncated = Boolean(record.truncated);
  const suffix = truncated ? ` ${I18N.t("queryMetaTruncated")}` : "";
  els.queryMeta.textContent = I18N.t("queryMetaPill", { count: rowCount, suffix });

  const rows = Array.isArray(record.rows) ? record.rows : [];
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(String(r.query ?? ""))}</td>
      <td>${fmtNumber(r.clicks)}</td>
      <td>${fmtNumber(r.impressions)}</td>
      <td>${fmtCtr(r.ctr)}</td>
      <td>${fmtNumber(r.position)}</td>
    `;
    els.queryRows.appendChild(tr);
  }
}

async function refreshQueryArchive() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    renderQueryArchive(null);
    return;
  }
  const resp = await sendMessage("getQueryArchive", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadQueryFailed"), { danger: true });
    return;
  }
  renderQueryArchive(resp.record);
}

function renderPageArchive(record) {
  els.pageRows.innerHTML = "";
  els.pageMeta.textContent = "";

  if (!record) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = I18N.t("noPageArchive");
    tr.appendChild(td);
    els.pageRows.appendChild(tr);
    return;
  }

  const rowCount = Array.isArray(record.rows) ? record.rows.length : 0;
  const truncated = Boolean(record.truncated);
  const suffix = truncated ? ` ${I18N.t("pageMetaTruncated")}` : "";
  els.pageMeta.textContent = I18N.t("pageMetaPill", { count: rowCount, suffix });

  const rows = Array.isArray(record.rows) ? record.rows : [];
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(String(r.page ?? ""))}</td>
      <td>${fmtNumber(r.clicks)}</td>
      <td>${fmtNumber(r.impressions)}</td>
      <td>${fmtCtr(r.ctr)}</td>
      <td>${fmtNumber(r.position)}</td>
    `;
    els.pageRows.appendChild(tr);
  }
}

async function refreshPageArchive() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    renderPageArchive(null);
    return;
  }
  const resp = await sendMessage("getPageArchive", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadPageFailed"), { danger: true });
    return;
  }
  renderPageArchive(resp.record);
}

function renderDeviceArchive(record) {
  els.deviceRows.innerHTML = "";
  els.deviceMeta.textContent = "";

  if (!record) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = I18N.t("noDeviceArchive");
    tr.appendChild(td);
    els.deviceRows.appendChild(tr);
    return;
  }

  const rows = Array.isArray(record.rows) ? record.rows : [];
  els.deviceMeta.textContent = I18N.t("deviceMetaPill", { count: rows.length });
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(String(r.device ?? ""))}</td>
      <td>${fmtNumber(r.clicks)}</td>
      <td>${fmtNumber(r.impressions)}</td>
      <td>${fmtCtr(r.ctr)}</td>
      <td>${fmtNumber(r.position)}</td>
    `;
    els.deviceRows.appendChild(tr);
  }
}

async function refreshDeviceArchive() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    renderDeviceArchive(null);
    return;
  }
  const resp = await sendMessage("getDeviceArchive", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadDeviceFailed"), { danger: true });
    return;
  }
  renderDeviceArchive(resp.record);
}

function renderCountryArchive(record) {
  els.countryRows.innerHTML = "";
  els.countryMeta.textContent = "";

  function formatCountry(code) {
    const lang = I18N.getLang?.() || "en";
    const name = window.CountryCodes?.alpha3ToName?.(code, lang);
    const upper = String(code ?? "").toUpperCase();
    if (name) return `${name} (${upper})`;
    return upper || "";
  }

  if (!record) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = I18N.t("noCountryArchive");
    tr.appendChild(td);
    els.countryRows.appendChild(tr);
    return;
  }

  const rowCount = Array.isArray(record.rows) ? record.rows.length : 0;
  const truncated = Boolean(record.truncated);
  const suffix = truncated ? ` ${I18N.t("countryMetaTruncated")}` : "";
  els.countryMeta.textContent = I18N.t("countryMetaPill", { count: rowCount, suffix });

  const rows = Array.isArray(record.rows) ? record.rows : [];
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatCountry(r.country))}</td>
      <td>${fmtNumber(r.clicks)}</td>
      <td>${fmtNumber(r.impressions)}</td>
      <td>${fmtCtr(r.ctr)}</td>
      <td>${fmtNumber(r.position)}</td>
    `;
    els.countryRows.appendChild(tr);
  }
}

async function refreshCountryArchive() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    renderCountryArchive(null);
    return;
  }
  const resp = await sendMessage("getCountryArchive", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadCountryFailed"), { danger: true });
    return;
  }
  renderCountryArchive(resp.record);
}

function renderSearchAppearanceArchive(record) {
  els.searchAppearanceRows.innerHTML = "";
  els.searchAppearanceMeta.textContent = "";

  if (!record) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = I18N.t("noSearchAppearanceArchive");
    tr.appendChild(td);
    els.searchAppearanceRows.appendChild(tr);
    return;
  }

  const rowCount = Array.isArray(record.rows) ? record.rows.length : 0;
  const truncated = Boolean(record.truncated);
  const suffix = truncated ? ` ${I18N.t("searchAppearanceMetaTruncated")}` : "";
  els.searchAppearanceMeta.textContent = I18N.t("searchAppearanceMetaPill", {
    count: rowCount,
    suffix
  });

  const rows = Array.isArray(record.rows) ? record.rows : [];
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(String(r.searchAppearance ?? ""))}</td>
      <td>${fmtNumber(r.clicks)}</td>
      <td>${fmtNumber(r.impressions)}</td>
      <td>${fmtCtr(r.ctr)}</td>
      <td>${fmtNumber(r.position)}</td>
    `;
    els.searchAppearanceRows.appendChild(tr);
  }
}

async function refreshSearchAppearanceArchive() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    renderSearchAppearanceArchive(null);
    return;
  }
  const resp = await sendMessage("getSearchAppearanceArchive", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadSearchAppearanceFailed"), {
      danger: true
    });
    return;
  }
  renderSearchAppearanceArchive(resp.record);
}

function renderDateArchive(record) {
  els.dateRows.innerHTML = "";
  els.dateMeta.textContent = "";

  if (!record) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = I18N.t("noDateArchive");
    tr.appendChild(td);
    els.dateRows.appendChild(tr);
    return;
  }

  const rows = Array.isArray(record.rows) ? record.rows : [];
  els.dateMeta.textContent = I18N.t("dateMetaPill", { count: rows.length });
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(String(r.date ?? ""))}</td>
      <td>${fmtNumber(r.clicks)}</td>
      <td>${fmtNumber(r.impressions)}</td>
      <td>${fmtCtr(r.ctr)}</td>
      <td>${fmtNumber(r.position)}</td>
    `;
    els.dateRows.appendChild(tr);
  }
}

async function refreshDateArchive() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    renderDateArchive(null);
    return;
  }
  const resp = await sendMessage("getDateArchive", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusReadDateFailed"), { danger: true });
    return;
  }
  renderDateArchive(resp.record);
}

function defaultMonthValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMonthToDateLocal(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return new Date(y, mo - 1, 1);
}

function toMonthStringLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonthsLocal(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function clampMaxRows(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1000;
  return Math.max(1, Math.min(Math.floor(v), 10000));
}

els.month.value = defaultMonthValue();
els.queryMaxRows.value = "1000";
els.pageMaxRows.value = "1000";
els.countryMaxRows.value = "1000";
els.searchAppearanceMaxRows.value = "1000";
els.rangeMaxRowsQuery.value = "1000";
els.rangeMaxRowsPage.value = "1000";
els.rangeMaxRowsCountry.value = "1000";
els.rangeMaxRowsSearchAppearance.value = "1000";

els.rangeIncTotals.checked = true;

els.openOptions.addEventListener("click", async () => {
  await chrome.runtime.openOptionsPage();
});

els.runRange.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const start = els.rangeStart.value;
  const end = els.rangeEnd.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  const startDate = parseMonthToDateLocal(start);
  const endDate = parseMonthToDateLocal(end);
  if (!startDate || !endDate) {
    setStatus(I18N.t("rangeInvalid"), { danger: true });
    return;
  }
  if (startDate.getTime() > endDate.getTime()) {
    setStatus(I18N.t("rangeStartAfterEnd"), { danger: true });
    return;
  }

  const include = {
    totals: Boolean(els.rangeIncTotals.checked),
    query: Boolean(els.rangeIncQuery.checked),
    page: Boolean(els.rangeIncPage.checked),
    device: Boolean(els.rangeIncDevice.checked),
    country: Boolean(els.rangeIncCountry.checked),
    searchAppearance: Boolean(els.rangeIncSearchAppearance.checked),
    date: Boolean(els.rangeIncDate.checked)
  };
  if (!Object.values(include).some(Boolean)) {
    setStatus(I18N.t("rangeNoneSelected"), { danger: true });
    return;
  }

  const maxRows = {
    query: clampMaxRows(els.rangeMaxRowsQuery.value),
    page: clampMaxRows(els.rangeMaxRowsPage.value),
    country: clampMaxRows(els.rangeMaxRowsCountry.value),
    searchAppearance: clampMaxRows(els.rangeMaxRowsSearchAppearance.value)
  };

  const months = [];
  let cursor = new Date(startDate);
  const last = new Date(endDate);
  while (cursor.getTime() <= last.getTime()) {
    months.push(toMonthStringLocal(cursor));
    cursor = addMonthsLocal(cursor, 1);
    if (months.length > 36) {
      // Safety cap to avoid accidental huge runs from UI mistakes.
      break;
    }
  }

  const totalOps =
    months.length *
    Object.values(include).filter(Boolean).length;
  let done = 0;

  const prevDisabled = els.runRange.disabled;
  els.runRange.disabled = true;
  try {
    for (const month of months) {
      if (include.totals) {
        done++;
        setStatus(
          I18N.t("rangeProgress", { done, total: totalOps, month, what: "totals" })
        );
        const resp = await sendMessage("archiveMonthTotals", { siteUrl, month });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
      if (include.query) {
        done++;
        setStatus(
          I18N.t("rangeProgress", { done, total: totalOps, month, what: "query" })
        );
        const resp = await sendMessage("archiveMonthQueries", {
          siteUrl,
          month,
          maxRows: maxRows.query
        });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
      if (include.page) {
        done++;
        setStatus(
          I18N.t("rangeProgress", { done, total: totalOps, month, what: "page" })
        );
        const resp = await sendMessage("archiveMonthPages", {
          siteUrl,
          month,
          maxRows: maxRows.page
        });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
      if (include.device) {
        done++;
        setStatus(
          I18N.t("rangeProgress", { done, total: totalOps, month, what: "device" })
        );
        const resp = await sendMessage("archiveMonthDevices", { siteUrl, month });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
      if (include.country) {
        done++;
        setStatus(
          I18N.t("rangeProgress", { done, total: totalOps, month, what: "country" })
        );
        const resp = await sendMessage("archiveMonthCountries", {
          siteUrl,
          month,
          maxRows: maxRows.country
        });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
      if (include.searchAppearance) {
        done++;
        setStatus(
          I18N.t("rangeProgress", {
            done,
            total: totalOps,
            month,
            what: "searchAppearance"
          })
        );
        const resp = await sendMessage("archiveMonthSearchAppearances", {
          siteUrl,
          month,
          maxRows: maxRows.searchAppearance
        });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
      if (include.date) {
        done++;
        setStatus(
          I18N.t("rangeProgress", { done, total: totalOps, month, what: "date" })
        );
        const resp = await sendMessage("archiveMonthDates", { siteUrl, month });
        if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusSyncFailed"));
      }
    }

    setStatus(I18N.t("rangeDone", { count: months.length }));
    await refreshArchives();
    await refreshQueryArchive();
    await refreshPageArchive();
    await refreshDeviceArchive();
    await refreshCountryArchive();
    await refreshSearchAppearanceArchive();
    await refreshDateArchive();
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusSyncFailed"), { danger: true });
  } finally {
    els.runRange.disabled = prevDisabled;
  }
});

els.auth.addEventListener("click", async () => {
  setStatus(I18N.t("statusAuthorizing"));
  const resp = await sendMessage("auth");
  if (!resp?.ok) {
    els.authState.textContent = I18N.t("authStateUnauthed");
    setStatus(resp?.error ?? I18N.t("statusAuthFailed"), { danger: true });
    return;
  }
  els.authState.textContent = I18N.t("authStateAuthed");
  setStatus(I18N.t("statusAuthOk"));
});

els.listSites.addEventListener("click", async () => {
  setStatus(I18N.t("statusFetchingSites"));
  const resp = await sendMessage("listSites");
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusListSitesFailed"), { danger: true });
    return;
  }

  const sites = resp.sites ?? [];
  els.siteSelect.innerHTML = `<option value="">${escapeHtml(
    I18N.t("selectChoose")
  )}</option>`;
  for (const s of sites) {
    const opt = document.createElement("option");
    opt.value = s.siteUrl;
    opt.textContent = `${s.siteUrl} (${s.permissionLevel ?? "unknown"})`;
    els.siteSelect.appendChild(opt);
  }
  setStatus(I18N.t("statusSitesCount", { count: sites.length }));
  await refreshQueryArchive();
  await refreshPageArchive();
  await refreshDeviceArchive();
  await refreshCountryArchive();
  await refreshSearchAppearanceArchive();
  await refreshDateArchive();
});

els.sync.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncing", { siteUrl, month }));
  const resp = await sendMessage("archiveMonthTotals", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncDone"));
  await refreshArchives();
});

els.syncQueries.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  const maxRows = Number(els.queryMaxRows.value || 1000);
  setStatus(I18N.t("statusSyncingQueries", { siteUrl, month, maxRows }));
  const resp = await sendMessage("archiveMonthQueries", { siteUrl, month, maxRows });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncQueriesDone"));
  renderQueryArchive(resp.record);
});

els.syncPages.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  const maxRows = Number(els.pageMaxRows.value || 1000);
  setStatus(I18N.t("statusSyncingPages", { siteUrl, month, maxRows }));
  const resp = await sendMessage("archiveMonthPages", { siteUrl, month, maxRows });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncPagesDone"));
  renderPageArchive(resp.record);
});

els.syncDevices.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncingDevices", { siteUrl, month }));
  const resp = await sendMessage("archiveMonthDevices", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncDevicesDone"));
  renderDeviceArchive(resp.record);
});

els.syncCountries.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  const maxRows = Number(els.countryMaxRows.value || 1000);
  setStatus(I18N.t("statusSyncingCountries", { siteUrl, month, maxRows }));
  const resp = await sendMessage("archiveMonthCountries", { siteUrl, month, maxRows });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncCountriesDone"));
  renderCountryArchive(resp.record);
});

els.syncSearchAppearances.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  const maxRows = Number(els.searchAppearanceMaxRows.value || 1000);
  setStatus(
    I18N.t("statusSyncingSearchAppearance", { siteUrl, month, maxRows })
  );
  const resp = await sendMessage("archiveMonthSearchAppearances", {
    siteUrl,
    month,
    maxRows
  });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncSearchAppearanceDone"));
  renderSearchAppearanceArchive(resp.record);
});

els.syncDates.addEventListener("click", async () => {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl) {
    setStatus(I18N.t("statusSelectSite"), { danger: true });
    return;
  }
  if (!month) {
    setStatus(I18N.t("statusSelectMonth"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncingDates", { siteUrl, month }));
  const resp = await sendMessage("archiveMonthDates", { siteUrl, month });
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusSyncFailed"), { danger: true });
    return;
  }
  setStatus(I18N.t("statusSyncDatesDone"));
  renderDateArchive(resp.record);
});

els.refresh.addEventListener("click", refreshArchives);
els.siteSelect.addEventListener("change", refreshQueryArchive);
els.month.addEventListener("change", refreshQueryArchive);
els.siteSelect.addEventListener("change", refreshPageArchive);
els.month.addEventListener("change", refreshPageArchive);
els.siteSelect.addEventListener("change", refreshDeviceArchive);
els.month.addEventListener("change", refreshDeviceArchive);
els.siteSelect.addEventListener("change", refreshCountryArchive);
els.month.addEventListener("change", refreshCountryArchive);
els.siteSelect.addEventListener("change", refreshSearchAppearanceArchive);
els.month.addEventListener("change", refreshSearchAppearanceArchive);
els.siteSelect.addEventListener("change", refreshDateArchive);
els.month.addEventListener("change", refreshDateArchive);

els.exportAll.addEventListener("click", async () => {
  const resp = await sendMessage("getArchives");
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusExportFailed"), { danger: true });
    return;
  }
  downloadJson(
    `gsc-archives-${new Date().toISOString().slice(0, 10)}.json`,
    resp.archives ?? []
  );
});

els.exportExcel.addEventListener("click", async () => {
  const resp = await sendMessage("getArchives");
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusExportFailed"), { danger: true });
    return;
  }
  const { header, rows } = getMonthTotalsRows(resp.archives ?? []);
  downloadExcelXmlTable({
    filename: `gsc-archives-${new Date().toISOString().slice(0, 10)}.xls`,
    sheetName: I18N.t("sheetArchives"),
    header,
    rows
  });
});

els.exportLibreOffice.addEventListener("click", async () => {
  const resp = await sendMessage("getArchives");
  if (!resp?.ok) {
    setStatus(resp?.error ?? I18N.t("statusExportFailed"), { danger: true });
    return;
  }
  const { header, rows } = getMonthTotalsRows(resp.archives ?? []);
  downloadOdsTable({
    filename: `gsc-archives-${new Date().toISOString().slice(0, 10)}.ods`,
    sheetName: I18N.t("sheetArchives"),
    header,
    rows
  });
});

async function getCurrentQueryRecordForExport() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    throw new Error(I18N.t("statusSelectSite"));
  }
  const resp = await sendMessage("getQueryArchive", { siteUrl, month });
  if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusReadQueryFailed"));
  if (!resp.record) throw new Error(I18N.t("noQueryArchive"));
  return resp.record;
}

async function getCurrentPageRecordForExport() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    throw new Error(I18N.t("statusSelectSite"));
  }
  const resp = await sendMessage("getPageArchive", { siteUrl, month });
  if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusReadPageFailed"));
  if (!resp.record) throw new Error(I18N.t("noPageArchive"));
  return resp.record;
}

async function getCurrentDeviceRecordForExport() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    throw new Error(I18N.t("statusSelectSite"));
  }
  const resp = await sendMessage("getDeviceArchive", { siteUrl, month });
  if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusReadDeviceFailed"));
  if (!resp.record) throw new Error(I18N.t("noDeviceArchive"));
  return resp.record;
}

async function getCurrentCountryRecordForExport() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    throw new Error(I18N.t("statusSelectSite"));
  }
  const resp = await sendMessage("getCountryArchive", { siteUrl, month });
  if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusReadCountryFailed"));
  if (!resp.record) throw new Error(I18N.t("noCountryArchive"));
  return resp.record;
}

async function getCurrentSearchAppearanceRecordForExport() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    throw new Error(I18N.t("statusSelectSite"));
  }
  const resp = await sendMessage("getSearchAppearanceArchive", { siteUrl, month });
  if (!resp?.ok)
    throw new Error(resp?.error ?? I18N.t("statusReadSearchAppearanceFailed"));
  if (!resp.record) throw new Error(I18N.t("noSearchAppearanceArchive"));
  return resp.record;
}

async function getCurrentDateRecordForExport() {
  const siteUrl = els.siteSelect.value;
  const month = els.month.value;
  if (!siteUrl || !month) {
    throw new Error(I18N.t("statusSelectSite"));
  }
  const resp = await sendMessage("getDateArchive", { siteUrl, month });
  if (!resp?.ok) throw new Error(resp?.error ?? I18N.t("statusReadDateFailed"));
  if (!resp.record) throw new Error(I18N.t("noDateArchive"));
  return resp.record;
}

els.exportQueryJson.addEventListener("click", async () => {
  try {
    const record = await getCurrentQueryRecordForExport();
    downloadJson(
      `gsc-queries-${encodeURIComponent(record.siteUrl)}-${record.month}.json`,
      record
    );
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportQueryExcel.addEventListener("click", async () => {
  try {
    const record = await getCurrentQueryRecordForExport();
    const header = [
      I18N.t("thQuery"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.query ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadExcelXmlTable({
      filename: `gsc-queries-${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: I18N.t("sheetQueries"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportQueryLibreOffice.addEventListener("click", async () => {
  try {
    const record = await getCurrentQueryRecordForExport();
    const header = [
      I18N.t("thQuery"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.query ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadOdsTable({
      filename: `gsc-queries-${new Date().toISOString().slice(0, 10)}.ods`,
      sheetName: I18N.t("sheetQueries"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportPageJson.addEventListener("click", async () => {
  try {
    const record = await getCurrentPageRecordForExport();
    downloadJson(
      `gsc-pages-${encodeURIComponent(record.siteUrl)}-${record.month}.json`,
      record
    );
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportPageExcel.addEventListener("click", async () => {
  try {
    const record = await getCurrentPageRecordForExport();
    const header = [
      I18N.t("thPage"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.page ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadExcelXmlTable({
      filename: `gsc-pages-${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: I18N.t("sheetPages"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportPageLibreOffice.addEventListener("click", async () => {
  try {
    const record = await getCurrentPageRecordForExport();
    const header = [
      I18N.t("thPage"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.page ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadOdsTable({
      filename: `gsc-pages-${new Date().toISOString().slice(0, 10)}.ods`,
      sheetName: I18N.t("sheetPages"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportDeviceJson.addEventListener("click", async () => {
  try {
    const record = await getCurrentDeviceRecordForExport();
    downloadJson(
      `gsc-devices-${encodeURIComponent(record.siteUrl)}-${record.month}.json`,
      record
    );
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportDeviceExcel.addEventListener("click", async () => {
  try {
    const record = await getCurrentDeviceRecordForExport();
    const header = [
      I18N.t("thDevice"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.device ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadExcelXmlTable({
      filename: `gsc-devices-${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: I18N.t("sheetDevices"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportDeviceLibreOffice.addEventListener("click", async () => {
  try {
    const record = await getCurrentDeviceRecordForExport();
    const header = [
      I18N.t("thDevice"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.device ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadOdsTable({
      filename: `gsc-devices-${new Date().toISOString().slice(0, 10)}.ods`,
      sheetName: I18N.t("sheetDevices"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportCountryJson.addEventListener("click", async () => {
  try {
    const record = await getCurrentCountryRecordForExport();
    downloadJson(
      `gsc-countries-${encodeURIComponent(record.siteUrl)}-${record.month}.json`,
      record
    );
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportCountryExcel.addEventListener("click", async () => {
  try {
    const record = await getCurrentCountryRecordForExport();
    const lang = I18N.getLang?.() || "en";
    const header = [
      I18N.t("thCountry"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      window.CountryCodes?.alpha3ToName?.(r.country, lang)
        ? `${window.CountryCodes.alpha3ToName(r.country, lang)} (${String(
            r.country ?? ""
          ).toUpperCase()})`
        : String(r.country ?? "").toUpperCase(),
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadExcelXmlTable({
      filename: `gsc-countries-${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: I18N.t("sheetCountries"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportCountryLibreOffice.addEventListener("click", async () => {
  try {
    const record = await getCurrentCountryRecordForExport();
    const lang = I18N.getLang?.() || "en";
    const header = [
      I18N.t("thCountry"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      window.CountryCodes?.alpha3ToName?.(r.country, lang)
        ? `${window.CountryCodes.alpha3ToName(r.country, lang)} (${String(
            r.country ?? ""
          ).toUpperCase()})`
        : String(r.country ?? "").toUpperCase(),
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadOdsTable({
      filename: `gsc-countries-${new Date().toISOString().slice(0, 10)}.ods`,
      sheetName: I18N.t("sheetCountries"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportSearchAppearanceJson.addEventListener("click", async () => {
  try {
    const record = await getCurrentSearchAppearanceRecordForExport();
    downloadJson(
      `gsc-search-appearance-${encodeURIComponent(record.siteUrl)}-${
        record.month
      }.json`,
      record
    );
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportSearchAppearanceExcel.addEventListener("click", async () => {
  try {
    const record = await getCurrentSearchAppearanceRecordForExport();
    const header = [
      I18N.t("thSearchAppearance"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.searchAppearance ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadExcelXmlTable({
      filename: `gsc-search-appearance-${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: I18N.t("sheetSearchAppearance"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportSearchAppearanceLibreOffice.addEventListener("click", async () => {
  try {
    const record = await getCurrentSearchAppearanceRecordForExport();
    const header = [
      I18N.t("thSearchAppearance"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.searchAppearance ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadOdsTable({
      filename: `gsc-search-appearance-${new Date().toISOString().slice(0, 10)}.ods`,
      sheetName: I18N.t("sheetSearchAppearance"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportDateJson.addEventListener("click", async () => {
  try {
    const record = await getCurrentDateRecordForExport();
    downloadJson(
      `gsc-dates-${encodeURIComponent(record.siteUrl)}-${record.month}.json`,
      record
    );
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportDateExcel.addEventListener("click", async () => {
  try {
    const record = await getCurrentDateRecordForExport();
    const header = [
      I18N.t("thDate"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.date ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadExcelXmlTable({
      filename: `gsc-dates-${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: I18N.t("sheetDates"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

els.exportDateLibreOffice.addEventListener("click", async () => {
  try {
    const record = await getCurrentDateRecordForExport();
    const header = [
      I18N.t("thDate"),
      I18N.t("thClicks"),
      I18N.t("thImpressions"),
      I18N.t("thCtr"),
      I18N.t("thPosition")
    ];
    const rows = (record.rows ?? []).map((r) => [
      r.date ?? "",
      Number(r.clicks ?? 0),
      Number(r.impressions ?? 0),
      typeof r?.ctr === "number" && Number.isFinite(r.ctr)
        ? `${(r.ctr * 100).toFixed(2)}%`
        : "",
      Number(r.position ?? 0)
    ]);
    downloadOdsTable({
      filename: `gsc-dates-${new Date().toISOString().slice(0, 10)}.ods`,
      sheetName: I18N.t("sheetDates"),
      header,
      rows
    });
  } catch (e) {
    setStatus(e?.message ?? I18N.t("statusExportFailed"), { danger: true });
  }
});

(async () => {
  await I18N.init();
  await I18N.apply(document);
  await I18N.bindLanguageSelectors(document);
  await loadDefaultSite();
  await refreshArchives();
  await refreshQueryArchive();
  await refreshPageArchive();
  await refreshDeviceArchive();
  await refreshCountryArchive();
  await refreshSearchAppearanceArchive();
  await refreshDateArchive();

  document.addEventListener("i18n:changed", async () => {
    await refreshArchives();
    await refreshQueryArchive();
    await refreshPageArchive();
    await refreshDeviceArchive();
    await refreshCountryArchive();
    await refreshSearchAppearanceArchive();
    await refreshDateArchive();
  });
})();
