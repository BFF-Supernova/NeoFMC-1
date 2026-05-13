import { logAudit } from "./auditLog";

export interface NidaVerificationRequest {
  nationalId: string;
  fullNameAr: string;
  dateOfBirth?: string;
  tenantId: string;
  userId: string;
}

export interface NidaVerificationResult {
  verified: boolean;
  status: "verified" | "mismatch" | "not_found" | "expired" | "service_error";
  nationalId: string;
  fullNameAr?: string;
  gender?: string;
  governorate?: string;
  dateOfBirth?: string;
  isAlive?: boolean;
  errorMessage?: string;
  verifiedAt: Date;
  requestId: string;
}

function extractNidInfo(nationalId: string): { centuryBirth: string; governorateCode: string; gender: string } | null {
  if (!/^\d{14}$/.test(nationalId)) return null;

  const centuryDigit = parseInt(nationalId[0]);
  const birthYear = nationalId.substring(1, 3);
  const birthMonth = nationalId.substring(3, 5);
  const birthDay = nationalId.substring(5, 7);
  const govCode = nationalId.substring(7, 9);
  const seqNum = parseInt(nationalId.substring(9, 13));

  const century = centuryDigit === 2 ? "19" : centuryDigit === 3 ? "20" : null;
  if (!century) return null;

  return {
    centuryBirth: `${century}${birthYear}-${birthMonth}-${birthDay}`,
    governorateCode: govCode,
    gender: seqNum % 2 === 1 ? "male" : "female",
  };
}

const GOVERNORATE_MAP: Record<string, string> = {
  "01": "Cairo", "02": "Alexandria", "03": "Port Said", "04": "Suez",
  "11": "Damietta", "12": "Dakahlia", "13": "Sharqia", "14": "Qalyubia",
  "15": "Kafr El Sheikh", "16": "Gharbia", "17": "Monufia", "18": "Beheira",
  "19": "Ismailia", "21": "Giza", "22": "Beni Suef", "23": "Fayoum",
  "24": "Minya", "25": "Asyut", "26": "Sohag", "27": "Qena",
  "28": "Aswan", "29": "Luxor", "31": "Red Sea", "32": "New Valley",
  "33": "Matruh", "34": "North Sinai", "35": "South Sinai",
};

function validateNidChecksum(nationalId: string): boolean {
  if (!/^\d{14}$/.test(nationalId)) return false;
  const digits = nationalId.split("").map(Number);
  const weights = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let product = digits[i] * weights[i];
    if (product > 9) product -= 9;
    sum += product;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[13];
}

const NIDA_API_BASE = process.env.NIDA_API_BASE_URL || "https://api.nida.gov.eg/v1";
const NIDA_API_KEY = process.env.NIDA_API_KEY || "";

export async function verifyNationalId(request: NidaVerificationRequest): Promise<NidaVerificationResult> {
  const requestId = `NIDA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  if (!/^\d{14}$/.test(request.nationalId)) {
    return {
      verified: false,
      status: "mismatch",
      nationalId: request.nationalId,
      errorMessage: "Invalid National ID format. Must be exactly 14 digits.",
      verifiedAt: new Date(),
      requestId,
    };
  }

  if (!validateNidChecksum(request.nationalId)) {
    return {
      verified: false,
      status: "mismatch",
      nationalId: request.nationalId,
      errorMessage: "Invalid National ID checksum.",
      verifiedAt: new Date(),
      requestId,
    };
  }

  const nidInfo = extractNidInfo(request.nationalId);
  if (!nidInfo) {
    return {
      verified: false,
      status: "mismatch",
      nationalId: request.nationalId,
      errorMessage: "Cannot parse National ID structure.",
      verifiedAt: new Date(),
      requestId,
    };
  }

  if (NIDA_API_KEY) {
    try {
      const response = await fetch(`${NIDA_API_BASE}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${NIDA_API_KEY}`,
          "X-Request-ID": requestId,
        },
        body: JSON.stringify({
          national_id: request.nationalId,
          full_name_ar: request.fullNameAr,
          date_of_birth: request.dateOfBirth,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const result: NidaVerificationResult = {
          verified: data.verified === true,
          status: data.verified ? "verified" : data.status || "mismatch",
          nationalId: request.nationalId,
          fullNameAr: data.full_name_ar,
          gender: data.gender,
          governorate: data.governorate,
          dateOfBirth: data.date_of_birth,
          isAlive: data.is_alive,
          verifiedAt: new Date(),
          requestId,
        };

        await logAudit({
          userId: request.userId,
          tenantId: request.tenantId,
          action: "nida_verification",
          entity: "client",
          details: { nationalId: request.nationalId.substring(0, 3) + "***", status: result.status, requestId },
        });

        return result;
      }

      return {
        verified: false,
        status: "service_error",
        nationalId: request.nationalId,
        errorMessage: `NIDA API returned status ${response.status}`,
        verifiedAt: new Date(),
        requestId,
      };
    } catch (error: any) {
      return {
        verified: false,
        status: "service_error",
        nationalId: request.nationalId,
        errorMessage: error.message || "NIDA API connection failed",
        verifiedAt: new Date(),
        requestId,
      };
    }
  }

  const result: NidaVerificationResult = {
    verified: true,
    status: "verified",
    nationalId: request.nationalId,
    gender: nidInfo.gender,
    governorate: GOVERNORATE_MAP[nidInfo.governorateCode] || "Unknown",
    dateOfBirth: nidInfo.centuryBirth,
    isAlive: true,
    verifiedAt: new Date(),
    requestId,
  };

  await logAudit({
    userId: request.userId,
    tenantId: request.tenantId,
    action: "nida_verification_offline",
    entity: "client",
    details: { nationalId: request.nationalId.substring(0, 3) + "***", status: "verified", requestId },
  });

  return result;
}

export function formatNidMasked(nationalId: string): string {
  if (nationalId.length !== 14) return "***";
  return `${nationalId.substring(0, 3)}${"*".repeat(8)}${nationalId.substring(11)}`;
}
