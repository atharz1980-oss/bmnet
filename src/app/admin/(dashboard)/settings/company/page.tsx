import { requirePermission } from "@/lib/admin/session";
import { loadCommerce } from "@/lib/payments/configuration";
import { CompanyIdentity } from "@/components/admin/settings/company-identity";

export default async function CompanySettingsPage() {
  const gate = await requirePermission("settings", "view");
  if (!gate.ok) return <p className="p-8" role="alert">{gate.error}</p>;
  const { settings, databaseReady } = await loadCommerce();
  return (
    <CompanyIdentity
      settings={settings}
      databaseReady={databaseReady}
      canEdit={gate.data.role.key === "owner" && gate.data.role.permissions.settings?.includes("edit") === true}
    />
  );
}
