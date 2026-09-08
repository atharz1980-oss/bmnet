"use client";

/**
 * /admin/trainers/new — إضافة مدرب جديد (المهمة #12)
 * نفس محرر المدرب بوضع الإنشاء.
 */
import { TrainerEditor } from "@/components/admin/trainers/trainer-editor";

export default function NewTrainerPage() {
  return <TrainerEditor mode="create" />;
}
