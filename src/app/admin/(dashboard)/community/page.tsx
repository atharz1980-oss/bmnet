import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { CommunityModeration } from "./moderation-client";

export const metadata: Metadata = {
  title: "إشراف المجتمع",
  robots: { index: false, follow: false },
};

export default function AdminCommunityPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="إشراف المجتمع"
        description="مراجعة البلاغات واتخاذ الإجراء: إخفاء منشور/تعليق، تعليق عضو، إغلاق البلاغ."
      />
      <CommunityModeration />
    </div>
  );
}
