import { DB, kvGet } from "./db.js";
import { el, fireConfetti, fireFireworks, playCheerSound, vibrateFanfare } from "./ui.js";

async function pickRewardVideo() {
  const videos = await DB.getAll("rewards");
  if (!videos.length) return null;
  const mode = await kvGet("reward.pickMode", "random");
  if (mode === "order") {
    const idx = (await kvGet("reward.orderIdx", 0)) % videos.length;
    await DB.put("kv", { key: "reward.orderIdx", value: idx + 1 });
    return videos[idx];
  }
  return videos[Math.floor(Math.random() * videos.length)];
}

export async function showCelebration() {
  const mode = await kvGet("reward.frequency", "always"); // "always" | "oncePerDay"
  const today = new Date().toISOString().slice(0, 10);
  if (mode === "oncePerDay") {
    const last = await kvGet("reward.lastPlayedDate");
    if (last === today) {
      await showPraiseOnly();
      return;
    }
  }
  const video = await pickRewardVideo();
  if (!video) {
    await showPraiseOnly();
    return;
  }
  if (video.youtubeId) {
    await playYoutubeOverlay(video);
  } else {
    await playVideoOverlay(video);
  }
  if (mode === "oncePerDay") {
    await DB.put("kv", { key: "reward.lastPlayedDate", value: today });
  }
}

// 폭죽+불꽃을 여러 번 터뜨리고 신나는 소리를 내서 화면을 화려하게 꾸며준다
function blastCelebrationFx() {
  playCheerSound();
  vibrateFanfare();
  fireConfetti(document.body);
  fireFireworks(document.body);
  const t1 = setTimeout(() => fireConfetti(document.body), 500);
  const t2 = setTimeout(() => fireFireworks(document.body), 700);
  const t3 = setTimeout(() => fireConfetti(document.body), 1300);
  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
}

function videoSeconds(videoRow, fallback) {
  return Number(videoRow?.seconds) > 0 ? Number(videoRow.seconds) : fallback;
}

function videoStart(videoRow) {
  return Number(videoRow?.start) > 0 ? Number(videoRow.start) : 0;
}

function showPraiseOnly() {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "celebrate-overlay" }, [
      el("div", { class: "celebrate-trophy" }, "🏆"),
      el("h2", {}, "100점! 축하해요 🎉"),
      el("div", { class: "celebrate-sub" }, "✨ 완벽해요! 최고예요! ✨"),
      el("button", { class: "big-btn primary", onClick: () => { overlay.remove(); resolve(); } }, "닫기"),
    ]);
    document.body.appendChild(overlay);
    const cancelFx = blastCelebrationFx();
    const closeTimer = setTimeout(() => { overlay.remove(); resolve(); }, 3800);
    overlay.querySelector("button").addEventListener("click", () => { cancelFx(); clearTimeout(closeTimer); }, { once: true });
  });
}

async function playVideoOverlay(videoRow) {
  const maxSeconds = videoSeconds(videoRow, Number(await kvGet("reward.maxSeconds", 180)));
  const startAt = videoStart(videoRow);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(videoRow.blob);
    const videoEl = el("video", { class: "reward-video", src: url, controls: "true", playsinline: "true", muted: "true", autoplay: "true" });
    const overlay = el("div", { class: "celebrate-overlay" }, [
      el("div", { class: "celebrate-trophy" }, "🏆"),
      el("h2", {}, "100점! 축하해요 🎉"),
      videoEl,
      el("button", { class: "big-btn primary", onClick: finish }, "닫기"),
    ]);
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      overlay.remove();
      resolve();
    }
    videoEl.addEventListener("loadedmetadata", () => {
      if (startAt > 0) videoEl.currentTime = Math.min(startAt, Math.max(videoEl.duration - 1, 0));
      // 무음으로 먼저 재생을 보장하고, 재생이 시작되면 소리를 켠다 (브라우저 자동재생 정책 우회)
      videoEl.play().then(() => { videoEl.muted = false; }).catch(() => {});
    }, { once: true });
    videoEl.addEventListener("ended", finish);
    document.body.appendChild(overlay);
    blastCelebrationFx();
    setTimeout(finish, maxSeconds * 1000);
  });
}

function loadYoutubeIframeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (!window.__ytApiPromise) {
    window.__ytApiPromise = new Promise((resolve) => {
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prevCb) prevCb(); resolve(); };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => resolve();
      document.head.appendChild(script);
      setTimeout(resolve, 4000); // 인터넷이 느리거나 막혀 있으면 포기하고 넘어간다
    });
  }
  return window.__ytApiPromise;
}

async function playYoutubeOverlay(videoRow) {
  const maxSeconds = videoSeconds(videoRow, Number(await kvGet("reward.maxSeconds", 180)));
  const startAt = videoStart(videoRow);
  await loadYoutubeIframeApi();
  return new Promise((resolve) => {
    const playerHost = el("div", { class: "reward-video", id: `yt-player-${Date.now()}` });
    const overlay = el("div", { class: "celebrate-overlay" }, [
      el("div", { class: "celebrate-trophy" }, "🏆"),
      el("h2", {}, "100점! 축하해요 🎉"),
      playerHost,
      el("button", { class: "big-btn primary", onClick: finish }, "닫기"),
    ]);
    let done = false;
    let player = null;
    function finish() {
      if (done) return;
      done = true;
      try { if (player && player.destroy) player.destroy(); } catch { /* 이미 파괴된 경우 무시 */ }
      overlay.remove();
      resolve();
    }
    document.body.appendChild(overlay);
    blastCelebrationFx();
    if (window.YT && window.YT.Player) {
      player = new window.YT.Player(playerHost.id, {
        videoId: videoRow.youtubeId,
        width: "480",
        height: "270",
        // 자동재생은 무음일 때만 브라우저가 보장해주므로 무음으로 시작한 뒤 재생되면 소리를 켠다
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, start: startAt },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) player.unMute();
            if (e.data === window.YT.PlayerState.ENDED) finish();
          },
        },
      });
    } else {
      // 유튜브 API를 못 불러온 경우(오프라인 등) 일반 iframe으로 대신 재생 — 자동 종료 감지는 안 됨
      playerHost.appendChild(el("iframe", {
        src: `https://www.youtube.com/embed/${videoRow.youtubeId}?autoplay=1&mute=1&playsinline=1&start=${startAt}`,
        allow: "autoplay; encrypted-media",
        allowfullscreen: "true",
      }));
    }
    setTimeout(finish, maxSeconds * 1000);
  });
}
