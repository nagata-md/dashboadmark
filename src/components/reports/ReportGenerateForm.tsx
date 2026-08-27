"use client";

import { useState } from "react";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";

type PeriodType = "monthly" | "weekly" | "custom";

// improvement.md §1-3：期間種別（月次/週次/カスタム）×比較期間の有無で最大6つの
// 日付系入力欄が同時表示されていた問題への対応。期間種別に応じて基準・比較それぞれ
// 1つの入力欄だけを表示し、比較欄自体も「比較期間を含める」がオンの時だけ表示する。
// 比較期間の期間種別は基準期間と同じものを使う仕様（既存コメント通り）のため、
// 比較欄の出し分けも同じperiodType stateを参照する。
export function ReportGenerateForm({
  generateAction,
  defaultMonth,
}: {
  generateAction: (formData: FormData) => Promise<void>;
  defaultMonth: string;
}) {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [includeCompare, setIncludeCompare] = useState(false);

  return (
    <form action={generateAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <FormRow label="期間種別" className="mb-0">
          <select name="periodType" value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)}>
            <option value="monthly">月次</option>
            <option value="weekly">週次</option>
            <option value="custom">カスタム（任意の期間）</option>
          </select>
        </FormRow>
        {periodType === "monthly" && (
          <FormRow label="対象月" className="mb-0">
            <input type="month" name="periodMonth" defaultValue={defaultMonth} />
          </FormRow>
        )}
        {periodType === "weekly" && (
          <FormRow label="週の開始日" className="mb-0">
            <input type="date" name="periodWeekStart" />
          </FormRow>
        )}
        {periodType === "custom" && (
          <FormRow label="開始日〜終了日" className="mb-0">
            <div className="flex items-center gap-2">
              <input type="date" name="customStart" />
              <span className="text-gray-500">〜</span>
              <input type="date" name="customEnd" />
            </div>
          </FormRow>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-xs text-gray-700">
        <input
          type="checkbox"
          name="includeCompare"
          value="on"
          checked={includeCompare}
          onChange={(e) => setIncludeCompare(e.target.checked)}
        />
        比較期間を含める（期間種別は基準期間と同じものが使われます）
      </label>

      {includeCompare && (
        <div className="flex flex-wrap items-end gap-3">
          {periodType === "monthly" && (
            <FormRow label="比較：対象月" className="mb-0">
              <input type="month" name="comparePeriodMonth" />
            </FormRow>
          )}
          {periodType === "weekly" && (
            <FormRow label="比較：週の開始日" className="mb-0">
              <input type="date" name="compareWeekStart" />
            </FormRow>
          )}
          {periodType === "custom" && (
            <FormRow label="比較：開始日〜終了日" className="mb-0">
              <div className="flex items-center gap-2">
                <input type="date" name="compareCustomStart" />
                <span className="text-gray-500">〜</span>
                <input type="date" name="compareCustomEnd" />
              </div>
            </FormRow>
          )}
        </div>
      )}

      <div>
        <Button type="submit" variant="primary">
          レポート生成
        </Button>
      </div>
    </form>
  );
}
