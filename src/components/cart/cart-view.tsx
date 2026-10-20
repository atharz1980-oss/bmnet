"use client";

/**
 * واجهة السلة — عرض العناصر، تعديلها، والحذف، والدفع (الكل أو عنصر).
 *
 * كل زر هنا يرسل نموذجًا إلى إجراء خادم يتحقق من الملكية والسعر والتوافر.
 * لا قرار تجاري في المتصفح: السعر المعروض لقطة، والملزم يُحسب على الخادم.
 * أثناء وجود طلب معلق صالح تُعطَّل أزرار التعديل والحذف (لا تغيير تحت
 * الفاتورة)، ويُعرض شريط لإكمال الطلب أو إلغائه.
 */

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  CreditCard,
  GraduationCap,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  cancelCartOrderAction,
  removeCartItemAction,
  startCartCheckoutAction,
  updateCartItemAction,
  type CartActionState,
} from "@/app/cart/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatHalalas } from "@/lib/payments/money";
import { formatPrice } from "@/lib/format";
import { SPACE_CUSTOMER_TYPES, SPACE_CUSTOMER_TYPE_LIST, type SpaceCustomerType } from "@/lib/spaces/customer-types";
import { cn } from "@/lib/utils";
import type { CartContact, CartPageItem, CartPageView, CartOrderSummary } from "@/lib/cart/types";

