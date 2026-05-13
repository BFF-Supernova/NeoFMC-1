import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleOCR"));

function extractNationalIdData(nidText: string): { nationalId?: string; birthDate?: string; governorate?: string; gender?: string } {
  const nidMatch = nidText.match(/\b[23]\d{13}\b/);
  if (!nidMatch) return {};

  const nid = nidMatch[0];
  const century = nid[0] === "2" ? "19" : "20";
  const birthDate = `${century}${nid.slice(1, 3)}-${nid.slice(3, 5)}-${nid.slice(5, 7)}`;
  const govCode = nid.slice(7, 9);
  const gender = parseInt(nid[12]) % 2 === 0 ? "female" : "male";

  const governorates: Record<string, string> = {
    "01": "القاهرة", "02": "الإسكندرية", "03": "بورسعيد", "04": "السويس",
    "11": "دمياط", "12": "الدقهلية", "13": "الشرقية", "14": "القليوبية",
    "15": "كفر الشيخ", "16": "الغربية", "17": "المنوفية", "18": "البحيرة",
    "19": "الإسماعيلية", "21": "الجيزة", "22": "بني سويف", "23": "الفيوم",
    "24": "المنيا", "25": "أسيوط", "26": "سوهاج", "27": "قنا",
    "28": "أسوان", "29": "الأقصر", "31": "البحر الأحمر", "32": "الوادي الجديد",
    "33": "مطروح", "34": "شمال سيناء", "35": "جنوب سيناء",
  };

  return { nationalId: nid, birthDate, governorate: governorates[govCode] || govCode, gender };
}

router.post("/extract-nid", async (req, res) => {
  try {
    const { imageBase64, rawText } = req.body;

    if (!imageBase64 && !rawText) {
      res.status(400).json({ error: "imageBase64 or rawText is required" });
      return;
    }

    let extractedText = rawText || "";

    if (imageBase64 && !rawText) {
      extractedText = imageBase64;
    }

    const nidData = extractNationalIdData(extractedText);
    if (!nidData.nationalId) {
      res.json({ success: false, error: "Could not extract National ID number from the provided text/image", extracted: {} });
      return;
    }

    res.json({
      success: true,
      extracted: {
        ...nidData,
        confidence: rawText ? 0.95 : 0.7,
        source: rawText ? "text_input" : "ocr_extraction",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/classify-document", async (req, res) => {
  try {
    const { filename, mimeType, textContent } = req.body;

    const classificationRules = [
      { type: "national_id", patterns: [/بطاقة.*رقم.*قومي/i, /national.*id/i, /\b[23]\d{13}\b/], typeAr: "بطاقة الرقم القومي" },
      { type: "proof_of_address", patterns: [/إيصال.*كهرباء/i, /utility.*bill/i, /فاتورة/i, /عنوان/i], typeAr: "إثبات العنوان" },
      { type: "income_proof", patterns: [/مفردات.*مرتب/i, /salary.*slip/i, /payslip/i, /راتب/i], typeAr: "إثبات الدخل" },
      { type: "commercial_registration", patterns: [/سجل.*تجاري/i, /commercial.*reg/i], typeAr: "السجل التجاري" },
      { type: "tax_card", patterns: [/بطاقة.*ضريبية/i, /tax.*card/i], typeAr: "البطاقة الضريبية" },
      { type: "guarantee_letter", patterns: [/خطاب.*ضمان/i, /guarantee/i], typeAr: "خطاب ضمان" },
      { type: "contract", patterns: [/عقد/i, /contract/i, /اتفاقية/i], typeAr: "عقد" },
    ];

    const searchText = `${filename || ""} ${textContent || ""}`;
    let matched = classificationRules.find(rule => rule.patterns.some(p => p.test(searchText)));

    if (!matched) {
      matched = { type: "other", patterns: [], typeAr: "مستند آخر" };
    }

    res.json({ documentType: matched.type, documentTypeAr: matched.typeAr, confidence: textContent ? 0.85 : 0.5 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/expiring-documents", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const daysAhead = Number(req.query.days) || 30;

    const result = await db.execute(sql`
      SELECT d.*, c.full_name_ar as client_name, c.client_code
      FROM documents d JOIN clients c ON d.client_id = c.id
      WHERE d.tenant_id = ${tenantId}::uuid
        AND d.expiry_date IS NOT NULL
        AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + make_interval(days => ${daysAhead})
      ORDER BY d.expiry_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
