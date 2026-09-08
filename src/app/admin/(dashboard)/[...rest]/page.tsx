import { notFound } from "next/navigation";

/**
 * catch-all تحت /admin — إصلاح Admin 404 (Checkpoint 5)
 * ------------------------------------------------------
 * أي مسار غير معروف تحت /admin/* يقع هنا بدل 404 الجذر، ويستدعي
 * notFound() فيُصيَّر not-found الخاص بالإدارة داخل AdminShell
 * (بدون Navbar/Footer العام — من دون إعادة هيكلة Phase 1).
 * المسارات المعروفة تسبق الـ catch-all تلقائيًا في التوجيه.
 */
export default function AdminCatchAllPage() {
  notFound();
}
