import Link from "next/link";
import { Camera, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-charcoal-950 text-brand-400">
        <Camera aria-hidden="true" className="h-7 w-7" />
      </span>
      <p className="font-latin mt-6 text-6xl font-bold tracking-tight text-charcoal-900">404</p>
      <h1 className="mt-3 text-xl font-bold text-charcoal-900 sm:text-2xl">
        الصفحة خارج الإطار!
      </h1>
      <p className="mt-3 max-w-md leading-relaxed text-charcoal-500">
        الصفحة التي تبحث عنها غير موجودة أو تم نقلها. يمكنك العودة للرئيسية
        أو استعراض دوراتنا التدريبية.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-12 px-7 text-base font-semibold">
          <Link href="/">
            <Home aria-hidden="true" className="h-4 w-4" />
            العودة للرئيسية
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base font-semibold">
          <Link href="/courses">استكشف الدورات</Link>
        </Button>
      </div>
    </Container>
  );
}
