"use client";
/**
 * زر المتابعة/إلغاء المتابعة — يعيد العدادات من القاعدة بعد كل عملية (race-safe).
 */
import { useState } from "react";
import { Loader2, UserPlus, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toggleFollowAction } from "@/app/community/actions/social";

export function FollowButton({
  targetUserId,
  initialFollowing,
  onChange,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
}) {
  const { toast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
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
