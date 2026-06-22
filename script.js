const STORAGE_KEY = "app-list-manager-data-v1";
const STATUSES = ["未着手", "制作中", "デバッグ中", "制作済み", "改善予定", "保留", "ボツ"];
const GENRES = ["業務改善", "PDF・文書", "AI活用", "SNS発信", "家計・生活", "趣味", "学習", "実験", "その他"];

const STATUS_CLASSES = {
  "未着手": "status-not-started", "制作中": "status-building", "デバッグ中": "status-debugging",
  "制作済み": "status-done", "改善予定": "status-improve", "保留": "status-hold", "ボツ": "status-rejected"
};

const samples = [
  { name: "紙本PDF化アプリ", description: "紙の本や資料をスマホで撮影してPDF化し、AI用プロンプトまで作成できるアプリ。", note: "スマホ撮影時の使いやすさをさらに改善したい。", status: "制作済み", genre: "PDF・文書", priority: "高", publicUrl: "https://pimu0602.github.io/book-scan-pdf/", githubUrl: "" },
  { name: "PDF文字入れアプリ", description: "PDF上の好きな位置に文字を書き込み、編集したPDFを保存できるツール。", note: "入力操作とスマホ表示を確認する。", status: "デバッグ中", genre: "PDF・文書", priority: "高", publicUrl: "", githubUrl: "" },
  { name: "家計簿アプリ", description: "日々の支出を手軽に記録し、カテゴリごとの傾向を把握するアプリ。", note: "月次グラフを追加したい。", status: "未着手", genre: "家計・生活", priority: "中", publicUrl: "", githubUrl: "" },
  { name: "酒ログ図鑑", description: "飲んだお酒の味や印象を記録して、自分だけの図鑑を作るアプリ。", note: "SNS投稿用のスクリーンショットを撮る。", status: "改善予定", genre: "趣味", priority: "中", publicUrl: "", githubUrl: "" },
  { name: "言い訳チェッカー", description: "入力した文章から言い訳らしさを分析し、次の行動を考える実験アプリ。", note: "判定メッセージの種類を増やしたい。", status: "制作中", genre: "AI活用", priority: "低", publicUrl: "", githubUrl: "" }
];

const $ = (selector) => document.querySelector(selector);
const form = $("#appForm");
const appList = $("#appList");
const deleteDialog = $("#deleteDialog");
let pendingDeleteId = null;
let toastTimer;

