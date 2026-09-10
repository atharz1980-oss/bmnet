"use client";
/**
 * قائمة الإشعارات — تعليم قراءة واحد/الكل (صفوف المالك فقط عبر RLS).
 */
import Link from "next/link";
import { useState } from "react";
import { AtSign, BellOff, Heart, Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MemberAvatar } from "./member-avatar";
import { formatShortDate } from "@/lib/format";
import { NOTIFICATION_LABELS, type NotificationItem } from "@/lib/community/types";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/community/actions/notifications";

const ICONS = {
  follow: AtSign,
  like: Heart,
  comment: MessageCircle,
} as const;

export function NotificationsList({
  initialItems,
  initialUnread,
}: {
  initialItems: NotificationItem[];
  initialUnread: number;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState(false);

  async function markOne(id: string) {
    setBusy(true);
    try {
      const result = await markNotificationReadAction(id);
      if (result.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
        setUnread((u) => Math.max(0, u - 1));
      } else {
        toast({ title: "تعذر التعليم", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    setBusy(true);
    try {
      const result = await markAllNotificationsReadAction();
      if (result.ok) {
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
        setUnread(0);
        toast({ title: "عُلّمت جميع الإشعارات كمقروءة" });
      } else {
        toast({ title: "تعذر التعليم", description: result.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center space-y-2" role="status">
        <BellOff className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">لا إشعارات جديدة</p>
        <p className="text-sm text-muted-foreground">
          ستظهر هنا إشعارات المتابعة والإعجاب والتعليق على أعمالك.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {unread > 0 ? `${unread} إشعار غير مقروء` : "كل الإشعارات مقروءة"}
        </p>
        {unread > 0 ? (
          <Button size="sm" variant="outline" onClick={markAll} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            تعليم الكل كمقروء
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2" aria-label="قائمة الإشعارات">
        {items.map((item) => {
          const Icon = ICONS[item.type];
          const href =
            item.entityType === "profile" && item.actorUsername
              ? `/community/u/${item.actorUsername}`
              : "/community";
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${item.read ? "bg-card" : "bg-brand-50"}`}
            >
              <MemberAvatar src={item.actorAvatarUrl} name={item.actorName} className="size-9" />
              <div className="flex-1 text-sm">
                <Link href={href} className="font-medium hover:underline">
                  {item.actorName}
                </Link>{" "}
                <span className="text-muted-foreground">{NOTIFICATION_LABELS[item.type]}</span>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={item.createdAt}>{formatShortDate(item.createdAt)}</time>
                </p>
              </div>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              {!item.read ? (
                <Button size="sm" variant="ghost" onClick={() => markOne(item.id)} disabled={busy}
                  aria-label={`تعليم الإشعار من ${item.actorName} كمقروء`}>
                  تعليم
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
