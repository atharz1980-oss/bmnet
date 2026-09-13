"use client";
/**
 * زر المتابعة/إلغاء المتابعة — يعيد العدادات من القاعدة بعد كل عملية (race-safe).
 *
 * الزائر يراه أيضًا: إخفاؤه عنه يخفي الدعوة نفسها. ضغطه يأخذه إلى الدخول
 * ويعيده إلى هذا الملف.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UserPlus, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toggleFollowAction } from "@/app/community/actions/social";

export function FollowButton({
  targetUserId,
  initialFollowing,
  loginHref,
  onChange,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  /** يُمرَّر للزائر وحده: ضغطه يوجّهه للدخول بدل استدعاء الإجراء. */
  loginHref?: string;
  onChange?: (following: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (loginHref) {
      router.push(loginHref);
      return;
    }
    setBusy(true);
    try {
      const result = await toggleFollowAction(targetUserId);
      if (result.ok) {
        setFollowing(result.data.following);
        onChange?.(result.data.following);
      } else {
        toast({ title: "تعذر تنفيذ المتابعة", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      variant={following ? "outline" : "default"}
      aria-pressed={following}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : following ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
      {following ? "إلغاء المتابعة" : "متابعة"}
    </Button>
  );
}
