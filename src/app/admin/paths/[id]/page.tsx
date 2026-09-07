"use client";

/**
 * /admin/paths/[id] — تعديل مسار (المهمة #13)
 * نفس محرر المسار بوضع التعديل — المعرّف من المسار.
 */
import { useParams } from "next/navigation";

import { PathEditor } from "@/components/admin/paths/path-editor";

export default function EditPathPage() {
  const params = useParams<{ id: string }>();
  const pathId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <PathEditor mode="edit" pathId={pathId} />;
}
