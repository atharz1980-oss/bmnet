import Link from "next/link";
import { Instagram } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { WhatsAppIcon } from "@/components/shared/social-icons";

export function LandingFooter({
  whatsappHref,
  instagramHref,
}: {
  whatsappHref: string | null;
  instagramHref: string | null;
}) {
  return (
    <footer className="border-t border-white/10 bg-charcoal-950 py-10 text-charcoal-400">
      <Container>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start">
            <Link
              href="/lp/photographer-ai-website"
              className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg"
              aria-label="بيت المصور"
            >
              <Logo className="h-7 w-auto text-white/90" />
            </Link>
            <span className="text-xs text-charcoal-500">
              © {new Date().getFullYear()} بيت المصور — جميع الحقوق محفوظة.
            </span>
          </div>

          {/* روابط السياسات والقوانين */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-charcoal-400">
            <Link
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              سياسة الخصوصية
            </Link>
            <span>•</span>
            <Link
              href="/policies/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              الشروط والأحكام
            </Link>
            <span>•</span>
            <Link
              href="/policies/refund"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              سياسة الاسترجاع
            </Link>
          </div>

          {/* قنوات التواصل المعتمدة */}
          <div className="flex items-center gap-3">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-charcoal-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                aria-label="تواصل معنا عبر واتساب"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}
            {instagramHref && (
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-charcoal-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                aria-label="حساب بيت المصور على إنستغرام"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </Container>
    </footer>
  );
}