function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadApps() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch (error) {
    console.warn("保存データを読み込めませんでした。", error);
  }
  const date = today();
  const initial = samples.map((app, index) => ({ ...app, id: makeId(), createdAt: date, updatedAt: date, sampleOrder: index }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

let apps = loadApps();

function saveApps() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function fillSelect(select, items, firstLabel = null) {
  select.replaceChildren();
  if (firstLabel) select.add(new Option(firstLabel, ""));
  items.forEach((item) => select.add(new Option(item, item)));
}

fillSelect($("#status"), STATUSES);
fillSelect($("#genre"), GENRES);
fillSelect($("#statusFilter"), STATUSES, "すべて");
fillSelect($("#genreFilter"), GENRES, "すべて");
$("#status").value = "未着手";
$("#genre").value = "その他";

function escapeHtml(value = "") {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function renderStats() {
  const completed = apps.filter((app) => app.status === "制作済み").length;
  const active = apps.filter((app) => ["制作中", "デバッグ中"].includes(app.status)).length;
  const planned = apps.filter((app) => ["未着手", "改善予定"].includes(app.status)).length;
  const values = [["すべてのアプリ", apps.length], ["制作済み", completed], ["進行中", active], ["次にやる", planned]];
  $("#stats").innerHTML = values.map(([label, count]) => `<div class="stat"><span class="stat-name">${label}</span><span class="stat-value">${count}<small>件</small></span></div>`).join("");
}

function filteredApps() {
  const keyword = $("#keyword").value.trim().toLocaleLowerCase("ja");
  const status = $("#statusFilter").value;
  const genre = $("#genreFilter").value;
  const priority = $("#priorityFilter").value;
  const statusRank = Object.fromEntries(STATUSES.map((item, index) => [item, index]));
  const priorityRank = { "高": 0, "中": 1, "低": 2 };

  const result = apps.filter((app) => {
    const haystack = `${app.name} ${app.description} ${app.note}`.toLocaleLowerCase("ja");
    return (!keyword || haystack.includes(keyword)) && (!status || app.status === status) && (!genre || app.genre === genre) && (!priority || app.priority === priority);
  });

  const sort = $("#sortOrder").value;
  return result.sort((a, b) => {
    if (sort === "created-desc") return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
    if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority] || b.updatedAt.localeCompare(a.updatedAt);
    if (sort === "status") return statusRank[a.status] - statusRank[b.status] || b.updatedAt.localeCompare(a.updatedAt);
    if (sort === "name") return a.name.localeCompare(b.name, "ja");
    return b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id);
  });
}

function render() {
  renderStats();
  const result = filteredApps();
  $("#resultCount").textContent = `${result.length}件`;

  if (!result.length) {
    appList.innerHTML = `<div class="empty-state"><strong>該当するアプリがありません</strong>検索条件を変えるか、新しいアプリを登録してください。</div>`;
    return;
  }

  appList.innerHTML = result.map((app) => {
    const publicUrl = safeUrl(app.publicUrl);
    const githubUrl = safeUrl(app.githubUrl);
    const links = [
      publicUrl ? `<a href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener noreferrer">公開ページ ↗</a>` : "",
      githubUrl ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>` : ""
    ].filter(Boolean).join("");
    return `
      <article class="app-card">
        <div class="card-top">
          <div>
            <div class="badges">
              <span class="badge ${STATUS_CLASSES[app.status] || "badge-neutral"}">${escapeHtml(app.status)}</span>
              <span class="badge badge-neutral">${escapeHtml(app.genre)}</span>
              <span class="badge ${app.priority === "高" ? "priority-high" : "badge-neutral"}">優先度 ${escapeHtml(app.priority)}</span>
            </div>
            <h3>${escapeHtml(app.name)}</h3>
          </div>
        </div>
        <p class="description">${escapeHtml(app.description)}</p>
        ${app.note ? `<p class="note">${escapeHtml(app.note)}</p>` : ""}
        ${links ? `<div class="links">${links}</div>` : ""}
        <footer class="card-footer">
          <div class="dates"><span>作成 ${escapeHtml(app.createdAt)}</span><span>更新 ${escapeHtml(app.updatedAt)}</span></div>
          <div class="card-actions">
            <button class="icon-button" type="button" data-action="edit" data-id="${app.id}">編集</button>
            <button class="icon-button delete" type="button" data-action="delete" data-id="${app.id}">削除</button>
          </div>
        </footer>
      </article>`;
  }).join("");
}

function resetForm() {
  form.reset();
  $("#editId").value = "";
  $("#status").value = "未着手";
  $("#genre").value = "その他";
  $("#formTitle").textContent = "アプリを登録";
  $("#submitButton").textContent = "アプリを登録する";
  $("#cancelEditButton").classList.add("hidden");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const editId = $("#editId").value;
  const existing = apps.find((app) => app.id === editId);
  const app = {
    id: editId || makeId(),
    name: data.get("name").trim(),
    description: data.get("description").trim(),
    note: data.get("note").trim(),
    status: data.get("status"),
    genre: data.get("genre"),
    priority: data.get("priority"),
    publicUrl: data.get("publicUrl").trim(),
    githubUrl: data.get("githubUrl").trim(),
    createdAt: existing?.createdAt || today(),
    updatedAt: today()
  };
  if (existing) apps = apps.map((item) => item.id === editId ? app : item);
  else apps.unshift(app);
  saveApps();
  resetForm();
  render();
  showToast(existing ? "アプリ情報を更新しました" : "アプリを登録しました");
});

appList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const app = apps.find((item) => item.id === button.dataset.id);
  if (!app) return;
  if (button.dataset.action === "edit") {
    $("#editId").value = app.id;
    ["name", "description", "note", "status", "genre", "publicUrl", "githubUrl"].forEach((key) => { $(`#${key}`).value = app[key] || ""; });
    const priority = form.querySelector(`input[name="priority"][value="${app.priority}"]`);
    if (priority) priority.checked = true;
    $("#formTitle").textContent = "アプリを編集";
    $("#submitButton").textContent = "変更を保存する";
    $("#cancelEditButton").classList.remove("hidden");
    $("#formTitle").scrollIntoView({ behavior: "smooth", block: "center" });
    $("#name").focus({ preventScroll: true });
  } else {
    pendingDeleteId = app.id;
    $("#deleteTargetName").textContent = `「${app.name}」は元に戻せません。`;
    deleteDialog.showModal();
  }
});

$("#cancelEditButton").addEventListener("click", resetForm);
$("#confirmDeleteButton").addEventListener("click", () => {
  if (!pendingDeleteId) return;
  apps = apps.filter((app) => app.id !== pendingDeleteId);
  if ($("#editId").value === pendingDeleteId) resetForm();
  pendingDeleteId = null;
  saveApps();
  render();
  showToast("アプリを削除しました");
});
deleteDialog.addEventListener("close", () => { if (deleteDialog.returnValue !== "confirm") pendingDeleteId = null; });

["#keyword", "#statusFilter", "#genreFilter", "#priorityFilter", "#sortOrder"].forEach((selector) => {
  $(selector).addEventListener(selector === "#keyword" ? "input" : "change", render);
});

$("#resetFilterButton").addEventListener("click", () => {
  ["#keyword", "#statusFilter", "#genreFilter", "#priorityFilter"].forEach((selector) => { $(selector).value = ""; });
  $("#sortOrder").value = "updated-desc";
  render();
});

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

$("#exportButton").addEventListener("click", () => {
  if (!apps.length) return showToast("出力できるアプリがありません");
  const headers = ["アプリ名", "どんなものか", "備考", "制作状況", "ジャンル", "優先度", "公開URL", "GitHub URL", "作成日", "更新日"];
  const keys = ["name", "description", "note", "status", "genre", "priority", "publicUrl", "githubUrl", "createdAt", "updatedAt"];
  const rows = [headers.map(csvCell).join(","), ...apps.map((app) => keys.map((key) => csvCell(app[key])).join(","))];
  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `制作アプリリスト_${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("CSVを出力しました");
});

render();
