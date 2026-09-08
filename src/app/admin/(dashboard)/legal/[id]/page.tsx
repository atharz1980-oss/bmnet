"use client";

/**
 * /admin/legal/[id] — تحرير صفحة قانونية (#18)
 */
import { useParams } from "next/navigation";

import { LegalEditor } from "@/components/admin/legal/legal-editor";

export default function LegalPageEditorPage() {
  const params = useParams<{ id: string }>();
  const pageId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <LegalEditor pageId={pageId ?? ""} />;
}
