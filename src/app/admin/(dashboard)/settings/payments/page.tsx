import { requirePermission } from "@/lib/admin/session";
import { loadCommerce, loadCredentialMetadata } from "@/lib/payments/configuration";
import { encryptionConfigured } from "@/lib/payments/secrets";
import { PaymentsPreparation } from "@/components/admin/settings/payments-preparation";

export default async function PaymentsSettingsPage() {
  const gate = await requirePermission("payments", "view");
  if (!gate.ok) return <p className="p-8" role="alert">{gate.error}</p>;
  const [{ settings, databaseReady }, configurations] = await Promise.all([loadCommerce(), loadCredentialMetadata()]);
  return <PaymentsPreparation settings={settings} configurations={configurations}
    databaseReady={databaseReady} encryptionReady={encryptionConfigured()}
    canManage={gate.data.role.key === "owner" && gate.data.role.permissions.payments?.includes("manage") === true} />;
}
