"use client";

import { useState } from "react";
import { FormRow } from "@/components/ui/FormRow";

// improvement.md §1-3：期間種別（月次/週次）の選択に応じて、無関係な入力欄
// （選ばれなかった方の日付欄）を隠す。`resolvePeriod`は選択中のperiodTypeに対応する
// フィールドしか読まないため、非表示のフィールドはそもそも送信しなくてよい
// （フォーム自体はサーバーコンポーネントのまま、この部分だけ軽量にクライアント化する）。
export function PeriodTypeFields({
  defaultType = "monthly",
  defaultMonth,
  defaultWeekStart,
  monthLabel = "対象月",
  weekLabel = "週の開始日",
}: {
  defaultType?: "monthly" | "weekly";
  defaultMonth?: string;
  defaultWeekStart?: string;
  monthLabel?: string;
  weekLabel?: string;
}) {
  const [periodType, setPeriodType] = useState<"monthly" | "weekly">(defaultType);

  return (
    <>
      <FormRow label="期間種別" className="mb-0">
        <select
          name="periodType"
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as "monthly" | "weekly")}
        >
          <option value="monthly">月次</option>
          <option value="weekly">週次</option>
        </select>
      </FormRow>
      {periodType === "monthly" ? (
        <FormRow label={monthLabel} className="mb-0">
          <input type="month" name="periodMonth" defaultValue={defaultMonth} />
        </FormRow>
      ) : (
        <FormRow label={weekLabel} className="mb-0">
          <input type="date" name="periodWeekStart" defaultValue={defaultWeekStart} />
        </FormRow>
      )}
    </>
  );
}
