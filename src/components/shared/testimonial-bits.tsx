import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** عرض النجوم للتقييمات */
export function StarRating({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`تقييم ${rating} من 5 نجوم`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            "h-4 w-4",
            index < rating ? "fill-brand-600 text-brand-600" : "fill-charcoal-200 text-charcoal-200"
          )}
        />
      ))}
    </div>
  );
}

/** شارة تقييم Google — مؤشر رمادي بسيط قابل للتحديث مستقبلاً */
export function GoogleReviewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-charcoal-200 bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal-500",
        className
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
        />
      </svg>
      تقييم Google
    </span>
  );
}
