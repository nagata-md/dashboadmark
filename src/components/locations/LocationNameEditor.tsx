"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

interface LocationNameEditorProps {
  initialName: string;
  // 呼び出し元（page.tsx）でlocationId等を.bind()済みのServer Actionを渡す想定。
  action: (formData: FormData) => Promise<void>;
}

// 拠点名のインライン編集（spec §4.1「登録・編集」）。Modal.tsxを使うほどの複雑さが
// 無いため、行内でテキスト⇔フォームを切り替えるだけの最小構成にしている。
export function LocationNameEditor({
  initialName,
  action,
}: LocationNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span>{initialName}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-accent hover:underline"
        >
          編集
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await action(formData);
          setEditing(false);
        });
      }}
      className="flex items-center gap-2"
    >
      <input
        type="text"
        name="name"
        defaultValue={initialName}
        required
        className="w-40"
      />
      <Button type="submit" variant="primary" disabled={isPending}>
        保存
      </Button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-gray-500 hover:underline"
      >
        キャンセル
      </button>
    </form>
  );
}
