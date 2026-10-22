import { registerRoute, startRouter } from "./router.js";
import { seedDefaultsIfEmpty, mergeEnglishMonthlyPacks } from "./db.js";
import { KOREAN_DEFAULT } from "./data/korean-default.js";
import { ENGLISH_DEFAULT } from "./data/english-default.js";
import { MONTHLY_PACKS } from "./data/english-monthly.js";

import * as home from "./screens/home.js";
import * as koreanSelect from "./screens/koreanSelect.js";
import * as koreanPlay from "./screens/koreanPlay.js";
import * as koreanGrade from "./screens/koreanGrade.js";
import * as koreanResult from "./screens/koreanResult.js";
import * as koreanReview from "./screens/koreanReview.js";
import * as englishUnits from "./screens/englishUnits.js";
import * as englishStudy from "./screens/englishStudy.js";
import * as englishQuiz from "./screens/englishQuiz.js";
import * as records from "./screens/records.js";
import * as settings from "./screens/settings.js";

registerRoute("/home", home.render);
registerRoute("/korean/select", koreanSelect.render);
registerRoute("/korean/play", koreanPlay.render);
registerRoute("/korean/grade", koreanGrade.render);
registerRoute("/korean/result", koreanResult.render);
registerRoute("/korean/review", koreanReview.render);
registerRoute("/english/units", englishUnits.render);
registerRoute("/english/study", englishStudy.render);
registerRoute("/english/quiz", englishQuiz.render);
registerRoute("/records", records.render);
registerRoute("/settings", settings.render);

async function init() {
  await seedDefaultsIfEmpty(KOREAN_DEFAULT, ENGLISH_DEFAULT);
  await mergeEnglishMonthlyPacks(MONTHLY_PACKS);
  startRouter(document.getElementById("app"));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
