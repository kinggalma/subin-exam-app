import { el, screen, topbar, shuffle } from "../ui.js";
import { navigate, getSessionData } from "../router.js";
import { speakEnglishTwice, cancelSpeech } from "../tts.js";
import { kvGet } from "../db.js";
import { addRecord } from "../records.js";
import { showCelebration } from "../reward.js";

function stripParen(s) {
  return s.replace(/\([^)]*\)/g, "").trim();
}
function normalizeKo(s) {
  return stripParen(s).replace(/\s+/g, "");
}
function isKoCorrect(input, koOptions) {
  const norm = normalizeKo(input);
  if (!norm) return false;
  return koOptions.some((opt) => normalizeKo(opt) === norm);
}
function isEnCorrect(input, en) {
  return input.trim().toLowerCase() === en.toLowerCase();
}

export async function render(container) {
  const session = getSessionData("/english/quiz");
  if (!session) { navigate("/english/units"); return; }
  const { part, unitLabel, words } = session;
  const items = shuffle(words);
  const answers = new Array(items.length).fill("");
  const rate = Number(await kvGet("english.rate", 0.8));
  let i = 0;
  let signal = { cancelled: false };

  function leaveQuiz() {
    signal.cancelled = true;
    cancelSpeech();
    navigate("/english/units");
  }

  const main = screen([topbar(`시험${part} — ${unitLabel}`, { onBack: leaveQuiz })]);
  const body = el("div", { class: "word-card" });
  main.appendChild(body);
  container.appendChild(main);

  function renderQuestion() {
    signal.cancelled = true;
    cancelSpeech();
    signal = { cancelled: false };
    const mySignal = signal;
    const w = items[i];
    body.innerHTML = "";
    body.appendChild(el("div", { style: "color:#999" }, `${i + 1} / ${items.length}`));
    if (part === 1) {
      body.appendChild(el("div", { class: "word-en" }, w.en));
    } else {
      body.appendChild(el("div", { class: "word-ko" }, w.ko.join(", ")));
    }
    body.appendChild(el("button", { class: "icon-btn", onClick: () => speakEnglishTwice(w.en, { rate, signal: mySignal }) }, "🔊"));
    const input = el("input", {
      class: "answer-input",
      placeholder: part === 1 ? "뜻을 한글로 쓰세요" : "영어 단어를 쓰세요",
      autocapitalize: "off",
      autocomplete: "off",
      value: answers[i] || "",
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") goNext(); });
    body.appendChild(input);
    body.appendChild(el("div", { class: "play-actions" }, [
      el("button", { class: "big-btn primary", onClick: goNext }, i === items.length - 1 ? "결과 보기" : "다음 ▶"),
    ]));
    setTimeout(() => input.focus(), 50);

    function goNext() {
      signal.cancelled = true;
      cancelSpeech();
      answers[i] = input.value;
      i += 1;
      if (i >= items.length) finish(); else renderQuestion();
    }

    // 미국식 발음으로 2번 천천히 자동 재생
    speakEnglishTwice(w.en, { rate, signal: mySignal });
  }

  async function finish() {
    signal.cancelled = true;
    cancelSpeech();
    const marks = items.map((w, idx) => (part === 1 ? isKoCorrect(answers[idx], w.ko) : isEnCorrect(answers[idx], w.en)));
    const correctCount = marks.filter(Boolean).length;
    const score = Math.round((correctCount / items.length) * 100);
    const wrongWords = items.filter((_, idx) => !marks[idx]);

    await addRecord({
      subject: "en",
      setLabel: `${unitLabel} 시험${part}`,
      score,
      wrong: wrongWords.map((w) => `${w.en} (${w.ko.join(", ")})`),
    });

    body.innerHTML = "";
    body.appendChild(el("div", { class: "score-banner" }, `${correctCount} / ${items.length} — ${score}점`));
    const table = el("table", { class: "quiz-table" }, [
      el("tr", {}, [el("th", {}, "단어"), el("th", {}, "뜻"), el("th", {}, "내 답"), el("th", {}, "결과")]),
      ...items.map((w, idx) => el("tr", {}, [
        el("td", {}, w.en),
        el("td", {}, w.ko.join(", ")),
        el("td", {}, answers[idx] || "(빈칸)"),
        el("td", { style: marks[idx] ? "color:var(--green)" : "color:var(--pink)" }, marks[idx] ? "✓" : "✗"),
      ])),
    ]);
    body.appendChild(el("div", { style: "width:100%;max-height:40vh;overflow-y:auto" }, table));

    const actions = [];
    if (wrongWords.length) {
      actions.push(el("button", {
        class: "big-btn secondary",
        onClick: () => navigate("/english/quiz", { part, unitLabel: `${unitLabel} (복습)`, words: wrongWords }),
      }, "틀린 것만 다시 시험"));
    }
    actions.push(el("button", { class: "big-btn primary", onClick: () => navigate("/english/units") }, "유닛 선택으로"));
    body.appendChild(el("div", { class: "play-actions" }, actions));

    if (score === 100) await showCelebration();
  }

  renderQuestion();
}
