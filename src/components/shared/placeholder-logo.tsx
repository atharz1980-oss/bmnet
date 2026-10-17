import Image from "next/image";
import { cn } from "@/lib/utils";

interface PlaceholderLogoProps {
  /** الاسم المعروض داخل الشعار المؤقت (ونص الـ alt للشعار الرسمي) */
  name: string;
  nameEn?: string;
  note?: string;
  /** مسار الشعار الرسمي من /public — إن وُجد يُعرض بدل النص المؤقت */
  logo?: string;
  className?: string;
}

/**
 * مربّع الشعار: يعرض الشعار الرسمي إن كان مرفقًا، وإلا Placeholder مؤقت
 * حتى توفر الشعارات الرسمية — يكفي استبدال هذا المكوّن بصورة الشعار.
 */
export function PlaceholderLogo({ name, nameEn, note, logo, className }: PlaceholderLogoProps) {
  const boxClass = cn(
    "group flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-charcoal-200 bg-white px-4 transition-transform duration-300 ease-out hover:scale-[1.03]",
    className
  );

  if (logo) {
    return (
      <div title={note} className={boxClass}>
        <Image
          src={logo}
          alt={name}
          width={160}
          height={64}
          className="h-auto max-h-full w-auto max-w-full object-contain transition-all duration-300 ease-out group-hover:scale-[1.05] group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
          style={{ filter: "grayscale(100%) contrast(120%) brightness(95%)" }}
        />
      </div>
    );
  }

  return (
    <div title={note} className={boxClass}>
      <div className="text-center">
        {nameEn ? (
          <span className="font-latin block text-base font-bold tracking-[0.18em] text-charcoal-700">
            {nameEn}
          </span>
        ) : (
          <span className="block max-w-[11rem] text-sm font-semibold leading-snug text-charcoal-700">
            {name}
          </span>
        )}
        <span className="mt-1 block text-[10px] font-normal text-charcoal-500">
          شعار مؤقت
        </span>
      </div>
    </div>
  );
}
