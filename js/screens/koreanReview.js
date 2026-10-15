import { el, screen, topbar } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { kvGet } from "../db.js";
import { speakKoreanSentence } from "../tts.js";

export async function render(container) {
  const session = getSessionData("/korean/review");
  if (!session) { navigate("/korean/select"); return; }
  const { wrong } = session;
  const rate = Number(await kvGet("korean.rate", 0.75));

  const list = el("div", { class: "result-list" }, wrong.map((text, i) =>
    el("div", { class: "result-row" }, [
      el("div", { class: "no" }, `${i + 1}`),
      el("div", { class: "text" }, text),
      el("button", { class: "icon-btn", onClick: async (e) => {
        e.target.textContent = "🔊";
        await speakKoreanSentence(text, { rate });
        await new Promise((r) => setTimeout(r, 1500));
        await speakKoreanSentence(text, { rate });
      } }, "🔊"),
    ])
  ));

  container.appendChild(
    screen([
      topbar("틀린 문제 복습", { onBack: () => navigate("/korean/select") }),
      el("div", { style: "color:#999;margin-bottom:8px" }, "스피커를 눌러서 다시 들어보고 공책에 써 보세요."),
      list,
      el("button", { class: "big-btn primary", onClick: () => navigate("/korean/select") }, "급 선택으로 돌아가기"),
    ])
  );
}
