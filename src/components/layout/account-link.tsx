"use client";

/**
 * مدخل الحساب في الشريط والتذييل.
 *
 * الزائر يرى «تسجيل الدخول» ويعود بعده إلى الصفحة التي كان فيها.
 * المسجَّل يرى «حسابي» — و`/account` هي التي تقرر وجهته: لوحة التحكم
 * للموظف، وملف المجتمع للعضو. القرار على الخادم لأن تمييز الموظف يحتاج
 * قراءة `profiles`، وهي غير ممنوحة للمتصفح عمدًا.
 *
 * لا يغيّر هذا المكوّن صلاحية ولا يفتح مسارًا: الصفحات العامة تبقى مفتوحة،
 * والمحمية تبقى محمية ببواباتها.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useViewerSession } from "@/hooks/use-viewer-session";
import { communityLoginHref } from "@/lib/community/auth-links";
import { cn } from "@/lib/utils";

type Variant = "navbar" | "mobile" | "footer";

export function AccountLink({
  variant,
  onNavigate,
  className,
}: {
  variant: Variant;
  onNavigate?: () => void;
  className?: string;
}) {
  const session = useViewerSession();
  const pathname = usePathname();

  const signedIn = session === "signed-in";
  const href = signedIn ? "/account" : communityLoginHref(pathname);
  const label = signedIn ? "حسابي" : "تسجيل الدخول";
  const Icon = signedIn ? UserRound : LogIn;

  if (variant === "footer") {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn("transition-colors hover:text-white", className)}
      >
        {label}
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <Button
        asChild
        size="lg"
        variant="outline"
        className={cn(
          "w-full gap-2 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white",
          className,
        )}
      >
        <Link href={href} onClick={onNavigate}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        /* عرض أدنى يتجاوز أعرض النصين («تسجيل الدخول» ‎= 125px): النص
           يتبدل بعد الإرطاب، وبلا حجز يسع الأطول يزحف شريط التنقل.
           قِيس: 104px كان يُزحزح القائمة 10px عند ظهور «حسابي». */
        "hidden min-w-[132px] justify-center gap-1.5 text-charcoal-200 hover:bg-white/10 hover:text-white lg:inline-flex",
        className,
      )}
    >
      <Link href={href} onClick={onNavigate}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
