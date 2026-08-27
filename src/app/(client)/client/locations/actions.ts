"use server";

import { revalidatePath } from "next/cache";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { createClient } from "@/lib/supabase/server";

// spec §4.1：拠点の登録・編集。created_by/updated_by（client側）を記録する。
export async function createLocation(formData: FormData) {
  const clientUser = await requireClientUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("locations").insert({
    client_id: clientUser.client_id,
    name,
    created_by_type: "client",
    created_by_id: clientUser.id,
    updated_by_type: "client",
    updated_by_id: clientUser.id,
  });

  revalidatePath("/client/locations");
}

export async function renameLocation(locationId: string, formData: FormData) {
  const clientUser = await requireClientUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("locations")
    .update({
      name,
      updated_by_type: "client",
      updated_by_id: clientUser.id,
    })
    .eq("id", locationId);

  revalidatePath("/client/locations");
}
