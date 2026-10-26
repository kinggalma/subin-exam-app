import { el, screen, topbar } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { kvGet } from "../db.js";
import { speakKoreanSentence, cancelSpeech } from "../tts.js";

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.onCancel = () => { clearTimeout(id); resolve(); };
  });
}

export async function render(container) {
  const session = getSessionData("/korean/review");
  if (!session) { navigate("/korean/select"); return; }
  const { wrong } = session;
  const rate = Number(await kvGet("korean.rate", 0.75));

  let playSignal = { cancelled: false };
  let resetActiveBtn = null;
  function stopPlaying() {
    playSignal.cancelled = true;
    if (playSignal.onCancel) playSignal.onCancel();
    cancelSpeech();
    if (resetActiveBtn) { resetActiveBtn(); resetActiveBtn = null; }
  }
  function leaveReview() {
    stopPlaying();
    navigate("/korean/select");
  }

  const list = el("div", { class: "result-list" }, wrong.map((text, i) => {
    const btn = el("button", { class: "icon-btn", onClick: async () => {
      if (!btn.dataset.playing) {
        stopPlaying();
        playSignal = { cancelled: false };
        const mySignal = playSignal;
        resetActiveBtn = () => { btn.dataset.playing = ""; btn.textContent = "🔊"; };
        btn.dataset.playing = "1";
        btn.textContent = "⏹";
        await speakKoreanSentence(text, { rate, signal: mySignal });
        if (mySignal.cancelled) return;
        await sleep(1500, mySignal);
        if (!mySignal.cancelled) await speakKoreanSentence(text, { rate, signal: mySignal });
        if (!mySignal.cancelled) { resetActiveBtn = null; btn.dataset.playing = ""; btn.textContent = "🔊"; }
      } else {
        stopPlaying();
      }
    } }, "🔊");
    return el("div", { class: "result-row" }, [
      el("div", { class: "no" }, `${i + 1}`),
      el("div", { class: "text" }, text),
      btn,
    ]);
  }));

  container.appendChild(
    screen([
      topbar("틀린 문제 복습", { onBack: leaveReview }),
      el("div", { style: "color:#999;margin-bottom:8px" }, "스피커를 눌러서 다시 들어보고 공책에 써 보세요. 다시 누르면 멈춰요."),
      list,
      el("button", { class: "big-btn primary", onClick: leaveReview }, "급 선택으로 돌아가기"),
    ])
  );
}
