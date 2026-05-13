import { logAudit } from "./auditLog";

export interface EKycRequest {
  clientId: string;
  nationalId: string;
  fullNameAr: string;
  fullNameEn?: string;
  dateOfBirth?: string;
  idFrontImage?: string;
  idBackImage?: string;
  selfieImage?: string;
  tenantId: string;
  userId: string;
}

export interface EKycResult {
  verificationId: string;
  status: "verified" | "failed" | "pending_review" | "rejected" | "error";
  identityMatch: boolean;
  livenessCheck: boolean;
  documentAuthenticity: boolean;
  faceMatchScore: number;
  ocrExtracted: {
    nationalId?: string;
    fullNameAr?: string;
    dateOfBirth?: string;
    address?: string;
    gender?: string;
    expiryDate?: string;
  };
  riskIndicators: string[];
  verifiedAt: Date;
  expiresAt: Date;
  errorMessage?: string;
}

const EKYC_PROVIDER_URL = process.env.EKYC_PROVIDER_URL || "";
const EKYC_API_KEY = process.env.EKYC_API_KEY || "";

export async function performEKyc(request: EKycRequest): Promise<EKycResult> {
  const verificationId = `EKYC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  if (EKYC_API_KEY && EKYC_PROVIDER_URL) {
    try {
      const payload: Record<string, any> = {
        national_id: request.nationalId,
        full_name_ar: request.fullNameAr,
        full_name_en: request.fullNameEn,
        date_of_birth: request.dateOfBirth,
      };

      if (request.idFrontImage) payload.id_front = request.idFrontImage;
      if (request.idBackImage) payload.id_back = request.idBackImage;
      if (request.selfieImage) payload.selfie = request.selfieImage;

      const response = await fetch(`${EKYC_PROVIDER_URL}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${EKYC_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const data = await response.json() as any;

        const result: EKycResult = {
          verificationId,
          status: data.status || "pending_review",
          identityMatch: data.identity_match === true,
          livenessCheck: data.liveness_check === true,
          documentAuthenticity: data.document_authentic === true,
          faceMatchScore: data.face_match_score || 0,
          ocrExtracted: {
            nationalId: data.ocr?.national_id,
            fullNameAr: data.ocr?.full_name_ar,
            dateOfBirth: data.ocr?.date_of_birth,
            address: data.ocr?.address,
            gender: data.ocr?.gender,
            expiryDate: data.ocr?.expiry_date,
          },
          riskIndicators: data.risk_indicators || [],
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };

        await logAudit({
          userId: request.userId,
          tenantId: request.tenantId,
          action: "ekyc_verification",
          entity: "client",
          entityId: request.clientId,
          details: { verificationId, status: result.status, faceMatchScore: result.faceMatchScore },
        });

        return result;
      }

      return {
        verificationId,
        status: "error",
        identityMatch: false,
        livenessCheck: false,
        documentAuthenticity: false,
        faceMatchScore: 0,
        ocrExtracted: {},
        riskIndicators: [],
        verifiedAt: new Date(),
        expiresAt: new Date(),
        errorMessage: `E-KYC provider returned status ${response.status}`,
      };
    } catch (error: any) {
      return {
        verificationId,
        status: "error",
        identityMatch: false,
        livenessCheck: false,
        documentAuthenticity: false,
        faceMatchScore: 0,
        ocrExtracted: {},
        riskIndicators: [],
        verifiedAt: new Date(),
        expiresAt: new Date(),
        errorMessage: error.message,
      };
    }
  }

  const nidValid = /^\d{14}$/.test(request.nationalId);
  const result: EKycResult = {
    verificationId,
    status: nidValid ? "pending_review" : "failed",
    identityMatch: nidValid,
    livenessCheck: false,
    documentAuthenticity: false,
    faceMatchScore: 0,
    ocrExtracted: {
      nationalId: request.nationalId,
      fullNameAr: request.fullNameAr,
    },
    riskIndicators: [
      "ekyc_provider_not_configured",
      ...(!request.idFrontImage ? ["missing_id_front_image"] : []),
      ...(!request.selfieImage ? ["missing_selfie"] : []),
    ],
    verifiedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };

  await logAudit({
    userId: request.userId,
    tenantId: request.tenantId,
    action: "ekyc_verification_offline",
    entity: "client",
    entityId: request.clientId,
    details: { verificationId, status: result.status },
  });

  return result;
}

export function getKycStatusLabel(status: string, lang: "en" | "ar" = "en"): string {
  const labels: Record<string, { en: string; ar: string }> = {
    "Pending": { en: "Pending Verification", ar: "في انتظار التحقق" },
    "verified": { en: "Verified", ar: "تم التحقق" },
    "failed": { en: "Verification Failed", ar: "فشل التحقق" },
    "pending_review": { en: "Under Review", ar: "قيد المراجعة" },
    "rejected": { en: "Rejected", ar: "مرفوض" },
    "expired": { en: "Expired", ar: "منتهي الصلاحية" },
  };
  return labels[status]?.[lang] || status;
}
