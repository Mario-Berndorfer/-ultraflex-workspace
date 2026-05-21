const ATTACHMENTS = [
  "Speicher_Test.xlsx",
  "Tagesangebot_Test.xlsx",
  "CPU_Test.xlsx",
  "Logitech_Test.xlsx"
];

const SAMPLE_ROWS = [
  createRow("1", "Ja", "test.alpha@example.com", "Testkunde Alpha GmbH", "Speicher_Test"),
  createRow("2", "Nein", "test.beta@example.com", "Testkunde Beta GmbH", "Tagesangebot_Test"),
  createRow("3", "Ja", "test.gamma@example.com", "Testkunde Gamma GmbH", "CPU_Test"),
  createRow("4", "Ja", "test.delta@example.com", "Testkunde Delta GmbH", ""),
  createRow("5", "Ja", "", "Testkunde Epsilon GmbH", "Speicher_Test"),
  createRow("6", "Nein", "test.zeta@example.com", "Testkunde Zeta GmbH", "Logitech_Test"),
  createRow("7", "Ja", "test.eta@example.com", "Testkunde Eta GmbH", "NichtVorhanden"),
  createRow("8", "Nein", "test.theta@example.com", "Testkunde Theta GmbH", ""),
  createRow("9", "Ja", "mario.test@example.com", "Mario Test", "Tagesangebot_Test"),
  createRow("10", "Nein", "testkollege@example.com", "Interner Testkollege", "CPU_Test")
];

let state = {
  workspaceName: "UltraFlex Workspace Sample",
  controlFileName: "UltraFlex_Steuerung_Test.xlsx",
  attachmentFolderName: "Mailkampagnen/Ultraflex Serienmails/Anhaenge",
  attachments: [...ATTACHMENTS],
  rows: structuredClone(SAMPLE_ROWS),
  selectedId: "1",
  search: "",
  filter: "all",
  lastSavedAt: null
};

