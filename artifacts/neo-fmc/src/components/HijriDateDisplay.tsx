import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

function gregorianToHijri(date: Date): { year: number; month: number; day: number } {
  const gd = date.getDate();
  const gm = date.getMonth() + 1;
  const gy = date.getFullYear();

  let jd = Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
    Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) + gd - 32075;

  jd = jd - 1948440 + 10632;
  const n = Math.floor((jd - 1) / 10631);
  jd = jd - 10631 * n + 354;
  const j = Math.floor((10985 - jd) / 5316) * Math.floor((50 * jd) / 17719) +
    Math.floor(jd / 5670) * Math.floor((43 * jd) / 15238);
  jd = jd - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hm = Math.floor((24 * jd) / 709);
  const hd = jd - Math.floor((709 * hm) / 24);
  const hy = 30 * n + j - 30;

  return { year: hy, month: hm, day: hd };
}

const HIJRI_MONTHS_AR = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];

const HIJRI_MONTHS_EN = [
  "Muharram", "Safar", "Rabi I", "Rabi II",
  "Jumada I", "Jumada II", "Rajab", "Shaaban",
  "Ramadan", "Shawwal", "Dhul Qidah", "Dhul Hijjah",
];

interface HijriDateDisplayProps {
  date?: Date | string;
  showGregorian?: boolean;
  className?: string;
  compact?: boolean;
}

export function HijriDateDisplay({ date, showGregorian = true, className = "", compact = false }: HijriDateDisplayProps) {
  const { language } = useLanguage();

  const parsed = useMemo(() => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return null;
    return d;
  }, [date]);

  const hijri = useMemo(() => {
    if (!parsed) return null;
    return gregorianToHijri(parsed);
  }, [parsed]);

  if (!parsed || !hijri) return null;

  const monthNames = language === "ar" ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const hijriStr = compact
    ? `${hijri.day}/${hijri.month}/${hijri.year}`
    : `${hijri.day} ${monthNames[hijri.month - 1]} ${hijri.year}`;

  const gregorianStr = compact
    ? parsed.toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "numeric", year: "numeric" })
    : parsed.toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  if (!showGregorian) {
    return <span className={className} dir={language === "ar" ? "rtl" : "ltr"}>{hijriStr} {language === "ar" ? "هـ" : "AH"}</span>;
  }

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span dir={language === "ar" ? "rtl" : "ltr"}>{gregorianStr}</span>
      <span className="text-xs text-muted-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
        {hijriStr} {language === "ar" ? "هـ" : "AH"}
      </span>
    </span>
  );
}

export function useHijriDate(date?: Date | string) {
  return useMemo(() => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return null;
    return gregorianToHijri(d);
  }, [date]);
}
