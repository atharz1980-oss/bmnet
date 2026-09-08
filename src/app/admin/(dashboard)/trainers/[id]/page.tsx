"use client";

/**
 * /admin/trainers/[id] — تعديل مدرب (المهمة #12)
 * نفس محرر المدرب بوضع التعديل — المعرّف من المسار.
 */
import { useParams } from "next/navigation";

import { TrainerEditor } from "@/components/admin/trainers/trainer-editor";

export default function EditTrainerPage() {
  const params = useParams<{ id: string }>();
  const trainerId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <TrainerEditor mode="edit" trainerId={trainerId} />;
}