function ContactFields({
  contact,
  customerType,
  onCustomerTypeChange,
  disabled,
}: {
  contact: CartContact;
  customerType: SpaceCustomerType;
  onCustomerTypeChange: (value: SpaceCustomerType) => void;
  disabled: boolean;
}) {
  const showCompany = customerType === "company" || customerType === "advertiser";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="cart-name">
          الاسم الكامل <span className="text-danger-600">*</span>
        </Label>
        <Input
          id="cart-name"
          name="name"
          defaultValue={contact.customerName}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          className="mt-1.5"
          disabled={disabled}
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="cart-customer-type">نوع الحجز</Label>
        <select
          id="cart-customer-type"
          name="customerType"
          value={customerType}
          onChange={(event) => onCustomerTypeChange(event.target.value as SpaceCustomerType)}
          className="mt-1.5 h-11 w-full rounded-md border border-input bg-transparent px-3 text-base lg:h-9 lg:text-sm"
          disabled={disabled}
        >
          {SPACE_CUSTOMER_TYPE_LIST.map((type) => (
            <option key={type} value={type}>
              {SPACE_CUSTOMER_TYPES[type]}
            </option>
          ))}
        </select>
      </div>

      {showCompany ? (
        <div className="sm:col-span-2">
          <Label htmlFor="cart-company">
            اسم الشركة أو الجهة <span className="text-danger-600">*</span>
          </Label>
          <Input
            id="cart-company"
            name="companyName"
            defaultValue={contact.companyName}
            minLength={2}
            maxLength={120}
            autoComplete="organization"
            className="mt-1.5"
            disabled={disabled}
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="cart-email">
          البريد الإلكتروني <span className="text-danger-600">*</span>
        </Label>
        <Input
          id="cart-email"
          name="email"
          type="email"
          dir="ltr"
          defaultValue={contact.email}
          required
          autoComplete="email"
          className="mt-1.5"
          disabled={disabled}
        />
      </div>

      <div>
        <Label htmlFor="cart-phone">
          الجوال <span className="text-danger-600">*</span>
        </Label>
        <Input
          id="cart-phone"
          name="phone"
          type="tel"
          dir="ltr"
          defaultValue={contact.phone}
          placeholder="05XXXXXXXX"
          required
          autoComplete="tel"
          className="mt-1.5"
          disabled={disabled}
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="cart-notes">ملاحظات (اختياري)</Label>
        <Textarea
          id="cart-notes"
          name="notes"
          defaultValue={contact.notes}
          maxLength={2000}
          rows={3}
          className="mt-1.5"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Honeypot({ id = "cart-hp" }: { id?: string }) {
  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor={id}>لا تملأ هذا الحقل</label>
      <input id={id} type="text" name="website" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

function OrderBanner({ order }: { order: CartOrderSummary }) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(cancelCartOrderAction, {
    error: null,
  });
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Lock aria-hidden="true" className="h-4 w-4" />
        لديك طلب دفع معلق لم يكتمل
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-800">
        طلب بقيمة {formatHalalas(order.totalAmount)} ر.س لمكتمل — أكمله أو ألغِه قبل أي تعديل على السلة.
      </p>
      {state.error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-danger-700">
          {state.error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {order.checkoutUrl ? (
          <Button asChild size="sm">
            <a href={order.checkoutUrl}>إكمال الدفع</a>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href={`/order/${order.id}`}>متابعة الطلب</Link>
          </Button>
        )}
        <form action={action}>
          <Honeypot id={`cancel-hp-${order.id}`} />
          <input type="hidden" name="orderId" value={order.id} />
          <Button type="submit" size="sm" variant="outline" disabled={pending} className="gap-1.5">
            {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <X aria-hidden="true" className="h-4 w-4" />}
            إلغاء الطلب
          </Button>
        </form>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/order/${order.id}`}>تفاصيل الطلب</Link>
        </Button>
      </div>
    </div>
  );
}

function ItemCard({
  entry,
  disabled,
  onPayItem,
}: {
  entry: CartPageItem;
  disabled: boolean;
  onPayItem: (itemId: string) => void;
}) {
  const { item, sessionOptions, needsSession } = entry;
  const [editing, setEditing] = useState(false);
  const [removeState, removeAction, removePending] = useActionState<CartActionState, FormData>(
    removeCartItemAction,
    { error: null },
  );
  const [updateState, updateAction, updatePending] = useActionState<CartActionState, FormData>(
    updateCartItemAction,
    { error: null },
  );
  const error = removeState.error ?? updateState.error;

  return (
    <li className="rounded-xl border border-charcoal-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            item.kind === "course" ? "bg-brand-50 text-brand-700" : "bg-charcoal-100 text-charcoal-600",
          )}
        >
          {item.kind === "course" ? (
            <GraduationCap aria-hidden="true" className="h-4 w-4" />
          ) : (
            <MapPin aria-hidden="true" className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={item.href} className="text-sm font-semibold text-charcoal-900 hover:underline">
            {item.title}
          </Link>
          {item.subtitle ? (
            <p className="num-ltr mt-0.5 text-xs leading-relaxed text-charcoal-500">{item.subtitle}</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-charcoal-800">
            {formatHalalas(item.unitGrossHalalas)} <span className="text-xs font-normal text-charcoal-400">ر.س شامل الضريبة</span>
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : null}

      {editing && !disabled ? (
        <form action={updateAction} className="mt-4 rounded-lg border border-charcoal-100 bg-surface p-3">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="kind" value={item.kind} />
          {item.kind === "course" ? (
            <>
              <Label htmlFor={`session-${item.id}`}>الموعد</Label>
              {sessionOptions.length === 0 ? (
                <p className="mt-1.5 text-xs text-charcoal-500">لا مواعيد متاحة الآن لهذه الدورة.</p>
              ) : (
                <select
                  id={`session-${item.id}`}
                  name="sessionId"
                  defaultValue={item.sessionId ?? ""}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-transparent px-3 text-base lg:h-9 lg:text-sm"
                >
                  {sessionOptions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {[session.label, session.time, session.place].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </select>
              )}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`date-${item.id}`}>اليوم</Label>
                <Input
                  id={`date-${item.id}`}
                  name="date"
                  type="date"
                  defaultValue={item.bookingDate ?? ""}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor={`start-${item.id}`}>من</Label>
                <Input
                  id={`start-${item.id}`}
                  name="start"
                  type="time"
                  step={1800}
                  defaultValue={item.startTime ?? ""}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor={`end-${item.id}`}>إلى</Label>
                <Input
                  id={`end-${item.id}`}
                  name="end"
                  type="time"
                  step={1800}
                  defaultValue={item.endTime ?? ""}
                  required
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" disabled={updatePending} className="gap-1.5">
              {updatePending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              حفظ التعديل
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || removePending}
          onClick={() => setEditing((value) => !value)}
          className="gap-1.5"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          {editing ? "إغلاق" : "تعديل"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || removePending || updatePending}
          onClick={() => onPayItem(item.id)}
          className="gap-1.5"
        >
          <CreditCard aria-hidden="true" className="h-4 w-4" />
          ادفع هذا العنصر
        </Button>
        <form action={removeAction}>
          <Honeypot id={`remove-hp-${item.id}`} />
          <input type="hidden" name="itemId" value={item.id} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={disabled || removePending}
            className="gap-1.5 text-danger-700 hover:text-danger-800"
          >
            {removePending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
            حذف
          </Button>
        </form>
      </div>
    </li>
  );
}

export function CartView({ view, notice }: { view: CartPageView; notice: string | null }) {
  const { cart, items, checkoutReady, checkoutNotice } = view;
  const [payState, payAction, payPending] = useActionState<CartActionState, FormData>(
    startCartCheckoutAction,
    { error: null },
  );
  const [payItemId, setPayItemId] = useState<string | null>(null);
  useEffect(() => {
    if (!payItemId) return;
    const form = document.getElementById("cart-checkout-form") as HTMLFormElement | null;
    form?.requestSubmit();
  }, [payItemId]);

  const [customerType, setCustomerType] = useState<SpaceCustomerType>(cart.contact.customerType ?? "individual");
  const hasPending = cart.pendingOrders.length > 0;

  const subtotal = useMemo(() => items.reduce((sum, entry) => sum + entry.item.unitGrossHalalas, 0), [items]);

  if (items.length === 0 && !hasPending) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-charcoal-200 p-10 text-center">
        <ShoppingBag aria-hidden="true" className="mx-auto h-10 w-10 text-charcoal-300" />
        <h2 className="mt-4 text-lg font-bold text-charcoal-900">سلتك فارغة</h2>
        <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
          أضف دورات أو مواعيد مساحات ثم أتمم الدفع مرة واحدة.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/courses">تصفّح الدورات</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/spaces">تصفّح المساحات</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {notice ? (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            {notice}
          </p>
        ) : null}

        {cart.pendingOrders.map((order) => (
          <OrderBanner key={order.id} order={order} />
        ))}

        {cart.requiresAccount ? (
          <p className="flex items-start gap-2 rounded-xl border border-charcoal-200 bg-surface px-4 py-3 text-sm leading-relaxed text-charcoal-700">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            في سلتك دورة — يلزم تسجيل الدخول لإتمام شرائها. حجوزات المساحة يمكن دفعها كضيف.
          </p>
        ) : null}

        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((entry) => (
              <ItemCard
                key={entry.item.id}
                entry={entry}
                disabled={hasPending}
                onPayItem={(id) => {
                  setPayItemId(id);
                }}
              />
            ))}
          </ul>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24">
        <form id="cart-checkout-form" action={payAction} className="space-y-5 rounded-2xl border border-charcoal-200 bg-white p-5">
          <Honeypot />
          <input type="hidden" name="intent" value={payItemId ? "item" : "all"} />
          {payItemId ? <input type="hidden" name="itemId" value={payItemId} /> : null}

          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-charcoal-900">بيانات التواصل</h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-charcoal-400">
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              تظهر في الفاتورة
            </span>
          </div>

          <div className="space-y-4">
            <ContactFields
              contact={cart.contact}
              customerType={customerType}
              onCustomerTypeChange={setCustomerType}
              disabled={payPending}
            />
          </div>

          <dl className="space-y-1.5 border-t border-charcoal-100 pt-4 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-charcoal-500">عدد العناصر</dt>
              <dd className="num-ltr font-semibold text-charcoal-900">{items.length}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-charcoal-500">الإجمالي (شامل الضريبة)</dt>
              <dd className="num-ltr font-bold text-charcoal-900">{formatPrice(subtotal / 100)}</dd>
            </div>
          </dl>

          {payState.error ? (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700">
              {payState.error}
            </p>
          ) : null}

          {!checkoutReady ? (
            <p className="flex items-start gap-2 rounded-lg bg-charcoal-50 px-3 py-2 text-xs leading-relaxed text-charcoal-600">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {checkoutNotice ?? "الدفع الإلكتروني غير متاح حاليًا."}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={payPending || hasPending || !checkoutReady || items.length === 0}
            onClick={() => setPayItemId(null)}
          >
            {payPending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <CreditCard aria-hidden="true" className="h-4 w-4" />}
            ادفع كل السلة
          </Button>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-charcoal-400">
            <Lock aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
            دفع آمن عبر ميسر. عند الدفع المنفرد يُخصم العنصر وحده؛ وبقية العناصر تبقى في سلتك.
          </p>
        </form>
      </aside>
    </div>
  );
}
