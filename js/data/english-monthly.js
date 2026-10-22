// 매달 추가되는 영어 학습 묶음 모음.
// 새 달 자료가 생기면 english-YYYY-MM.js 파일을 추가하고 여기 배열에 등록한다.
// main.js가 앱 시작 시 이 목록을 기존 데이터와 병합해서, 이미 저장된 교재나
// 기록은 그대로 두고 "아직 없는 유닛"만 추가한다.
import { PACK_2026_10 } from "./english-2026-10.js";

export const MONTHLY_PACKS = [PACK_2026_10];
