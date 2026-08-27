"use server";

import { revalidatePath } from "next/cache";
import { requireAgencyUser } from "@/lib/auth/requireAgencyUser";
import { createClient } from "@/lib/supabase/server";

// spec §4.1：拠点の登録・編集。created_by/updated_by（agency側）を記録する。
export async function createLocation(formData: FormData) {
  const agencyUser = await requireAgencyUser();
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || !name) return;

  const supabase = await createClient();
  await supabase.from("locations").insert({
    client_id: clientId,
    name,
    created_by_type: "agency",
    created_by_id: agencyUser.id,
    updated_by_type: "agency",
    updated_by_id: agencyUser.id,
  });

  revalidatePath(`/agency/clients/${clientId}/locations`);
}

export async function renameLocation(
  locationId: string,
  clientId: string,
  formData: FormData,
) {
  const agencyUser = await requireAgencyUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("locations")
    .update({
      name,
      updated_by_type: "agency",
      updated_by_id: agencyUser.id,
    })
    .eq("id", locationId);

  revalidatePath(`/agency/clients/${clientId}/locations`);
}