const els = {
  controlFileName: document.querySelector("#controlFileName"),
  attachmentFolderName: document.querySelector("#attachmentFolderName"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  importJsonBtn: document.querySelector("#importJsonBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  jsonFileInput: document.querySelector("#jsonFileInput"),
  searchInput: document.querySelector("#searchInput"),
  filterSelect: document.querySelector("#filterSelect"),
  notice: document.querySelector("#notice"),
  rowsTableBody: document.querySelector("#rowsTableBody"),
  emptyState: document.querySelector("#emptyState"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSubtitle: document.querySelector("#detailSubtitle"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  detailForm: document.querySelector("#detailForm"),
  attachmentSelect: document.querySelector("#attachmentSelect"),
  validationList: document.querySelector("#validationList"),
  metricTotal: document.querySelector("#metricTotal"),
  metricActive: document.querySelector("#metricActive"),
  metricMissingEmail: document.querySelector("#metricMissingEmail"),
  metricMissingAttachment: document.querySelector("#metricMissingAttachment"),
  metricChanged: document.querySelector("#metricChanged")
};

function createRow(id, aktiv, email, nameIntern, anhang) {
  return {
    id,
    Aktiv: aktiv,
    Email: email,
    Name_Intern: nameIntern,
    Begruessung: "Guten Morgen,",
    Betreff: `Ihr persoenliches Testangebot - ${nameIntern}`,
    Intro: "vielen Dank fuer Ihr Interesse.",
    Body_Hauptteil: "Anbei finden Sie die aktuelle Auswahl als Testunterlage.",
    Angebotsblock: "Testangebot fuer UltraFlex Workspace.",
    CTA: "Geben Sie mir gern eine kurze Rueckmeldung.",
    Abschluss: "Mit freundlichen Gruessen",
    PS: "",
    Anhang1_Datei: anhang,
    meta: {
      changed: false,
      duplicated: false
    }
  };
}

function normalizeAttachmentName(value) {
  return String(value || "").trim().replace(/\.xlsx$/i, "");
}

function validateRow(row) {
  const issues = [];
  const isActive = row.Aktiv === "Ja";
  const attachmentName = normalizeAttachmentName(row.Anhang1_Datei);
  const attachmentExists = state.attachments.includes(`${attachmentName}.xlsx`);

  if (isActive && !String(row.Email || "").trim()) {
    issues.push("Aktive Zeile ohne E-Mail-Adresse.");
  }

  if (isActive && !attachmentName) {
    issues.push("Aktive Zeile ohne Anhang.");
  }

  if (isActive && attachmentName && !attachmentExists) {
    issues.push("Anhang wurde im Testordner nicht gefunden.");
  }

  if (isActive && !String(row.Betreff || "").trim()) {
    issues.push("Aktive Zeile ohne Betreff.");
  }

  return issues;
}

function validateImportedWorkspace(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Die Datei ist kein gueltiger Workspace-Export.");
  }

  if (!Array.isArray(payload.rows)) {
    throw new Error("JSON enthaelt keine rows-Liste.");
  }

  if (payload.rows.length === 0) {
    throw new Error("Die rows-Liste ist leer.");
  }

  const requiredFields = ["Aktiv", "Email", "Name_Intern", "Betreff", "Anhang1_Datei"];
  payload.rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Zeile ${index + 1} ist kein Objekt.`);
    }

    for (const field of requiredFields) {
      if (!(field in row)) {
        throw new Error(`Zeile ${index + 1} enthaelt nicht das Feld ${field}.`);
      }
    }
  });
}

function normalizeImportedRows(rows) {
  return rows.map((row, index) => ({
    id: String(row.id || `${Date.now()}-${index}`),
    Aktiv: row.Aktiv === "Ja" ? "Ja" : "Nein",
    Email: String(row.Email || ""),
    Name_Intern: String(row.Name_Intern || ""),
    Begruessung: String(row.Begruessung || row["Begrüßung"] || ""),
    Betreff: String(row.Betreff || ""),
    Intro: String(row.Intro || ""),
    Body_Hauptteil: String(row.Body_Hauptteil || ""),
    Angebotsblock: String(row.Angebotsblock || ""),
    CTA: String(row.CTA || ""),
    Abschluss: String(row.Abschluss || ""),
    PS: String(row.PS || ""),
    Anhang1_Datei: normalizeAttachmentName(row.Anhang1_Datei),
    meta: {
      changed: Boolean(row.meta?.changed),
      duplicated: Boolean(row.meta?.duplicated)
    }
  }));
}

function showNotice(message, kind = "success") {
  els.notice.textContent = message;
  els.notice.className = `notice ${kind === "success" ? "" : kind}`.trim();
  els.notice.hidden = false;
}

function rowMatchesFilter(row) {
  const issues = validateRow(row);
  const attachmentIssue = issues.some((issue) => issue.includes("Anhang"));
  const emailIssue = issues.some((issue) => issue.includes("E-Mail"));
  const changed = row.meta?.changed || row.meta?.duplicated;

  switch (state.filter) {
    case "active":
      return row.Aktiv === "Ja";
    case "inactive":
      return row.Aktiv !== "Ja";
    case "missingEmail":
      return emailIssue;
    case "missingAttachment":
      return attachmentIssue;
    case "changed":
      return changed;
    default:
      return true;
  }
}

function getVisibleRows() {
  const query = state.search.trim().toLowerCase();
  return state.rows.filter((row) => {
    const haystack = [
      row.Aktiv,
      row.Email,
      row.Name_Intern,
      row.Betreff,
      row.Anhang1_Datei
    ].join(" ").toLowerCase();

    return (!query || haystack.includes(query)) && rowMatchesFilter(row);
  });
}

function selectRow(id) {
  state.selectedId = id;
  render();
}

function getSelectedRow() {
  return state.rows.find((row) => row.id === state.selectedId) || null;
}

function markChanged(row) {
  row.meta = row.meta || {};
  row.meta.changed = true;
}

function renderMetrics() {
  const rows = state.rows;
  const active = rows.filter((row) => row.Aktiv === "Ja");
  const missingEmail = rows.filter((row) => validateRow(row).some((issue) => issue.includes("E-Mail")));
  const missingAttachment = rows.filter((row) => validateRow(row).some((issue) => issue.includes("Anhang")));
  const changed = rows.filter((row) => row.meta?.changed || row.meta?.duplicated);

  els.metricTotal.textContent = rows.length;
  els.metricActive.textContent = active.length;
  els.metricMissingEmail.textContent = missingEmail.length;
  els.metricMissingAttachment.textContent = missingAttachment.length;
  els.metricChanged.textContent = changed.length;
}

function renderTable() {
  const rows = getVisibleRows();
  els.rowsTableBody.innerHTML = "";
  els.emptyState.hidden = rows.length > 0;

  for (const row of rows) {
    const issues = validateRow(row);
    const tr = document.createElement("tr");
    tr.className = row.id === state.selectedId ? "selected" : "";
    tr.addEventListener("click", () => selectRow(row.id));

    const statusTd = document.createElement("td");
    const flags = document.createElement("div");
    flags.className = "row-flags";
    flags.appendChild(makeFlag(row.Aktiv === "Ja" ? "Aktiv" : "Inaktiv", row.Aktiv === "Ja" ? "ok" : "warn"));
    if (issues.length > 0) flags.appendChild(makeFlag(`${issues.length} Hinweis`, "danger"));
    if (row.meta?.changed) flags.appendChild(makeFlag("geaendert", "changed"));
    if (row.meta?.duplicated) flags.appendChild(makeFlag("dupliziert", "changed"));
    statusTd.appendChild(flags);

    tr.appendChild(statusTd);
    tr.appendChild(makeCell(row.Name_Intern));
    tr.appendChild(makeCell(row.Email || "E-Mail fehlt"));
    tr.appendChild(makeCell(row.Betreff));
    tr.appendChild(makeCell(row.Anhang1_Datei || "Anhang fehlt"));
    els.rowsTableBody.appendChild(tr);
  }
}

function makeCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function makeFlag(text, kind) {
  const span = document.createElement("span");
  span.className = `flag ${kind}`;
  span.textContent = text;
  return span;
}

function renderAttachmentSelect() {
  els.attachmentSelect.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Anhang waehlen";
  els.attachmentSelect.appendChild(empty);

  for (const fileName of state.attachments) {
    const option = document.createElement("option");
    option.value = normalizeAttachmentName(fileName);
    option.textContent = fileName;
    els.attachmentSelect.appendChild(option);
  }
}

function renderDetail() {
  const row = getSelectedRow();
  const fields = Array.from(els.detailForm.elements).filter((field) => field.name);

  els.duplicateBtn.disabled = !row;
  renderAttachmentSelect();

  if (!row) {
    els.detailTitle.textContent = "Keine Zeile ausgewaehlt";
    els.detailSubtitle.textContent = "Waehle links eine Zeile aus.";
    fields.forEach((field) => {
      field.value = "";
      field.disabled = true;
    });
    els.validationList.innerHTML = "";
    return;
  }

  els.detailTitle.textContent = row.Name_Intern || "Ohne Namen";
  els.detailSubtitle.textContent = `${row.Email || "E-Mail fehlt"} · ${row.Aktiv === "Ja" ? "Aktiv" : "Inaktiv"}`;

  fields.forEach((field) => {
    field.disabled = false;
    field.value = row[field.name] || "";
  });
  els.attachmentSelect.value = normalizeAttachmentName(row.Anhang1_Datei);

  const issues = validateRow(row);
  els.validationList.innerHTML = "";
  if (issues.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Keine Hinweise fuer diese Zeile.";
    els.validationList.appendChild(li);
  } else {
    issues.forEach((issue) => {
      const li = document.createElement("li");
      li.textContent = issue;
      els.validationList.appendChild(li);
    });
  }
}

function render() {
  els.controlFileName.value = state.controlFileName;
  els.attachmentFolderName.value = state.attachmentFolderName;
  els.searchInput.value = state.search;
  els.filterSelect.value = state.filter;
  renderMetrics();
  renderTable();
  renderDetail();
}

function duplicateSelectedRow() {
  const row = getSelectedRow();
  if (!row) return;

  const copy = structuredClone(row);
  copy.id = `${Date.now()}`;
  copy.Name_Intern = `${row.Name_Intern} Kopie`;
  copy.Aktiv = "Nein";
  copy.meta = { changed: true, duplicated: true };

  const index = state.rows.findIndex((item) => item.id === row.id);
  state.rows.splice(index + 1, 0, copy);
  state.selectedId = copy.id;
  render();
}

function updateSelectedField(name, value) {
  const row = getSelectedRow();
  if (!row) return;

  row[name] = name === "Anhang1_Datei" ? normalizeAttachmentName(value) : value;
  markChanged(row);
  render();
}

function exportWorkspaceJson() {
  const payload = {
    workspaceName: state.workspaceName,
    controlFileName: state.controlFileName,
    attachmentFolderName: state.attachmentFolderName,
    attachments: state.attachments,
    rows: state.rows,
    lastSavedAt: new Date().toISOString()
  };
  downloadFile("ultraflex-workspace-state.json", JSON.stringify(payload, null, 2), "application/json");
  showNotice("JSON exportiert. Der Export enthaelt lokale Workspace-Daten und keine externen Verbindungen.");
}

function exportMailDatenCsv() {
  const headers = [
    "Aktiv",
    "Email",
    "Name_Intern",
    "Begruessung",
    "Betreff",
    "Intro",
    "Body_Hauptteil",
    "Angebotsblock",
    "CTA",
    "Abschluss",
    "PS",
    "Anhang1_Datei"
  ];
  const lines = [headers.join(";")];

  for (const row of state.rows) {
    lines.push(headers.map((header) => csvEscape(row[header] || "")).join(";"));
  }

  downloadFile("MailDaten_Testkopie.csv", lines.join("\n"), "text/csv;charset=utf-8");
  showNotice("MailDaten CSV exportiert. Dies ist eine Teststruktur, kein Versand.");
}

function csvEscape(value) {
  const text = String(value).replace(/\r?\n/g, " ");
  if (/[;"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importWorkspaceJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      validateImportedWorkspace(payload);
      const importedRows = normalizeImportedRows(payload.rows);
      const importedAttachments = Array.isArray(payload.attachments)
        ? payload.attachments.map((item) => String(item || "").trim()).filter(Boolean)
        : [...ATTACHMENTS];

      state = {
        workspaceName: payload.workspaceName || "UltraFlex Workspace Import",
        controlFileName: payload.controlFileName || "UltraFlex_Steuerung_Test.xlsx",
        attachmentFolderName: payload.attachmentFolderName || "Mailkampagnen/Ultraflex Serienmails/Anhaenge",
        attachments: importedAttachments,
        rows: importedRows,
        selectedId: importedRows[0]?.id || null,
        search: "",
        filter: "all",
        lastSavedAt: payload.lastSavedAt || null
      };
      render();
      showNotice(`JSON importiert: ${state.rows.length} Zeilen wiederhergestellt.`);
    } catch (error) {
      showNotice(`JSON konnte nicht geladen werden: ${error.message}`, "error");
    }
  });
  reader.readAsText(file);
}

function resetSampleData() {
  state = {
    workspaceName: "UltraFlex Workspace Sample",
    controlFileName: "UltraFlex_Steuerung_Test.xlsx",
    attachmentFolderName: "Mailkampagnen/Ultraflex Serienmails/Anhaenge",
    attachments: [...ATTACHMENTS],
    rows: structuredClone(SAMPLE_ROWS),
    selectedId: "1",
    search: "",
    filter: "all",
    lastSavedAt: null
  };
  render();
  showNotice("Sample-Daten wurden zurueckgesetzt.", "warning");
}

function bindEvents() {
  els.loadSampleBtn.addEventListener("click", resetSampleData);
  els.exportJsonBtn.addEventListener("click", exportWorkspaceJson);
  els.importJsonBtn.addEventListener("click", () => els.jsonFileInput.click());
  els.exportCsvBtn.addEventListener("click", exportMailDatenCsv);
  els.jsonFileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importWorkspaceJson(file);
    event.target.value = "";
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTable();
  });
  els.filterSelect.addEventListener("change", (event) => {
    state.filter = event.target.value;
    renderTable();
  });
  els.controlFileName.addEventListener("change", (event) => {
    state.controlFileName = event.target.value;
  });
  els.attachmentFolderName.addEventListener("change", (event) => {
    state.attachmentFolderName = event.target.value;
  });
  els.duplicateBtn.addEventListener("click", duplicateSelectedRow);

  els.detailForm.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      updateSelectedField(target.name, target.value);
    }
  });

  els.attachmentSelect.addEventListener("change", (event) => {
    updateSelectedField("Anhang1_Datei", event.target.value);
  });
}

bindEvents();
render();
