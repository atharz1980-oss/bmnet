/**
 * nav-config — مصدر واحد لقائمة الـ Sidebar وخرائط مسميات الـ Breadcrumbs
 * إضافة صفحة إدارية جديدة = سطر واحد هنا.
 */
import {
  Building2,
  FileText,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Route,
  Scale,
  Settings,
  ShieldCheck,
  Star,
  Users,
  UserCog,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** يطابق المسار ببدايته بدل التطابق التام (للصفحات ذات القوائم الفرعية) */
  matchPrefix?: boolean;
  /** عدّاد طلبات الشركات الجديدة */
  badge?: "new-requests";
  /** رابط خارج نطاق لوحة التحكم */
  external?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "عام",
    items: [
      { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
      { href: "/", label: "عرض الموقع", icon: ExternalLink, external: true },
    ],
  },
  {
    label: "المحتوى",
    items: [
      { href: "/admin/courses", label: "الدورات", icon: GraduationCap, matchPrefix: true },
      { href: "/admin/trainers", label: "المدربون", icon: UserCog, matchPrefix: true },
      { href: "/admin/paths", label: "المسارات", icon: Route, matchPrefix: true },
      { href: "/admin/blog", label: "المدونة", icon: FileText, matchPrefix: true },
      { href: "/admin/content/home", label: "الصفحة الرئيسية", icon: Home },
      { href: "/admin/testimonials", label: "التقييمات", icon: Star },
      { href: "/admin/media", label: "مكتبة الوسائط", icon: ImageIcon },
    ],
  },
  {
    label: "الطلبات",
    items: [
      {
        href: "/admin/corporate-requests",
        label: "طلبات الشركات",
        icon: Building2,
        matchPrefix: true,
        badge: "new-requests",
      },
    ],
  },
  {
    label: "المجتمع",
    items: [
      { href: "/admin/community", label: "إشراف المجتمع", icon: Users },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/admin/legal", label: "الصفحات القانونية", icon: Scale },
      { href: "/admin/users", label: "المستخدمون", icon: UserCog },
      { href: "/admin/roles", label: "الأدوار والصلاحيات", icon: ShieldCheck },
      { href: "/admin/settings/general", label: "الإعدادات", icon: Settings, matchPrefix: true },
    ],
  },
];

/** مسميات مقاطع المسار لعمود التنقل (Breadcrumbs) */
export const SEGMENT_LABELS: Record<string, string> = {
  admin: "لوحة التحكم",
  courses: "الدورات",
  trainers: "المدربون",
  paths: "المسارات",
  blog: "المدونة",
  content: "المحتوى",
  home: "الصفحة الرئيسية",
  testimonials: "التقييمات",
  media: "مكتبة الوسائط",
  "corporate-requests": "طلبات الشركات",
  users: "المستخدمون",
  roles: "الأدوار",
  community: "المجتمع",
  legal: "الصفحات القانونية",
  settings: "الإعدادات",
  general: "عامة",
  contact: "التواصل",
  footer: "الفوتر",
  seo: "SEO",
  payments: "الدفع",
  new: "إضافة جديد",
  preview: "معاينة",
};
