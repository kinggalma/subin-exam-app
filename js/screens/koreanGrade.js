import { el, screen, topbar, showToast } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { kvGet } from "../db.js";

function normalize(text, ignorePunct) {
  let out = text.trim().replace(/\s+/g, " ");
  if (ignorePunct) out = out.replace(/[,.!?]/g, "").trim().replace(/\s+/g, " ");
  return out;
}

export async function render(container) {
  const session = getSessionData("/korean/grade");
  if (!session) { navigate("/korean/select"); return; }
  const { grade, title, items, mode, answers } = session;
  const ignorePunct = await kvGet("korean.ignorePunctuation", true);

  const marks = items.map((item, i) => {
    if (mode === "screen") {
      return normalize(answers[i] || "", ignorePunct) === normalize(item.text, ignorePunct);
    }
    return null; // 공책 모드는 보호자가 직접 O/X
  });

  const list = el("div", { class: "result-list" });

  function renderList() {
    list.innerHTML = "";
    items.forEach((item, i) => {
      const row = el("div", { class: "result-row" });
      row.appendChild(el("div", { class: "no" }, `${i + 1}`));
      const textWrap = el("div", { class: "text" }, [
        el("div", {}, item.text),
        mode === "screen" ? el("div", { style: "color:#aaa;font-size:0.85rem" }, `쓴 답: ${answers[i] || "(빈칸)"}`) : null,
      ]);
      row.appendChild(textWrap);
      const oBtn = el("button", { class: `ox-btn o${marks[i] === true ? " active" : ""}`, onClick: () => { marks[i] = true; renderList(); } }, "O");
      const xBtn = el("button", { class: `ox-btn x${marks[i] === false ? " active" : ""}`, onClick: () => { marks[i] = false; renderList(); } }, "X");
      row.appendChild(el("div", { class: "ox-btns" }, [oBtn, xBtn]));
      list.appendChild(row);
    });
  }
  renderList();

  container.appendChild(
    screen([
      topbar(`${grade}급 채점`, { onBack: () => navigate("/korean/select") }),
      el("div", { style: "color:#999;margin-bottom:8px" }, mode === "notebook" ? "공책과 비교해서 O/X를 눌러주세요." : "자동 채점 결과예요. 다르면 직접 눌러 바꿀 수 있어요."),
      list,
      el("button", {
        class: "big-btn primary",
        onClick: async () => {
          if (marks.some((m) => m === null)) {
            showToast("모든 문제에 O 또는 X를 눌러주세요.");
            return;
          }
          const correctCount = marks.filter(Boolean).length;
          const score = Math.round((correctCount / items.length) * 100);
          const wrong = items.filter((_, i) => !marks[i]).map((item) => item.text);
          const { addRecord } = await import("../records.js");
          await addRecord({ subject: "ko", setLabel: `${grade}급 (${title})`, score, wrong });
          navigate("/korean/result", { grade, score, wrong, total: items.length, correctCount });
        },
      }, "채점 완료 ▶"),
    ])
  );
}
