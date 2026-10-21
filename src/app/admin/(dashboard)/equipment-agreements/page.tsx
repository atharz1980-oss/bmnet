/**
 * /admin/equipment-agreements — إصدارات عقد الإيجار.
 *
 * العرض بـ`equipment:view` والتحرير بـ`equipment:create/edit`، مفروضة في
 * الخادم داخل الإجراءات. الإصدار المقبول نصُّه ثابت؛ التعديل يقتصر على
 * العنوان والتفعيل، والتغيير الجوهري يُنشئ إصدارًا جديدًا.
 */

import { AgreementManager, type AgreementRow } from "@/components/admin/equipment/agreement-manager";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { requirePermission } from "@/lib/admin/session";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface AgreementRecord {
  id: string;
  version: number;
  title: string;
  body: string;
  active: boolean;
}

export default async function EquipmentAgreementsPage() {
  const gate = await requirePermission("equipment", "view");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }

  const svc = getServiceSupabase();
  const [{ data: agreements }, { data: rentals }] = await Promise.all([
    svc
      .from("equipment_agreements")
      .select("id, version, title, body, active")
      .order("version", { ascending: false }),
    svc.from("equipment_rentals").select("agreement_version"),
  ]);

  const accepted = new Map<number, number>();
  for (const row of (rentals ?? []) as { agreement_version: number }[]) {
    accepted.set(row.agreement_version, (accepted.get(row.agreement_version) ?? 0) + 1);
  }

  const rows: AgreementRow[] = ((agreements ?? []) as AgreementRecord[]).map((agreement) => ({
    id: agreement.id,
    version: agreement.version,
    title: agreement.title,
    body: agreement.body,
    active: agreement.active,
    acceptedCount: accepted.get(agreement.version) ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        eyebrow="المحتوى"
        index="02"
        title="عقود الإيجار"
        description="نص العقد الذي يقرؤه العميل ويوقّعه إلكترونيًا باسمه ورقم هويته. الإصدار المفعّل وحده يُعرض في كل إيجار جديد."
      />
      <AgreementManager agreements={rows} />
    </div>
  );
}
