import { el, screen, topbar, showToast } from "../ui.js";
import { navigate } from "../router.js";
import { DB, kvGet, kvSet } from "../db.js";
import { getVoicesFor, previewVoice } from "../tts.js";

let unlockedThisVisit = false;

function parseEnglishPaste(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const units = [];
  let current = null;
  for (const line of lines) {
    if (/^unit\s*\S*/i.test(line) && !line.includes(",")) {
      if (current) units.push(current);
      current = { unit: line, words: [] };
      continue;
    }
    if (!current) continue;
    const tokens = line.split(",").map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;
    const en = tokens[0];
    const rest = tokens.slice(1);
    let ex = "";
    const last = rest[rest.length - 1];
    if (rest.length > 1 && /[A-Za-z]/.test(last) && /\s/.test(last)) {
      ex = rest.pop();
    }
    current.words.push({ en, ko: rest, ex });
  }
  if (current) units.push(current);
  return units;
}

function parseYoutubeId(input) {
  const raw = (input || "").trim();
  if (/^[\w-]{11}$/.test(raw)) return raw; // 영상 ID를 바로 입력한 경우
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1].split("/")[0];
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1].split("/")[0];
    }
  } catch {
    // URL 형식이 아니면 아래에서 null 반환
  }
  return null;
}

function renderGate(container, onUnlock) {
  const input = el("input", { class: "answer-input", type: "password", inputmode: "numeric", maxlength: "4", placeholder: "보호자 비밀번호 4자리" });
  const msg = el("div", { style: "color:var(--pink);min-height:20px" });
  container.appendChild(
    screen([
      topbar("설정", { onBack: () => navigate("/home") }),
      el("div", { class: "card", style: "text-align:center" }, [
        el("div", { style: "font-size:1.1rem;margin-bottom:12px" }, "🔒 보호자 비밀번호를 입력하세요"),
        input,
        msg,
        el("button", {
          class: "big-btn primary",
          style: "margin-top:14px",
          onClick: async () => {
            const saved = await kvGet("settings.password");
            if (input.value === saved) { onUnlock(); } else { msg.textContent = "비밀번호가 틀렸어요."; }
          },
        }, "확인"),
      ]),
    ])
  );
  input.focus();
}

