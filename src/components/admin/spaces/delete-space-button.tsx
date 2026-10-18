"use client";

/**
 * حذف مساحة من قائمة الإدارة — بتأكيد على خطوتين.
 * المساحة ذات الحجوزات تُرفض من الخادم برسالة عربية؛ الحذف هنا تجمعي
 * بلا حوار مفقود: الضغطة الأولى تكشف التأكيد، والثانية تنفّذ.
 */

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteSpaceAction } from "@/app/admin/actions/spaces";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function DeleteSpaceButton({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden="true" className="me-1.5 h-4 w-4" />
        حذف
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-danger-700">حذف «{spaceName}» نهائيًا؟</span>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteSpaceAction(spaceId);
            if (result.ok) {
              toast({ title: "حُذفت المساحة", description: `حُذفت «${spaceName}» وصورها — لا حجوزات عليها.` });
            } else {
              toast({ title: "تعذر الحذف", description: result.error, variant: "destructive" });
            }
            setConfirming(false);
          })
        }
      >
        {pending ? "جارٍ الحذف…" : "تأكيد الحذف"}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        تراجع
      </Button>
    </span>
  );
}
