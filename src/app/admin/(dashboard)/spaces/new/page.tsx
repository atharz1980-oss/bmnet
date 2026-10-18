/**
 * /admin/spaces/new — إضافة مساحة استوديو جديدة.
 * تحرسها `spaces:create`؛ المحرر نفسه يحفظ البيانات والصور والمواعيد.
 */

import { requirePermission } from "@/lib/admin/session";
import { SpaceEditor } from "@/components/admin/spaces/space-editor";

export const dynamic = "force-dynamic";

export default async function NewSpacePage() {
  const gate = await requirePermission("spaces", "create");
  if (!gate.ok) {
    return (
      <p className="p-8" role="alert">
        {gate.error}
      </p>
    );
  }
  return <SpaceEditor space={null} initialImages={[]} initialHours={[]} />;
}
