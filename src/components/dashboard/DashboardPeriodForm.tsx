"use client";

import { useState } from "react";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";

// improvement.md §1-3：「期間比較を表示する」がオフの時は比較期間の入力欄自体を隠す
// （関係の無い欄を常時表示しない）。
export function DashboardPeriodForm({
  periodMonth,
  showCompare: defaultShowCompare,
  comparePeriodMonth,
}: {
  periodMonth: string;
  showCompare: boolean;
  comparePeriodMonth: string;
}) {
  const [showCompare, setShowCompare] = useState(defaultShowCompare);

  return (
    <form method="get" className="flex flex-wrap items-end gap-4">
      <FormRow label="対象期間（月次）" className="mb-0">
        <input type="month" name="periodMonth" defaultValue={periodMonth} />
      </FormRow>
      <label className="flex items-center gap-1.5 pb-1.5 text-xs text-gray-700">
        <input
          type="checkbox"
          name="showCompare"
          checked={showCompare}
          onChange={(e) => setShowCompare(e.target.checked)}
          value="on"
        />
        期間比較を表示する
      </label>
      {showCompare && (
        <FormRow label="比較期間" className="mb-0">
          <input type="month" name="comparePeriodMonth" defaultValue={comparePeriodMonth} />
        </FormRow>
      )}
      <Button type="submit" variant="primary">
        表示
      </Button>
    </form>
  );
}
