// 代理店担当者のGoogleログインを許可するドメイン判定（spec §4.1.1）。
// Google の `hd` クエリパラメータはアカウント選択画面の絞り込みヒントに過ぎず
// 強制力が無いため、コールバック側でメールドメインを必ず再検証する。
export function agencyWorkspaceDomain(): string {
  const domain = process.env.AGENCY_GOOGLE_WORKSPACE_DOMAIN;
  if (!domain) {
    throw new Error("AGENCY_GOOGLE_WORKSPACE_DOMAIN が設定されていません");
  }
  return domain;
}

export function isAgencyDomainEmail(email: string): boolean {
  const domain = agencyWorkspaceDomain();
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}
