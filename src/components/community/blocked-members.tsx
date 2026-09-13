"use client";

/**
 * قائمة من حجبهم العضو.
 * بلا هذه الصفحة كان الحجب بابًا لا رجعة منه: منشورات المحجوب تختفي من
 * الخلاصة، وزر فك الحجب موجود داخل بطاقة المنشور وحدها — فلا تصل إليه أبدًا.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { ShieldOff, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { unblockUserAction } from "@/app/community/actions/social";
import type { BlockedMember } from "@/lib/community/loaders";
import { CommunityImage } from "./community-image";

export function BlockedMembers({ initialMembers }: { initialMembers: BlockedMember[] }) {
  const { toast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const unblock = (member: BlockedMember) => {
    setPendingId(member.userId);
    start(async () => {
      const result = await unblockUserAction(member.userId);
      if (result.ok) {
        setMembers((current) => current.filter((item) => item.userId !== member.userId));
        toast({
          title: `أُلغي حجب ${member.displayName}`,
          description: "ستعود منشوراته للظهور في الخلاصة. المتابعة السابقة لا تعود تلقائيًا.",
        });
      } else {
        toast({ title: "تعذر فك الحجب", description: result.error });
      }
      setPendingId(null);
    });
  };

  if (members.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-10 text-center">
        <ShieldOff aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-charcoal-300" />
        <p className="text-sm font-medium text-charcoal-700">لم تحجب أحدًا</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          يمكنك حجب أي عضو من قائمة الخيارات في منشوره.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {member.avatarUrl ? (
                <CommunityImage
                  src={member.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserX aria-hidden="true" className="h-5 w-5 text-charcoal-400" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-charcoal-900">{member.displayName}</p>
              {member.username ? (
                <Link
                  href={`/community/u/${member.username}`}
                  className="truncate text-xs text-muted-foreground hover:underline"
                  dir="ltr"
                >
                  @{member.username}
                </Link>
              ) : null}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pendingId === member.userId}
            onClick={() => unblock(member)}
          >
            {pendingId === member.userId ? "جارٍ…" : "فك الحجب"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
