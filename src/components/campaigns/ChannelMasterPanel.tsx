"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { Modal } from "@/components/ui/Modal";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import type { CampaignChannel, ChannelType, FieldKey } from "@/lib/mock/types";

// 施策マスタ管理（2026-08-10確認）。地元フリーペーパー等の特殊媒体をクライアントごとに追加できる。
// デフォルト17施策（clientId: null）は編集不可、クライアント固有の追加分のみここで管理する。
// 追加・編集は代理店のみが行う想定（本ページ自体が代理店専用のため追加のアクセス制御は設けない）。

const FIELD_KEYS: FieldKey[] = ["cost", "impressions", "clicks", "followers", "posts", "views", "inflowRate"];
const FIELD_LABELS: Record<FieldKey, string> = {
  cost: "施策費用",
  impressions: "表示回数",
  clicks: "クリック数",
  followers: "フォロワー数",
  posts: "投稿数",
  views: "再生数",
  inflowRate: "流入率",
};

interface ChannelFormState {
  name: string;
  type: ChannelType;
  fields: Set<FieldKey>;
}

function toFormState(channel: CampaignChannel | null): ChannelFormState {
  return {
    name: channel?.name ?? "",
    type: channel?.type ?? "ad",
    fields: new Set(channel?.enabledFields ?? []),
  };
}

export function ChannelMasterPanel({
  clientId,
  channels,
  onSave,
}: {
  clientId: string;
  channels: CampaignChannel[];
  onSave: (channel: CampaignChannel) => void;
}) {
  const [editing, setEditing] = useState<CampaignChannel | "new" | null>(null);
  const [form, setForm] = useState<ChannelFormState>(toFormState(null));

  function openNew() {
    setForm(toFormState(null));
    setEditing("new");
  }
  function openEdit(channel: CampaignChannel) {
    setForm(toFormState(channel));
    setEditing(channel);
  }

  function toggleField(key: FieldKey) {
    setForm((prev) => {
      const next = new Set(prev.fields);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, fields: next };
    });
  }

  function save() {
    const enabledFields = FIELD_KEYS.filter((k) => form.fields.has(k));
    const existing = editing !== "new" ? editing : null;
    const channel: CampaignChannel = {
      id: existing?.id ?? `ch_client${clientId}_${Date.now()}`,
      clientId,
      name: form.name,
      type: form.type,
      platform: null,
      method: "manual",
      sortOrder: existing?.sortOrder ?? 100 + channels.length + 1,
      enabledFields,
      requiredFields: enabledFields.includes("cost") ? ["cost"] : [],
    };
    onSave(channel);
    setEditing(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-700">
          デフォルトの17施策に加えて、このクライアント固有の媒体（地元フリーペーパー等）を追加できます。使う入力項目だけをチェックしてください。
        </p>
        <Button type="button" variant="primary" onClick={openNew} className="shrink-0">
          ＋ 施策を追加
        </Button>
      </div>

      {channels.length > 0 ? (
        <Table>
          <thead>
            <Tr>
              <Th>施策名</Th>
              <Th>種別</Th>
              <Th>入力項目</Th>
              <Th>操作</Th>
            </Tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <Tr key={c.id}>
                <Td className="font-semibold text-ink">{c.name}</Td>
                <Td>{c.type === "ad" ? "広告" : "運用（オーガニック）"}</Td>
                <Td>{c.enabledFields.map((k) => FIELD_LABELS[k]).join("・")}</Td>
                <Td>
                  <button type="button" className="text-xs text-accent hover:underline" onClick={() => openEdit(c)}>
                    修正
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-xs text-gray-500">このクライアント固有の追加施策はまだありません。</p>
      )}

      {editing && (
        <Modal title={editing === "new" ? "施策を追加" : "施策を修正"} onClose={() => setEditing(null)}>
          <FormRow label="施策名">
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormRow>
          <FormRow label="種別">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ChannelType })}>
              <option value="ad">広告</option>
              <option value="organic">運用（オーガニック）</option>
            </select>
          </FormRow>
          <FormRow label="入力項目（使うものだけチェック）">
            <div className="flex flex-col gap-1.5">
              {FIELD_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.fields.has(key)} onChange={() => toggleField(key)} />
                  {FIELD_LABELS[key]}
                </label>
              ))}
            </div>
          </FormRow>
          <p className="mb-3 text-[11px] text-gray-500">反響数は全施策共通で常に必須のため項目には含みません。</p>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setEditing(null)}>
              キャンセル
            </Button>
            <Button type="button" variant="primary" onClick={save} disabled={!form.name || form.fields.size === 0}>
              保存
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
