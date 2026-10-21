export interface CountryMeta {
  code: string;
  dialCode: string;
  nameAr: string;
  flag: string;
  placeholder: string;
}

export const COUNTRIES: CountryMeta[] = [
  { code: "SA", dialCode: "+966", nameAr: "السعودية", flag: "🇸🇦", placeholder: "50 123 4567" },
  { code: "AE", dialCode: "+971", nameAr: "الإمارات", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "KW", dialCode: "+965", nameAr: "الكويت", flag: "🇰🇼", placeholder: "9123 4567" },
  { code: "BH", dialCode: "+973", nameAr: "البحرين", flag: "🇧🇭", placeholder: "3912 3456" },
  { code: "QA", dialCode: "+974", nameAr: "قطر", flag: "🇶🇦", placeholder: "5512 3456" },
  { code: "OM", dialCode: "+968", nameAr: "عُمان", flag: "🇴🇲", placeholder: "9123 4567" },
  { code: "EG", dialCode: "+20", nameAr: "مصر", flag: "🇪🇬", placeholder: "10 1234 5678" },
  { code: "JO", dialCode: "+962", nameAr: "الأردن", flag: "🇯🇴", placeholder: "7 9123 4567" },
  { code: "LB", dialCode: "+961", nameAr: "لبنان", flag: "🇱🇧", placeholder: "70 123 456" },
  { code: "IQ", dialCode: "+964", nameAr: "العراق", flag: "🇮🇶", placeholder: "790 123 4567" },
  { code: "MA", dialCode: "+212", nameAr: "المغرب", flag: "🇲🇦", placeholder: "612-345678" },
  { code: "DZ", dialCode: "+213", nameAr: "الجزائر", flag: "🇩🇿", placeholder: "551 23 45 67" },
  { code: "TN", dialCode: "+216", nameAr: "تونس", flag: "🇹🇳", placeholder: "20 123 456" },
  { code: "LY", dialCode: "+218", nameAr: "ليبيا", flag: "🇱🇾", placeholder: "91 234 5678" },
  { code: "SD", dialCode: "+249", nameAr: "السودان", flag: "🇸🇩", placeholder: "91 234 5678" },
  { code: "YE", dialCode: "+967", nameAr: "اليمن", flag: "🇾🇪", placeholder: "71 234 567" },
  { code: "PS", dialCode: "+970", nameAr: "فلسطين", flag: "🇵🇸", placeholder: "59 123 4567" },
  { code: "SY", dialCode: "+963", nameAr: "سوريا", flag: "🇸🇾", placeholder: "94 123 4567" },
  { code: "TR", dialCode: "+90", nameAr: "تركيا", flag: "🇹🇷", placeholder: "501 234 5678" },
  { code: "US", dialCode: "+1", nameAr: "الولايات المتحدة / كندا", flag: "🇺🇸", placeholder: "(201) 555-0123" },
  { code: "GB", dialCode: "+44", nameAr: "المملكة المتحدة", flag: "🇬🇧", placeholder: "7911 123456" },
  { code: "DE", dialCode: "+49", nameAr: "ألمانيا", flag: "🇩🇪", placeholder: "151 23456789" },
  { code: "FR", dialCode: "+33", nameAr: "فرنسا", flag: "🇫🇷", placeholder: "6 12 34 56 78" },
  { code: "IT", dialCode: "+39", nameAr: "إيطاليا", flag: "🇮🇹", placeholder: "312 345 6789" },
  { code: "ES", dialCode: "+34", nameAr: "إسبانيا", flag: "🇪🇸", placeholder: "612 34 56 78" },
  { code: "NL", dialCode: "+31", nameAr: "هولندا", flag: "🇳🇱", placeholder: "6 12345678" },
  { code: "SE", dialCode: "+46", nameAr: "السويد", flag: "🇸🇪", placeholder: "70 123 45 67" },
  { code: "NO", dialCode: "+47", nameAr: "النرويج", flag: "🇳🇴", placeholder: "412 34 567" },
  { code: "CH", dialCode: "+41", nameAr: "سويسرا", flag: "🇨🇭", placeholder: "78 123 45 67" },
  { code: "AU", dialCode: "+61", nameAr: "أستراليا", flag: "🇦🇺", placeholder: "412 345 678" },
  { code: "MY", dialCode: "+60", nameAr: "ماليزيا", flag: "🇲🇾", placeholder: "12-345 6789" },
  { code: "SG", dialCode: "+65", nameAr: "سنغافورة", flag: "🇸🇬", placeholder: "8123 4567" },
  { code: "IN", dialCode: "+91", nameAr: "الهند", flag: "🇮🇳", placeholder: "98123 45678" },
  { code: "PK", dialCode: "+92", nameAr: "باكستان", flag: "🇵🇰", placeholder: "301 2345678" },
];

export function findCountryByDialCode(phoneWithPlus: string): CountryMeta | undefined {
  if (!phoneWithPlus.startsWith("+")) return undefined;
  // رتب تنازلياً حسب طول مفتاح الدولة لمطابقة الأطول أولاً (+971 قبل +97)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find((c) => phoneWithPlus.startsWith(c.dialCode));
}
