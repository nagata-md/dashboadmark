"use server";

import { redirect } from "next/navigation";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { inviteClientUser } from "@/lib/auth/inviteClientUser";
import { removeClientUser } from "@/lib/auth/removeClientUser";

// spec §4.1：「追加のユーザー招待は…自分の所属側のユーザーを追加できる」。
// 住宅会社担当者が自社（自分のclient_id）に対して追加の担当者を招待する。
export async function inviteAdditionalUser(formData: FormData) {
  const clientUser = await requireClientUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name || !email) {
    redirect("/client/users?error=missing_fields");
  }

  const result = await inviteClientUser({
    callerId: clientUser.id,
    callerType: "client",
    clientId: clientUser.client_id,
    email,
    name,
  });

  if (!result.ok) {
    redirect(`/client/users?error=${result.error}`);
  }

  redirect("/client/users?success=invited");
}

export async function removeUser(targetUserId: string) {
  const clientUser = await requireClientUser();

  const result = await removeClientUser({
    callerId: clientUser.id,
    callerType: "client",
    clientId: clientUser.client_id,
    targetUserId,
  });

  if (!result.ok) {
    redirect(`/client/users?error=remove_${result.error}`);
  }

  redirect("/client/users?success=removed");
}
