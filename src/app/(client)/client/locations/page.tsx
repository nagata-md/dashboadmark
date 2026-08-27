import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Table, Tr, Th, Td } from "@/components/ui/Table";
import { FormRow } from "@/components/ui/FormRow";
import { Button } from "@/components/ui/Button";
import { LocationNameEditor } from "@/components/locations/LocationNameEditor";
import { requireClientUser } from "@/lib/auth/requireClientUser";
import { createClient } from "@/lib/supabase/server";
import { createLocation, renameLocation } from "./actions";

export const metadata = {
  title: "拠点管理 | 住宅マーケティング数値ダッシュボード（仮称）",
};

const CREATED_BY_LABEL: Record<string, string> = {
  agency: "代理店",
  client: "住宅会社",
};

// spec §4.1：拠点（展示場・支店等）の登録・編集。代理店・住宅会社どちらからも可能。
export default async function ClientLocationsPage() {
  const clientUser = await requireClientUser();
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, created_by_type")
    .eq("client_id", clientUser.client_id)
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader title="拠点管理" />
      <Panel title="拠点一覧" className="mb-4">
        {locations && locations.length > 0 ? (
          <Table>
            <thead>
              <Tr>
                <Th>拠点名</Th>
                <Th>登録元</Th>
              </Tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <Tr key={loc.id}>
                  <Td>
                    <LocationNameEditor
                      initialName={loc.name}
                      action={renameLocation.bind(null, loc.id)}
                    />
                  </Td>
                  <Td>
                    {loc.created_by_type
                      ? CREATED_BY_LABEL[loc.created_by_type]
                      : "-"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500">
            まだ拠点が登録されていません。
          </p>
        )}
      </Panel>
      <Panel title="拠点を追加" className="max-w-[420px]">
        <form action={createLocation}>
          <FormRow label="拠点名">
            <input type="text" name="name" required />
          </FormRow>
          <Button type="submit" variant="primary">
            追加
          </Button>
        </form>
      </Panel>
    </>
  );
}
