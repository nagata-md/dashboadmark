"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedForClient } from "@/lib/auth/isAuthorizedForClient";

// spec §4.2.2「反響としてカウントするコンバージョンアクションは…担当者が選択する」。
// ad_connections への書き込みはService Role専用（authenticatedロールへのRLSポリシーを
// 設けていないため）のため、認可チェックはこの関数内でコード側に明示する（masterplan E6）。
// 代理店・住宅会社どちらの画面からも呼べる共通アクション（呼び出し元でrevalidatePathを渡す）。
export async function updateTrackedConversionActions(
  connectionId: string,
  clientId: string,
  revalidatePathTarget: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const authorized = await isAuthorizedForClient(user.id, clientId);
  if (!authorized) return;

  const selected = formData.getAll("conversionActionId").map(String);

  const service = createServiceClient();
  await service
    .from("ad_connections")
    .update({ tracked_conversion_action_ids: selected })
    .eq("id", connectionId);

  revalidatePath(revalidatePathTarget);
}
