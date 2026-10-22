import { el, screen, topbar } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { kvGet } from "../db.js";
import { speakKoreanSentence, cancelSpeech } from "../tts.js";

function sleep(ms, signalBox) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signalBox.cancel = () => { clearTimeout(id); resolve(); };
  });
}

export async function render(container) {
  const session = getSessionData("/korean/play");
  if (!session) { navigate("/korean/select"); return; }
  const { grade, title, items, mode } = session;

  const writeSeconds = Number(await kvGet("korean.writeSeconds", 15));
  const repeatEnabled = await kvGet("korean.repeatButtonEnabled", true);
  const rate = Number(await kvGet("korean.rate", 0.75));

  const answers = new Array(items.length).fill("");
  let cancelToken = { cancelled: false };

  const main = screen([
    topbar(`국어 ${grade}급`, { onBack: () => { cancelToken.cancelled = true; cancelSpeech(); navigate("/korean/select"); } }),
  ]);
  const body = el("div", { class: "play-card" });
  main.appendChild(body);
  container.appendChild(main);

  async function runItem(i) {
    const sentence = items[i].text;
    const readText = items[i].read || sentence;
    const no = i + 1;
    let itemSignal = { cancelled: false };

    const timerSpan = el("span", {}, "읽는 중");
    const ring = el("div", { class: "play-timer-ring", style: "--pct:100" }, timerSpan);
    const input = mode === "screen" ? el("input", { class: "answer-input", placeholder: "들은 문장을 써 보세요", value: answers[i] || "" }) : null;

    body.innerHTML = "";
    body.appendChild(el("div", { class: "play-number" }, `${no} / ${items.length}번 문제`));
    body.appendChild(ring);
    if (input) body.appendChild(input);
    const repeatBtn = el("button", { class: "big-btn secondary", onClick: () => replay() }, "🔁 한 번 더 듣기");
    const nextBtn = el("button", { class: "big-btn primary", onClick: () => advance() }, i === items.length - 1 ? "결과 보기" : "다음 ▶");
    const actions = el("div", { class: "play-actions" }, [repeatEnabled ? repeatBtn : null, nextBtn]);
    body.appendChild(actions);

    let advanced = false;
    let countdownHandle = null;
    const sig = {};

    async function doReadingSequence(signal) {
      timerSpan.textContent = "듣는 중 🔊";
      await speakKoreanSentence(readText, { rate, signal });
      if (signal.cancelled || cancelToken.cancelled) return;
      await sleep(2000, sig);
      if (signal.cancelled || cancelToken.cancelled) return;
      await speakKoreanSentence(readText, { rate, signal });
    }

    async function startCountdown() {
      if (cancelToken.cancelled || advanced) return;
      let remaining = writeSeconds;
      ring.style.setProperty("--pct", "100");
      timerSpan.textContent = `${remaining}초`;
      countdownHandle = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownHandle);
          advance();
          return;
        }
        timerSpan.textContent = `${remaining}초`;
        ring.style.setProperty("--pct", String(Math.round((remaining / writeSeconds) * 100)));
      }, 1000);
    }

    async function replay() {
      itemSignal.cancelled = true;
      cancelSpeech();
      if (countdownHandle) clearInterval(countdownHandle);
      itemSignal = { cancelled: false };
      await doReadingSequence(itemSignal);
      if (!cancelToken.cancelled && !itemSignal.cancelled) startCountdown();
    }

    function advance() {
      if (advanced) return;
      advanced = true;
      itemSignal.cancelled = true;
      if (countdownHandle) clearInterval(countdownHandle);
      if (input) answers[i] = input.value;
      cancelSpeech();
      resolveItem();
    }

    nextBtn.onclick = advance;

    let resolveItem;
    const donePromise = new Promise((resolve) => { resolveItem = resolve; });
    // 읽기는 백그라운드로 진행한다 — 음성 콜백이 멈추더라도(일부 브라우저의 알려진 버그)
    // "다음" 버튼은 즉시 반응해야 하므로 이 흐름을 기다리지 않는다.
    doReadingSequence(itemSignal).then(() => {
      if (!cancelToken.cancelled && !itemSignal.cancelled && !advanced) startCountdown();
    });
    await donePromise;
  }

  for (let i = 0; i < items.length; i++) {
    await runItem(i);
    if (cancelToken.cancelled) return;
  }

  navigate("/korean/grade", { grade, title, items, mode, answers });
}
