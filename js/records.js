import { DB } from "./db.js";
import { todayStr } from "./ui.js";

export async function addRecord({ subject, setLabel, score, wrong }) {
  await DB.put("records", {
    date: todayStr(),
    subject, // "ko" | "en"
    set: setLabel,
    score,
    wrong, // 틀린 문항 설명 배열
  });
}

export async function getAllRecords() {
  const rows = await DB.getAll("records");
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}
