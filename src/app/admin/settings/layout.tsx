"use client";

/**
 * /admin/settings — تخطيط الإعدادات (#18)
 * قائمة تنقل موحدة (Sidebar عمودي / صف أفقي موبايل) + محتوى الصفحة.
 * كل صفحة إعدادات تحرر قسمًا واحدًا من مخزن واحد — لا إعدادات مكررة
 * في عدة stores (متطلب Checkpoint 5).
 */
import { SettingsPageLayout } from "@/components/admin/settings/settings-shared";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsPageLayout>{children}</SettingsPageLayout>;
}
