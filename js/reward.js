import { DB, kvGet } from "./db.js";
import { el, fireConfetti } from "./ui.js";

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
  await playVideoOverlay(video);
  if (mode === "oncePerDay") {
    await DB.put("kv", { key: "reward.lastPlayedDate", value: today });
  }
}

function showPraiseOnly() {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "celebrate-overlay" }, [
      el("h2", {}, "100점! 축하해요 🎉"),
      el("button", { class: "big-btn primary", onClick: () => { overlay.remove(); confettiWrap.remove(); resolve(); } }, "닫기"),
    ]);
    document.body.appendChild(overlay);
    const confettiWrap = document.body;
    fireConfetti(document.body);
    setTimeout(() => { overlay.remove(); resolve(); }, 3000);
  });
}

async function playVideoOverlay(videoRow) {
  const maxSeconds = Number(await kvGet("reward.maxSeconds", 180));
  return new Promise((resolve) => {
    const url = URL.createObjectURL(videoRow.blob);
    const videoEl = el("video", { class: "reward-video", src: url, autoplay: "true", controls: "true", playsinline: "true" });
    const overlay = el("div", { class: "celebrate-overlay" }, [
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
    videoEl.addEventListener("ended", finish);
    document.body.appendChild(overlay);
    fireConfetti(document.body);
    setTimeout(finish, maxSeconds * 1000);
  });
}
