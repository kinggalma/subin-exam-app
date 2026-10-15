import { el, screen, topbar, shuffle } from "../ui.js";
import { navigate } from "../router.js";
import { DB, kvGet } from "../db.js";

export async function render(container) {
  const grades = (await DB.getAll("korean")).sort((a, b) => a.grade - b.grade);
  const favGrade = await kvGet("korean.favGrade", null);
  const defaultMode = await kvGet("korean.answerMode", "notebook");

  let selectedGrade = favGrade || (grades[0] && grades[0].grade) || 1;
  let order = "shuffle"; // "shuffle" | "inorder"
  let mode = defaultMode; // "notebook" | "screen"

  const gradeGrid = el("div", { class: "grade-grid" });
  const gradeMeta = el("div", { class: "card" });

  function renderGrid() {
    gradeGrid.innerHTML = "";
    for (const g of grades) {
      const cell = el("button", {
        class: `grade-cell${g.grade === favGrade ? " fav" : ""}${g.grade === selectedGrade ? " selected" : ""}`,
        onClick: () => { selectedGrade = g.grade; renderGrid(); renderMeta(); },
      }, `${g.grade}급`);
      gradeGrid.appendChild(cell);
    }
  }
  function renderMeta() {
    const g = grades.find((x) => x.grade === selectedGrade);
    gradeMeta.innerHTML = "";
    if (!g) {
      gradeMeta.appendChild(el("div", { class: "empty-state" }, "교재 데이터가 없습니다. 설정에서 추가해 주세요."));
      return;
    }
    gradeMeta.appendChild(el("div", {}, [
      el("strong", {}, `${g.grade}급 — ${g.title}`),
      g.warn ? el("div", { class: "badge" }, "⚠ 교재 검수 필요") : null,
      el("div", { style: "color:#999;margin-top:4px" }, `${g.items.length}문장`),
    ]));
  }
  renderGrid();
  renderMeta();

  const orderToggle = el("div", { class: "toggle-group" });
  function renderOrderToggle() {
    orderToggle.innerHTML = "";
    orderToggle.appendChild(el("button", { class: order === "shuffle" ? "active" : "", onClick: () => { order = "shuffle"; renderOrderToggle(); } }, "섞어서"));
    orderToggle.appendChild(el("button", { class: order === "inorder" ? "active" : "", onClick: () => { order = "inorder"; renderOrderToggle(); } }, "순서대로"));
  }
  renderOrderToggle();

  const modeToggle = el("div", { class: "toggle-group" });
  function renderModeToggle() {
    modeToggle.innerHTML = "";
    modeToggle.appendChild(el("button", { class: mode === "notebook" ? "active" : "", onClick: () => { mode = "notebook"; renderModeToggle(); } }, "공책에 쓰기"));
    modeToggle.appendChild(el("button", { class: mode === "screen" ? "active" : "", onClick: () => { mode = "screen"; renderModeToggle(); } }, "화면에 입력"));
  }
  renderModeToggle();

  container.appendChild(
    screen([
      topbar("국어 받아쓰기", { onBack: () => navigate("/home") }),
      el("div", { class: "section-title" }, "급 선택"),
      gradeGrid,
      gradeMeta,
      el("div", { class: "section-title" }, "순서"),
      orderToggle,
      el("div", { class: "section-title" }, "답 쓰는 방법"),
      modeToggle,
      el("button", {
        class: "big-btn primary",
        style: "margin-top:24px",
        onClick: async () => {
          const g = grades.find((x) => x.grade === selectedGrade);
          if (!g) return;
          const items = order === "shuffle" ? shuffle(g.items) : g.items.slice();
          navigate("/korean/play", { grade: g.grade, title: g.title, items, mode });
        },
      }, "시작하기 ▶"),
    ])
  );
}
