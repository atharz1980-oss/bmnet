"use client";

/**
 * PricingTab — تبويب التسعير
 * القواعد (تمنع الحالات المتناقضة):
 *  - مجانية (isFree) → السعر النهائي 0 وتُقفل حقول السعر.
 *  - طلب عرض سعر (requestQuote) → لا منطق سعر عادي في الملخص.
 *  - السعر الأساسي (price) هو السعر النهائي ومصدر الحقيقة؛
 *    originalPrice وdiscountPercent للعرض فقط (وسم قبل الخصم).
 */
import type { CourseInput } from "@/context/admin-store";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/admin/ui/field";
import { formatNumber } from "@/lib/format";
import { courseTypeLabel } from "../course-meta";
import { parseIntOrZero } from "./editor-helpers";
import { CoursePaymentMethods } from "./payment-methods";

interface TabProps {
  draft: CourseInput;
  update: (patch: Partial<CourseInput>) => void;
  errors: Record<string, string>;
  /** غائب في وضع الإنشاء — لا وجود للدورة بعد فلا وسائل دفع لها. */
  courseId?: string;
}

export function PricingTab({ draft, update, errors, courseId }: TabProps) {
  const { pricing } = draft;
  const setPricing = (patch: Partial<CourseInput["pricing"]>) =>
    update({ pricing: { ...pricing, ...patch } });

  const isQuote = pricing.requestQuote;
  const isFree = pricing.isFree;
  const lockPrice = isQuote || isFree;

  const finalPrice = isFree ? 0 : pricing.price;
  const isCorporate = draft.type === "in-person-corporates";
  const isOnline = draft.type === "online";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="price"
          label="السعر الأساسي (ريال)"
          error={errors["pricing.price"]}
          hint={lockPrice ? "مقفل حسب الوضع المختار" : "السعر شامل ضريبة القيمة المضافة 15%"}
        >
          <Input
            id="price"
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            value={isFree ? 0 : pricing.price}
            onChange={(event) => setPricing({ price: parseIntOrZero(event.target.value) })}
            disabled={lockPrice}
            aria-invalid={Boolean(errors["pricing.price"])}
            className="num-ltr bg-white"
          />
        </Field>

        <Field id="original-price" label="السعر قبل الخصم" hint={lockPrice ? "مقفل حسب الوضع المختار" : "لعرضه مشطوبًا"}>
          <Input
            id="original-price"
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            value={pricing.originalPrice ?? ""}
            onChange={(event) =>
              setPricing({
                originalPrice: event.target.value === "" ? undefined : parseIntOrZero(event.target.value),
              })
            }
            disabled={lockPrice}
            className="num-ltr bg-white"
          />
        </Field>

        <Field
          id="discount-percent"
          label="نسبة الخصم %"
          error={errors["pricing.discountPercent"]}
          hint={lockPrice ? "مقفل حسب الوضع المختار" : "وسم إعلاني — لا يغيّر السعر"}
        >
          <Input
            id="discount-percent"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={pricing.discountPercent ?? ""}
            onChange={(event) =>
              setPricing({
                discountPercent:
                  event.target.value === "" ? undefined : parseIntOrZero(event.target.value),
              })
            }
            disabled={lockPrice}
            aria-invalid={Boolean(errors["pricing.discountPercent"])}
            className="num-ltr bg-white"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
          <div>
            <p className="text-sm font-medium text-charcoal-800">دورة مجانية</p>
            <p className="mt-0.5 text-xs text-muted-foreground">السعر النهائي يصبح صفرًا</p>
          </div>
          <Switch
            checked={isFree}
            onCheckedChange={(checked) => setPricing({ isFree: checked })}
            aria-label="دورة مجانية"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
          <div>
            <p className="text-sm font-medium text-charcoal-800">إظهار السعر</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              عند الإخفاء تظهر «حسب الطلب» في الواجهات
            </p>
          </div>
          <Switch
            checked={pricing.showPrice}
            onCheckedChange={(checked) => setPricing({ showPrice: checked })}
            disabled={isQuote}
            aria-label="إظهار السعر"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
        <div>
          <p className="text-sm font-medium text-charcoal-800">اطلب عرض سعر</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isCorporate
              ? "مناسب للشركات — يستبدل السعر بطلب عرض سعر (Corporate Lead لاحقًا)"
              : "مصمم لتدريب الشركات — يُفضَّل تفعيله مع نوع «حضوري شركات»"}
          </p>
        </div>
        <Switch
          checked={isQuote}
          onCheckedChange={(checked) => setPricing({ requestQuote: checked })}
          aria-label="اطلب عرض سعر بدل السعر"
        />
      </div>

      {/* التسجيل والدفع — للدورات الأونلاين وحدها */}
      {isOnline ? (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-bold text-charcoal-900">التسجيل والدفع</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              طريقة التسجيل:{" "}
              <span className="font-semibold text-charcoal-800">
                {isQuote ? "حسب الطلب" : isFree ? "مجانية" : "مدفوعة"}
              </span>
              {isFree ? " — يبدأ الطالب الدورة فورًا بلا دفع." : null}
            </p>
          </div>
          <CoursePaymentMethods
            courseId={courseId}
            disabled={isFree || isQuote}
            reason={
              isQuote
                ? "الدورة معروضة «حسب الطلب»، فلا شراء إلكتروني لها."
                : isFree
                  ? "الدورة مجانية، فلا حاجة لوسيلة دفع."
                  : undefined
            }
          />
        </div>
      ) : null}

      {/* ملخص السعر المباشر */}
      <div
        aria-live="polite"
        className="rounded-xl border border-brand-200 bg-brand-50/50 p-4"
      >
        <p className="mb-2 text-sm font-semibold text-charcoal-900">ملخص السعر النهائي</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">النوع</dt>
            <dd className="mt-0.5 font-medium text-charcoal-800">{courseTypeLabel(draft.type)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">الحالة</dt>
            <dd className="mt-0.5 font-medium text-charcoal-800">
              {isQuote ? "اطلب عرض سعر" : isFree ? "مجانية" : pricing.showPrice ? "معروضة" : "مخفية"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">السعر النهائي</dt>
            <dd className="mt-0.5 font-bold text-charcoal-900">
              {isQuote ? (
                "اطلب عرض سعر"
              ) : isFree ? (
                "مجانية"
              ) : (
                <span className="num-ltr">{formatNumber(finalPrice)} ريال</span>
              )}
            </dd>
          </div>
        </dl>
        {!isQuote && !isFree && pricing.originalPrice && pricing.originalPrice > finalPrice ? (
          <p className="mt-2 text-xs text-muted-foreground">
            قبل الخصم: <span className="num-ltr line-through">{formatNumber(pricing.originalPrice)}</span> ريال
            {pricing.discountPercent ? (
              <>
                {" "}— الخصم <span className="num-ltr">{formatNumber(pricing.discountPercent)}%</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
