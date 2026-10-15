import { el, screen, topbar, showToast } from "../ui.js";
import { navigate } from "../router.js";
import { DB } from "../db.js";

export async function render(container) {
  const units = (await DB.getAll("english"));
  const selected = new Set();

  const list = el("div", { class: "card" });

  function renderList() {
    list.innerHTML = "";
    if (!units.length) {
      list.appendChild(el("div", { class: "empty-state" }, "등록된 교재가 없습니다. 설정에서 유닛을 추가해 주세요."));
      return;
    }
    units.forEach((u) => {
      const checked = selected.has(u.unit);
      const row = el("button", {
        class: `big-btn${checked ? " secondary" : ""}`,
        style: "width:100%;justify-content:space-between;margin-bottom:10px",
        onClick: () => { checked ? selected.delete(u.unit) : selected.add(u.unit); renderList(); },
      }, [
        el("span", {}, `${u.unit}`),
        el("span", { style: "font-size:0.9rem;color:" + (checked ? "#fff" : "#aaa") }, `${u.words.length}개 단어${checked ? " ✓" : ""}`),
      ]);
      list.appendChild(row);
    });
  }
  renderList();

  function getSelectedWords() {
    return units.filter((u) => selected.has(u.unit)).flatMap((u) => u.words);
  }

  container.appendChild(
    screen([
      topbar("영어 단어", { onBack: () => navigate("/home") }),
      el("div", { style: "color:#999;margin-bottom:8px" }, "유닛을 선택하세요. 여러 개를 고르면 통합 시험을 볼 수 있어요."),
      list,
      el("div", { class: "play-actions" }, [
        el("button", {
          class: "big-btn secondary",
          onClick: () => {
            if (selected.size !== 1) { showToast("공부하기는 유닛 1개를 선택했을 때만 가능해요."); return; }
            const u = units.find((x) => selected.has(x.unit));
            navigate("/english/study", { unitLabel: u.unit, words: u.words });
          },
        }, "📖 공부하기"),
        el("button", {
          class: "big-btn primary",
          onClick: () => {
            const words = getSelectedWords();
            if (!words.length) { showToast("유닛을 하나 이상 선택해 주세요."); return; }
            const label = [...selected].join(" + ");
            navigate("/english/quiz", { part: 1, unitLabel: label, words });
          },
        }, "시험1 (영→한)"),
        el("button", {
          class: "big-btn primary",
          onClick: () => {
            const words = getSelectedWords();
            if (!words.length) { showToast("유닛을 하나 이상 선택해 주세요."); return; }
            const label = [...selected].join(" + ");
            navigate("/english/quiz", { part: 2, unitLabel: label, words });
          },
        }, "시험2 (한→영)"),
      ]),
    ])
  );
}
