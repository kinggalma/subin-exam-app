import { el, screen, topbar } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { showCelebration } from "../reward.js";

export async function render(container) {
  const session = getSessionData("/korean/result");
  if (!session) { navigate("/korean/select"); return; }
  const { grade, score, wrong, correctCount, total } = session;

  container.appendChild(
    screen([
      topbar(`${grade}급 결과`, { onBack: () => navigate("/korean/select") }),
      el("div", { class: "score-banner" }, `${correctCount} / ${total} 문제 — ${score}점`),
      wrong.length
        ? el("div", {}, [
            el("div", { class: "section-title" }, "틀린 문장"),
            el("div", { class: "card" }, wrong.map((w) => el("div", { style: "padding:6px 0;border-bottom:1px solid #eee" }, w))),
          ])
        : el("div", { class: "card", style: "text-align:center;font-weight:700;color:var(--green)" }, "모두 맞았어요! 🎉"),
      el("div", { class: "play-actions", style: "margin-top:18px" }, [
        wrong.length ? el("button", { class: "big-btn secondary", onClick: () => navigate("/korean/review", { wrong }) }, "틀린 문제 다시 듣기") : null,
        el("button", { class: "big-btn primary", onClick: () => navigate("/korean/select") }, "다시 도전"),
      ]),
    ])
  );

  if (score === 100) {
    await showCelebration();
  }
}