export async function render(container) {
  const savedPassword = await kvGet("settings.password");
  if (savedPassword && !unlockedThisVisit) {
    renderGate(container, () => { unlockedThisVisit = true; container.innerHTML = ""; render(container); });
    return;
  }

  const koVoices = await getVoicesFor("ko");
  const enVoices = await getVoicesFor("en");
  const koreanGrades = (await DB.getAll("korean")).sort((a, b) => a.grade - b.grade);
  const englishUnits = await DB.getAll("english");

  const main = screen([
    topbar("설정", { onBack: () => { unlockedThisVisit = false; navigate("/home"); } }),
  ]);
  container.appendChild(main);

  // ---- 음성 설정 ----
  const voiceCard = el("div", { class: "card" });
  voiceCard.appendChild(el("div", { class: "section-title" }, "🔊 음성 설정"));
  const koSelect = el("select", {}, [el("option", { value: "" }, "(기본 음성)"), ...koVoices.map((v) => el("option", { value: v.name }, v.name))]);
  koSelect.value = (await kvGet("voice.ko")) || "";
  const enSelect = el("select", {}, [el("option", { value: "" }, "(기본 음성)"), ...enVoices.map((v) => el("option", { value: v.name }, v.name))]);
  enSelect.value = (await kvGet("voice.en")) || "";
  const rateInput = el("input", { type: "range", min: "0.6", max: "1.1", step: "0.05", value: String(await kvGet("korean.rate", 0.75)) });
  const rateLabel = el("span", {}, String(await kvGet("korean.rate", 0.75)));
  rateInput.addEventListener("input", () => { rateLabel.textContent = rateInput.value; });
  const enRateInput = el("input", { type: "range", min: "0.5", max: "1.1", step: "0.05", value: String(await kvGet("english.rate", 0.8)) });
  const enRateLabel = el("span", {}, String(await kvGet("english.rate", 0.8)));
  enRateInput.addEventListener("input", () => { enRateLabel.textContent = enRateInput.value; });

  voiceCard.appendChild(el("label", { class: "field" }, [
    "국어(한국어) 음성",
    koSelect,
    el("button", { class: "big-btn ghost", onClick: () => previewVoice(koSelect.value, "ko-KR") }, "▶ 미리 듣기"),
  ]));
  voiceCard.appendChild(el("label", { class: "field" }, [
    "영어 음성",
    enSelect,
    el("button", { class: "big-btn ghost", onClick: () => previewVoice(enSelect.value, "en-US") }, "▶ 미리 듣기"),
  ]));
  voiceCard.appendChild(el("label", { class: "field" }, [
    el("span", {}, ["받아쓰기 읽는 속도 ", rateLabel]),
    rateInput,
  ]));
  voiceCard.appendChild(el("label", { class: "field" }, [
    el("span", {}, ["영어 단어 읽는 속도 ", enRateLabel]),
    enRateInput,
  ]));
  voiceCard.appendChild(el("button", {
    class: "big-btn primary",
    onClick: async () => {
      await kvSet("voice.ko", koSelect.value);
      await kvSet("voice.en", enSelect.value);
      await kvSet("korean.rate", Number(rateInput.value));
      await kvSet("english.rate", Number(enRateInput.value));
      showToast("저장했어요!");
    },
  }, "음성 설정 저장"));
  main.appendChild(voiceCard);

  // ---- 받아쓰기 진행 설정 ----
  const playCard = el("div", { class: "card" });
  playCard.appendChild(el("div", { class: "section-title" }, "📝 받아쓰기 진행 설정"));
  const writeSecInput = el("input", { type: "number", min: "10", max: "120", value: String(await kvGet("korean.writeSeconds", 15)) });
  const repeatToggle = el("input", { type: "checkbox" });
  repeatToggle.checked = await kvGet("korean.repeatButtonEnabled", true);
  const ignorePunctToggle = el("input", { type: "checkbox" });
  ignorePunctToggle.checked = await kvGet("korean.ignorePunctuation", true);
  const answerModeSelect = el("select", {}, [
    el("option", { value: "notebook" }, "공책에 쓰고 O/X 채점"),
    el("option", { value: "screen" }, "화면에 입력해 자동 채점"),
  ]);
  answerModeSelect.value = await kvGet("korean.answerMode", "notebook");
  const favGradeSelect = el("select", {}, [el("option", { value: "" }, "(없음)"), ...koreanGrades.map((g) => el("option", { value: String(g.grade) }, `${g.grade}급`))]);
  favGradeSelect.value = String((await kvGet("korean.favGrade", "")) || "");

  playCard.appendChild(el("label", { class: "field" }, ["쓰는 시간(초, 10~120)", writeSecInput]));
  playCard.appendChild(el("label", { class: "field", style: "flex-direction:row;align-items:center;gap:10px" }, [repeatToggle, el("span", {}, "'한 번 더 듣기' 버튼 보이기")]));
  playCard.appendChild(el("label", { class: "field", style: "flex-direction:row;align-items:center;gap:10px" }, [ignorePunctToggle, el("span", {}, "화면 입력 채점 시 문장부호 무시")]));
  playCard.appendChild(el("label", { class: "field" }, ["기본 답 쓰는 방법", answerModeSelect]));
  playCard.appendChild(el("label", { class: "field" }, ["이번 주 급(즐겨찾기 ★)", favGradeSelect]));
  playCard.appendChild(el("button", {
    class: "big-btn primary",
    onClick: async () => {
      await kvSet("korean.writeSeconds", Math.min(120, Math.max(10, Number(writeSecInput.value) || 15)));
      await kvSet("korean.repeatButtonEnabled", repeatToggle.checked);
      await kvSet("korean.ignorePunctuation", ignorePunctToggle.checked);
      await kvSet("korean.answerMode", answerModeSelect.value);
      await kvSet("korean.favGrade", favGradeSelect.value ? Number(favGradeSelect.value) : null);
      showToast("저장했어요!");
    },
  }, "진행 설정 저장"));
  main.appendChild(playCard);

  // ---- 보상 영상 ----
  const rewardCard = el("div", { class: "card" });
  rewardCard.appendChild(el("div", { class: "section-title" }, "🎁 100점 보상 영상"));
  const existingVideos = await DB.getAll("rewards");
  function videoRow(v) {
    const startInput = el("input", { type: "number", min: "0", value: String(v.start || ""), placeholder: "0", style: "width:64px" });
    const secInput = el("input", { type: "number", min: "3", max: "120", value: String(v.seconds || ""), placeholder: "기본", style: "width:64px" });
    return el("div", { class: "record-item" }, [
      v.youtubeId
        ? el("a", { href: `https://youtu.be/${v.youtubeId}`, target: "_blank", rel: "noopener" }, `▶ YouTube: ${v.name}`)
        : el("div", {}, v.name),
      el("label", { style: "display:flex;align-items:center;gap:4px;font-size:0.85rem;color:#999" }, ["시작(초)", startInput]),
      el("label", { style: "display:flex;align-items:center;gap:4px;font-size:0.85rem;color:#999" }, ["재생(초)", secInput]),
      el("button", {
        class: "icon-btn",
        onClick: async () => {
          await DB.put("rewards", { ...v, start: Number(startInput.value) || undefined, seconds: Number(secInput.value) || undefined });
          showToast("저장했어요!");
          navigate("/settings");
        },
      }, "💾"),
      el("button", { class: "icon-btn", onClick: async () => { await DB.delete("rewards", v.id); navigate("/settings"); } }, "🗑"),
    ]);
  }
  const fileVideos = existingVideos.filter((v) => !v.youtubeId);
  const ytVideos = existingVideos.filter((v) => v.youtubeId);
  const videoList = el("div", {}, [
    fileVideos.length ? el("div", { style: "font-size:0.85rem;color:#999;margin-top:6px" }, `📁 업로드한 영상/음악 (${fileVideos.length}개)`) : null,
    ...fileVideos.map(videoRow),
    ytVideos.length ? el("div", { style: "font-size:0.85rem;color:#999;margin-top:6px" }, `▶ 유튜브 영상 (${ytVideos.length}개)`) : null,
    ...ytVideos.map(videoRow),
    !existingVideos.length ? el("div", { class: "empty-state" }, "등록된 보상 영상이 없습니다.") : null,
  ]);
  const fileInput = el("input", { type: "file", accept: "video/*,audio/*", multiple: "true" });
  const startDefaultInput = el("input", { type: "number", min: "0", value: "0", style: "width:64px" });
  const secDefaultInput = el("input", { type: "number", min: "3", max: "120", value: "10", style: "width:64px" });
  const ytInput = el("input", { type: "text", placeholder: "https://youtu.be/... 또는 https://www.youtube.com/watch?v=..." });
  const ytAddBtn = el("button", {
    class: "big-btn secondary",
    onClick: async () => {
      const id = parseYoutubeId(ytInput.value);
      if (!id) { showToast("유튜브 링크를 확인해 주세요."); return; }
      await DB.put("rewards", { name: id, youtubeId: id, start: Number(startDefaultInput.value) || undefined, seconds: Number(secDefaultInput.value) || undefined });
      showToast("유튜브 영상을 추가했어요!");
      navigate("/settings");
    },
  }, "유튜브 추가");
  const pickModeSelect = el("select", {}, [el("option", { value: "random" }, "랜덤 재생"), el("option", { value: "order" }, "순서대로 재생")]);
  pickModeSelect.value = await kvGet("reward.pickMode", "random");
  const freqSelect = el("select", {}, [el("option", { value: "always" }, "100점마다 매번"), el("option", { value: "oncePerDay" }, "하루 1회만")]);
  freqSelect.value = await kvGet("reward.frequency", "always");
  const maxSecInput = el("input", { type: "number", min: "10", value: String(await kvGet("reward.maxSeconds", 180)) });

  rewardCard.appendChild(videoList);
  rewardCard.appendChild(el("label", { class: "field" }, ["새로 추가할 영상 시작 시간(초, 춤/노래 하이라이트 지점)", startDefaultInput]));
  rewardCard.appendChild(el("label", { class: "field" }, ["새로 추가할 영상 재생 길이(초)", secDefaultInput]));
  rewardCard.appendChild(el("label", { class: "field" }, ["영상/음악 파일 추가", fileInput]));
  rewardCard.appendChild(el("label", { class: "field" }, ["유튜브 링크 추가 (인터넷 필요)", ytInput, ytAddBtn]));
  rewardCard.appendChild(el("label", { class: "field" }, ["여러 개일 때 재생 방식", pickModeSelect]));
  rewardCard.appendChild(el("label", { class: "field" }, ["재생 빈도", freqSelect]));
  rewardCard.appendChild(el("label", { class: "field" }, ["영상 기본 최대 길이(초, 개별 설정이 없을 때)", maxSecInput]));
  rewardCard.appendChild(el("button", {
    class: "big-btn primary",
    onClick: async () => {
      for (const file of fileInput.files) {
        await DB.put("rewards", { name: file.name, blob: file, start: Number(startDefaultInput.value) || undefined, seconds: Number(secDefaultInput.value) || undefined });
      }
      await kvSet("reward.pickMode", pickModeSelect.value);
      await kvSet("reward.frequency", freqSelect.value);
      await kvSet("reward.maxSeconds", Number(maxSecInput.value) || 180);
      showToast("저장했어요!");
      navigate("/settings");
    },
  }, "보상 설정 저장"));
  main.appendChild(rewardCard);

  // ---- 교재 추가: 국어 ----
  const koreanAddCard = el("div", { class: "card" });
  koreanAddCard.appendChild(el("div", { class: "section-title" }, "📘 국어 급 추가/수정"));
  const gradeNumInput = el("input", { type: "number", min: "1", max: "99", placeholder: "급 번호 (예: 6)" });
  const gradeTitleInput = el("input", { type: "text", placeholder: "단원 제목 (예: 3. 내용을 살펴요)" });
  const gradeItemsTextarea = el("textarea", { placeholder: "한 줄에 한 문장씩 (10문장)" });
  koreanAddCard.appendChild(el("label", { class: "field" }, ["급 번호", gradeNumInput]));
  koreanAddCard.appendChild(el("label", { class: "field" }, ["단원 제목", gradeTitleInput]));
  koreanAddCard.appendChild(el("label", { class: "field" }, ["문장 목록", gradeItemsTextarea]));
  koreanAddCard.appendChild(el("button", {
    class: "big-btn primary",
    onClick: async () => {
      const grade = Number(gradeNumInput.value);
      const lines = gradeItemsTextarea.value.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!grade || !lines.length) { showToast("급 번호와 문장을 입력해 주세요."); return; }
      await DB.put("korean", { grade, title: gradeTitleInput.value || "", warn: false, items: lines.map((text, i) => ({ no: i + 1, text, read: null })) });
      showToast(`${grade}급 저장했어요!`);
      navigate("/settings");
    },
  }, "국어 급 저장"));
  main.appendChild(koreanAddCard);

  // ---- 교재 추가: 영어 ----
  const englishAddCard = el("div", { class: "card" });
  englishAddCard.appendChild(el("div", { class: "section-title" }, "📗 영어 유닛 추가"));
  englishAddCard.appendChild(el("div", { style: "color:#999;font-size:0.9rem;margin-bottom:8px" }, "형식: 첫 줄 'Unit 02', 다음 줄부터 '영어, 뜻1, 뜻2, 예문'"));
  const englishTextarea = el("textarea", { placeholder: "Unit 02\ncool, 시원한, 서늘한, It is cool in the classroom." });
  englishAddCard.appendChild(el("label", { class: "field" }, ["붙여넣기", englishTextarea]));
  englishAddCard.appendChild(el("button", {
    class: "big-btn primary",
    onClick: async () => {
      const parsed = parseEnglishPaste(englishTextarea.value);
      if (!parsed.length) { showToast("형식을 확인해 주세요."); return; }
      for (const u of parsed) {
        await DB.put("english", { unit: u.unit, book: "Let's TALK 4", words: u.words.map((w, i) => ({ no: i + 1, ...w })) });
      }
      showToast(`${parsed.map((u) => u.unit).join(", ")} 저장했어요!`);
      navigate("/settings");
    },
  }, "영어 유닛 저장"));
  main.appendChild(englishAddCard);
  if (englishUnits.length) {
    englishAddCard.appendChild(el("div", { style: "margin-top:10px;color:#999;font-size:0.85rem" }, `등록됨: ${englishUnits.map((u) => u.unit).join(", ")}`));
  }

  // ---- 보안 ----
  const securityCard = el("div", { class: "card" });
  securityCard.appendChild(el("div", { class: "section-title" }, "🔒 보호자 비밀번호"));
  const pwInput = el("input", { type: "password", inputmode: "numeric", maxlength: "4", placeholder: "4자리 숫자" });
  securityCard.appendChild(el("label", { class: "field" }, [savedPassword ? "비밀번호 변경" : "비밀번호 설정", pwInput]));
  securityCard.appendChild(el("button", {
    class: "big-btn primary",
    onClick: async () => {
      if (pwInput.value && !/^\d{4}$/.test(pwInput.value)) { showToast("숫자 4자리로 입력해 주세요."); return; }
      await kvSet("settings.password", pwInput.value || null);
      showToast("저장했어요!");
    },
  }, "비밀번호 저장"));
  main.appendChild(securityCard);
}
