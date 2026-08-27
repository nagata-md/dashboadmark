import { describe, expect, it } from "vitest";
import {
  addDaysUTC,
  monthRange,
  overlapDays,
  parseISODate,
  prorateWeight,
  rowInterval,
  toISODate,
  weekRange,
} from "./dateRange";

describe("rowInterval", () => {
  it("monthly: その月の1日から翌月1日までの半開区間", () => {
    const r = rowInterval("monthly", "2026-04-01");
    expect(toISODate(r.start)).toBe("2026-04-01");
    expect(toISODate(r.end)).toBe("2026-05-01");
  });

  it("weekly: 開始日から7日間", () => {
    const r = rowInterval("weekly", "2026-04-29");
    expect(toISODate(r.start)).toBe("2026-04-29");
    expect(toISODate(r.end)).toBe("2026-05-06");
  });

  it("daily: 当日1日のみ", () => {
    const r = rowInterval("daily", "2026-04-15");
    expect(toISODate(r.start)).toBe("2026-04-15");
    expect(toISODate(r.end)).toBe("2026-04-16");
  });
});

describe("monthRange / weekRange", () => {
  it("monthRangeはカレンダー月の半開区間を返す", () => {
    const r = monthRange("2026-02");
    expect(toISODate(r.start)).toBe("2026-02-01");
    expect(toISODate(r.end)).toBe("2026-03-01"); // うるう年でない2月でも翌月1日になる
  });

  it("weekRangeはrowInterval('weekly', ...)と同じ", () => {
    const r = weekRange("2026-04-29");
    expect(r).toEqual(rowInterval("weekly", "2026-04-29"));
  });
});

describe("overlapDays / prorateWeight — spec §6の日数按分ルール", () => {
  it("月をまたぐ週は日数比率で按分される", () => {
    // 4/29〜5/5 の週（[4/29, 5/6)）。4月に2日（29,30）・5月に5日（1〜5）。
    const week = rowInterval("weekly", "2026-04-29"); // [4/29, 5/6)
    const april = monthRange("2026-04"); // [4/1, 5/1)
    const may = monthRange("2026-05"); // [5/1, 6/1)

    const daysInApril = overlapDays(week, april);
    const daysInMay = overlapDays(week, may);

    expect(daysInApril).toBe(2); // 4/29, 4/30
    expect(daysInMay).toBe(5); // 5/1〜5/5
    expect(daysInApril + daysInMay).toBe(7);

    const weightApril = prorateWeight(week, april);
    const weightMay = prorateWeight(week, may);
    expect(weightApril).toBeCloseTo(2 / 7);
    expect(weightMay).toBeCloseTo(5 / 7);
  });

  it("spec.mdの具体例（7日中3日が4月・4日が5月）どおりの週で按分比率3/7・4/7になる", () => {
    // 4/28(火)〜5/4(月) なら4月に3日（28,29,30）・5月に4日（1,2,3,4）。
    const week = rowInterval("weekly", "2026-04-28");
    const april = monthRange("2026-04");
    const may = monthRange("2026-05");

    expect(prorateWeight(week, april)).toBeCloseTo(3 / 7);
    expect(prorateWeight(week, may)).toBeCloseTo(4 / 7);
  });

  it("月次行（その月と完全一致）はweight=1", () => {
    const row = rowInterval("monthly", "2026-06-01");
    const range = monthRange("2026-06");
    expect(prorateWeight(row, range)).toBe(1);
  });

  it("範囲と全く重ならない行はweight=0", () => {
    const row = rowInterval("monthly", "2026-01-01");
    const range = monthRange("2026-06");
    expect(prorateWeight(row, range)).toBe(0);
  });
});

describe("parseISODate / addDaysUTC / toISODate", () => {
  it("往復しても日付がずれない（タイムゾーンによる±1日ズレが無いことの確認）", () => {
    const iso = "2026-12-31";
    expect(toISODate(parseISODate(iso))).toBe(iso);
  });

  it("addDaysUTCで月・年をまたいでも正しく繰り上がる", () => {
    expect(toISODate(addDaysUTC(parseISODate("2026-12-31"), 1))).toBe("2027-01-01");
  });
});
