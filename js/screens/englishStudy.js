import { el, screen, topbar } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { speakEnglish, speakEnglishTwice, cancelSpeech } from "../tts.js";
import { kvGet } from "../db.js";

export async function render(container) {
  const session = getSessionData("/english/study");
  if (!session) { navigate("/english/units"); return; }
  let { unitLabel, words } = session;
  const rate = Number(await kvGet("english.rate", 0.8));

  const starred = new Set();
  let i = 0;
  let signal = { cancelled: false };

  function leaveStudy() {
    signal.cancelled = true;
    cancelSpeech();
    navigate("/english/units");
  }

  const main = screen([topbar(`공부하기 — ${unitLabel}`, { onBack: leaveStudy })]);
  const body = el("div", { class: "word-card" });
  main.appendChild(body);
  container.appendChild(main);

  function renderDone() {
    body.innerHTML = "";
    body.appendChild(el("div", { style: "font-size:3rem" }, "🎉"));
    body.appendChild(el("div", { style: "font-size:1.3rem;font-weight:800" }, "공부 완료!"));
    const actions = [];
    if (starred.size) {
      actions.push(el("button", {
        class: "big-btn secondary",
        onClick: () => { words = words.filter((w) => starred.has(w.en)); starred.clear(); i = 0; renderWord(); },
      }, `⭐ ${starred.size}개만 다시 보기`));
    }
    actions.push(el("button", { class: "big-btn primary", onClick: () => navigate("/english/units") }, "유닛 선택으로"));
    body.appendChild(el("div", { class: "play-actions" }, actions));
  }

  function renderWord() {
    if (i >= words.length) { renderDone(); return; }
    signal.cancelled = true;
    cancelSpeech();
    signal = { cancelled: false };
    const mySignal = signal;
    const w = words[i];
    body.innerHTML = "";
    body.appendChild(el("div", { style: "color:#999" }, `${i + 1} / ${words.length}`));
    body.appendChild(el("div", { class: "word-en" }, w.en));
    body.appendChild(el("div", { class: "word-ko" }, w.ko.join(", ")));
    const star = el("button", { class: `star-toggle${starred.has(w.en) ? " active" : ""}`, onClick: () => {
      starred.has(w.en) ? starred.delete(w.en) : starred.add(w.en);
      star.classList.toggle("active");
    } }, "⭐");
    body.appendChild(star);
    body.appendChild(el("div", { class: "row" }, [
      el("button", { class: "icon-btn", onClick: () => speakEnglishTwice(w.en, { rate, signal: mySignal }) }, "🔊"),
      el("button", { class: "icon-btn", onClick: () => speakEnglish(w.ex) }, "💬"),
    ]));
    body.appendChild(el("div", { class: "word-ex" }, w.ex));
    const writeInput = el("input", { class: "answer-input", placeholder: "써 보기 (영어로)" });
    const result = el("div", { style: "min-height:24px;font-weight:700" });
    writeInput.addEventListener("input", () => {
      if (writeInput.value.trim().toLowerCase() === w.en.toLowerCase()) {
        result.textContent = "✓ 맞았어요!";
        result.style.color = "var(--green)";
      } else {
        result.textContent = "";
      }
    });
    body.appendChild(writeInput);
    body.appendChild(result);
    body.appendChild(el("div", { class: "play-actions" }, [
      el("button", { class: "big-btn secondary", onClick: () => speakEnglishTwice(w.en, { rate, signal: mySignal }) }, "🔁 다시 듣기"),
      el("button", { class: "big-btn primary", onClick: () => { i += 1; renderWord(); } }, i === words.length - 1 ? "완료" : "다음 ▶"),
    ]));

    speakEnglishTwice(w.en, { rate, signal: mySignal });
  }

  renderWord();
}
