"use client";

/**
 * WhyUsIcons — سجل أيقونات قسم «لماذا نحن»
 * ------------------------------------------
 * المالك يختار من مفاتيح معروفة فقط — ممنوع رفع SVG أو كود من المستخدم
 * (متطلب صريح في مواصفة #14). المفاتيح متاحة للـ Preview والمحرر معًا
 * من هذا المصدر الواحد.
 */
import {
  Award,
  Camera,
  Clock3,
  GraduationCap,
  Heart,
  LifeBuoy,
  Lightbulb,
  MonitorPlay,
  Sparkles,
  Target,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface WhyUsIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const WHY_US_ICONS: WhyUsIconOption[] = [
  { key: "camera", label: "كاميرا", icon: Camera },
  { key: "video", label: "فيديو", icon: Video },
  { key: "users", label: "مجموعة", icon: Users },
  { key: "graduation", label: "تدريب", icon: GraduationCap },
  { key: "lightbulb", label: "فكرة", icon: Lightbulb },
  { key: "award", label: "شهادة", icon: Award },
  { key: "monitor-play", label: "بيئة تدريب", icon: MonitorPlay },
  { key: "lifebuoy", label: "متابعة", icon: LifeBuoy },
  { key: "target", label: "هدف", icon: Target },
  { key: "clock", label: "وقت", icon: Clock3 },
  { key: "heart", label: "شغف", icon: Heart },
  { key: "sparkles", label: "تميّز", icon: Sparkles },
];

/** الأيقونة بمفتاحها — وأي مفتاح غير معروف يسقط إلى بلا أيقونة بأمان */
export function whyUsIcon(key: string | undefined): LucideIcon | undefined {
  return WHY_US_ICONS.find((option) => option.key === key)?.icon;
}

export const WHY_US_ICON_KEYS = WHY_US_ICONS.map((option) => option.key);
