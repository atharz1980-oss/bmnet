import { redirect } from "next/navigation";

/**
 * /admin/settings — توجيه مباشر إلى الإعدادات العامة
 * حتى لا يظهر 404 عند زيارة /admin/settings.
 */
export default function SettingsIndexPage() {
  redirect("/admin/settings/general");
}
