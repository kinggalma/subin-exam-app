import { el, screen, topbar } from "../ui.js";
import { navigate } from "../router.js";
import { getAllRecords } from "../records.js";

export async function render(container) {
  const records = await getAllRecords();

  const wrongCount = {};
  for (const r of records) {
    for (const w of r.wrong || []) {
      wrongCount[w] = (wrongCount[w] || 0) + 1;
    }
  }
  const topWrong = Object.entries(wrongCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  container.appendChild(
    screen([
      topbar("기록 보기", { onBack: () => navigate("/home") }),
      topWrong.length
        ? el("div", { class: "card" }, [
            el("div", { class: "section-title" }, "자주 틀리는 문제"),
            ...topWrong.map(([text, count]) => el("div", { class: "record-item" }, [
              el("div", {}, text),
              el("div", { class: "badge" }, `${count}회`),
            ])),
          ])
        : null,
      el("div", { class: "section-title" }, "전체 점수 기록"),
      records.length
        ? el("div", { class: "card" }, records.map((r) => el("div", { class: "record-item" }, [
            el("div", {}, [
              el("div", { style: "font-weight:700" }, r.set),
              el("div", { style: "color:#aaa;font-size:0.85rem" }, `${r.date} · ${r.subject === "ko" ? "국어" : "영어"}`),
            ]),
            el("div", { class: "score" }, `${r.score}점`),
          ])))
        : el("div", { class: "empty-state" }, "아직 기록이 없어요. 시험을 보면 여기에 쌓여요!"),
    ])
  );
}
