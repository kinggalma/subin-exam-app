import { el, screen } from "../ui.js";
import { navigate } from "../router.js";

const CHEER_MESSAGES = [
  "수빈이, 오늘도 최고 스타! 🌟",
  "오늘의 무대도 네가 주인공 🎤",
  "연습만이 실력! 오늘도 빛나자 ✨",
  "수빈이 화이팅, 완전 소름 돋는 실력될 예정 💖",
  "오늘도 1등 아이돌처럼 집중해보자 🎶",
];

export async function render(container) {
  const cheer = CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
  container.appendChild(
    screen([
      el("div", { class: "topbar" }, [el("h1", {}, "✨ 수빈이의 반짝반짝 시험노트 ✨")]),
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
      el("div", { class: "footer-note" }, cheer),
    ])
  );
}
