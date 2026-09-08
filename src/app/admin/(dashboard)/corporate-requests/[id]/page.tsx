"use client";

/**
 * /admin/corporate-requests/[id] — تفاصيل طلب تدريب الشركات (#16)
 * المعرّف من المسار — نفس نمط صفحات المحررات.
 */
import { useParams } from "next/navigation";

import { RequestDetail } from "@/components/admin/corporate-requests/request-detail";

export default function CorporateRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return <RequestDetail requestId={requestId ?? ""} />;
}
