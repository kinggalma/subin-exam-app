import { el, screen } from "../ui.js";
import { navigate } from "../router.js";

export async function render(container) {
  container.appendChild(
    screen([
      el("div", { class: "topbar" }, [el("h1", {}, "📚 수빈이 시험 도우미")]),
      el("div", { class: "home-grid" }, [
        el("button", { class: "big-btn primary", onClick: () => navigate("/korean/select") }, [
          el("span", { class: "emoji" }, "📝"), el("span", {}, "국어 받아쓰기"),
        ]),
        el("button", { class: "big-btn secondary", onClick: () => navigate("/english/units") }, [
          el("span", { class: "emoji" }, "🔤"), el("span", {}, "영어 단어"),
        ]),
        el("button", { class: "big-btn span-2", onClick: () => navigate("/records") }, [
          el("span", { class: "emoji" }, "🏆"), el("span", {}, "기록 보기"),
        ]),
        el("button", { class: "big-btn ghost span-2", onClick: () => navigate("/settings") }, [
          el("span", {}, "⚙️ 설정"),
        ]),
      ]),
      el("div", { class: "footer-note" }, "수빈이, 오늘도 화이팅! 💪"),
    ])
  );
}
