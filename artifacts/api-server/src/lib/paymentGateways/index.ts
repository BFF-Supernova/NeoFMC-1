import crypto from "crypto";

export interface PaymentRequest {
  amount: number;
  currency: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  orderId: string;
  description?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  status: "pending" | "completed" | "failed";
  rawResponse?: unknown;
  errorMessage?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status: "pending" | "completed" | "failed";
  rawResponse?: unknown;
  errorMessage?: string;
}

export interface GatewayConfig {
  merchantId?: string;
  apiKey?: string;
  secretKey?: string;
  environment: "sandbox" | "production";
  callbackUrl?: string;
  webhookSecret?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentGateway {
  name: string;
  initialize(config: GatewayConfig): void;
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkPaymentStatus(transactionId: string): Promise<PaymentResponse>;
  refund(request: RefundRequest): Promise<RefundResponse>;
  verifyWebhook(payload: unknown, signature: string): boolean;
}

export class FawryGateway implements PaymentGateway {
  name = "Fawry";
  private config: GatewayConfig | null = null;

  private get baseUrl(): string {
    return this.config?.environment === "production"
      ? "https://www.atfawry.com/ECommerceWeb/Fawry"
      : "https://atfawry.fawrystaging.com/ECommerceWeb/Fawry";
  }

  initialize(config: GatewayConfig): void {
    this.config = config;
  }

  private generateSignature(params: string[]): string {
    const raw = params.join("") + (this.config?.secretKey || "");
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config) throw new Error("Fawry gateway not initialized");

    const merchantCode = this.config.merchantId || process.env.FAWRY_MERCHANT_CODE;
    const secretKey = this.config.secretKey || process.env.FAWRY_SECURITY_KEY;

    if (!merchantCode || !secretKey) {
      return {
        success: true,
        transactionId: `FAWRY-STUB-${Date.now()}`,
        status: "pending",
        redirectUrl: `${this.baseUrl}/checkout/${request.orderId}`,
        rawResponse: { mode: "stub", message: "FAWRY_MERCHANT_CODE and FAWRY_SECURITY_KEY not set. Using stub mode." },
      };
    }

    const chargeItem = {
      itemId: request.orderId,
      description: request.description || "Loan Payment",
      price: request.amount,
      quantity: 1,
    };

    const signature = this.generateSignature([
      merchantCode,
      request.orderId,
      request.customerPhone || "",
      request.amount.toFixed(2),
      secretKey,
    ]);

    try {
      const body = {
        merchantCode,
        merchantRefNum: request.orderId,
        customerMobile: request.customerPhone,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        paymentExpiry: Date.now() + 86400000,
        chargeItems: [chargeItem],
        returnUrl: request.callbackUrl || this.config.callbackUrl,
        authCaptureModePayment: false,
        language: "ar-eg",
        signature,
      };

      const res = await fetch(`${this.baseUrl}/payments/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json() as any;

      if (data.statusCode === 200 || data.type === "ChargeResponse") {
        return {
          success: true,
          transactionId: data.referenceNumber || data.fawryRefNumber || `FAWRY-${Date.now()}`,
          status: "pending",
          redirectUrl: data.redirectUrl || `${this.baseUrl}/checkout/${request.orderId}`,
          rawResponse: data,
        };
      }

      return {
        success: false,
        status: "failed",
        errorMessage: data.statusDescription || data.message || "Payment creation failed",
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        success: false,
        status: "failed",
        errorMessage: `Fawry API error: ${err.message}`,
        rawResponse: { error: err.message },
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    if (!this.config) throw new Error("Fawry gateway not initialized");

    const merchantCode = this.config.merchantId || process.env.FAWRY_MERCHANT_CODE;
    const secretKey = this.config.secretKey || process.env.FAWRY_SECURITY_KEY;

    if (!merchantCode || !secretKey) {
      return { success: true, transactionId, status: "pending", rawResponse: { mode: "stub" } };
    }

    const signature = this.generateSignature([merchantCode, transactionId, secretKey]);

    try {
      const res = await fetch(
        `${this.baseUrl}/payments/status/v2?merchantCode=${merchantCode}&merchantRefNumber=${transactionId}&signature=${signature}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const data = await res.json() as any;

      const statusMap: Record<string, "pending" | "completed" | "failed"> = {
        PAID: "completed", NEW: "pending", UNPAID: "pending",
        REFUNDED: "completed", EXPIRED: "failed", FAILED: "failed",
      };

      return {
        success: true,
        transactionId,
        status: statusMap[data.orderStatus] || "pending",
        rawResponse: data,
      };
    } catch (err: any) {
      return { success: false, transactionId, status: "failed", errorMessage: err.message };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    if (!this.config) throw new Error("Fawry gateway not initialized");

    const merchantCode = this.config.merchantId || process.env.FAWRY_MERCHANT_CODE;
    const secretKey = this.config.secretKey || process.env.FAWRY_SECURITY_KEY;

    if (!merchantCode || !secretKey) {
      return { success: true, refundId: `FAWRY-REF-STUB-${Date.now()}`, status: "pending", rawResponse: { mode: "stub" } };
    }

    const signature = this.generateSignature([merchantCode, request.transactionId, request.amount.toFixed(2), request.reason || "", secretKey]);

    try {
      const res = await fetch(`${this.baseUrl}/payments/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantCode,
          referenceNumber: request.transactionId,
          refundAmount: request.amount,
          reason: request.reason,
          signature,
        }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json() as any;
      return {
        success: data.statusCode === 200,
        refundId: data.refundId || `FAWRY-REF-${Date.now()}`,
        status: data.statusCode === 200 ? "completed" : "failed",
        rawResponse: data,
        errorMessage: data.statusCode !== 200 ? data.statusDescription : undefined,
      };
    } catch (err: any) {
      return { success: false, status: "failed", errorMessage: err.message };
    }
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    const secretKey = this.config?.secretKey || process.env.FAWRY_SECURITY_KEY;
    if (!secretKey || !payload || typeof payload !== "object") return false;

    const p = payload as any;
    const rawSignature = [p.fawryRefNumber, p.merchantRefNumber, (p.paymentAmount || 0).toFixed(2), p.orderStatus, secretKey].join("");
    const computed = crypto.createHash("sha256").update(rawSignature).digest("hex");
    return computed === signature;
  }
}

export class PaymobGateway implements PaymentGateway {
  name = "Paymob";
  private config: GatewayConfig | null = null;

  private get baseUrl(): string {
    return "https://accept.paymob.com/api";
  }

  initialize(config: GatewayConfig): void {
    this.config = config;
  }

  private async authenticate(): Promise<string | null> {
    const apiKey = this.config?.apiKey || process.env.PAYMOB_API_KEY;
    if (!apiKey) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json() as any;
      return data.token || null;
    } catch {
      return null;
    }
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.config) throw new Error("Paymob gateway not initialized");

    const authToken = await this.authenticate();
    if (!authToken) {
      return {
        success: true,
        transactionId: `PAYMOB-STUB-${Date.now()}`,
        status: "pending",
        redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${request.orderId}`,
        rawResponse: { mode: "stub", message: "PAYMOB_API_KEY not set. Using stub mode." },
      };
    }

    try {
      const integrationId = this.config.metadata?.integrationId || process.env.PAYMOB_INTEGRATION_ID;
      const iframeId = this.config.metadata?.iframeId || process.env.PAYMOB_IFRAME_ID;

      const orderRes = await fetch(`${this.baseUrl}/ecommerce/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: false,
          amount_cents: Math.round(request.amount * 100),
          currency: request.currency || "EGP",
          merchant_order_id: request.orderId,
          items: [{ name: request.description || "Loan Payment", amount_cents: Math.round(request.amount * 100), quantity: 1 }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      const orderData = await orderRes.json() as any;
      if (!orderData.id) {
        return { success: false, status: "failed", errorMessage: "Failed to create Paymob order", rawResponse: orderData };
      }

      const keyRes = await fetch(`${this.baseUrl}/acceptance/payment_keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: Math.round(request.amount * 100),
          expiration: 3600,
          order_id: orderData.id,
          billing_data: {
            first_name: request.customerName?.split(" ")[0] || "NA",
            last_name: request.customerName?.split(" ").slice(1).join(" ") || "NA",
            email: request.customerEmail || "NA",
            phone_number: request.customerPhone || "NA",
            apartment: "NA", floor: "NA", street: "NA", building: "NA",
            shipping_method: "NA", postal_code: "NA", city: "NA", country: "EG", state: "NA",
          },
          currency: request.currency || "EGP",
          integration_id: integrationId,
          lock_order_when_paid: true,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const keyData = await keyRes.json() as any;
      if (!keyData.token) {
        return { success: false, status: "failed", errorMessage: "Failed to generate payment key", rawResponse: keyData };
      }

      return {
        success: true,
        transactionId: String(orderData.id),
        status: "pending",
        redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${keyData.token}`,
        rawResponse: { orderId: orderData.id, paymentKey: keyData.token },
      };
    } catch (err: any) {
      return { success: false, status: "failed", errorMessage: `Paymob API error: ${err.message}` };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    const authToken = await this.authenticate();
    if (!authToken) {
      return { success: true, transactionId, status: "pending", rawResponse: { mode: "stub" } };
    }

    try {
      const res = await fetch(`${this.baseUrl}/ecommerce/orders/${transactionId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json() as any;
      return {
        success: true,
        transactionId,
        status: data.paid_amount_cents > 0 ? "completed" : "pending",
        rawResponse: data,
      };
    } catch (err: any) {
      return { success: false, transactionId, status: "failed", errorMessage: err.message };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const authToken = await this.authenticate();
    if (!authToken) {
      return { success: true, refundId: `PAYMOB-REF-STUB-${Date.now()}`, status: "pending", rawResponse: { mode: "stub" } };
    }

    try {
      const res = await fetch(`${this.baseUrl}/acceptance/void_refund/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: authToken,
          transaction_id: request.transactionId,
          amount_cents: Math.round(request.amount * 100),
        }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json() as any;
      return {
        success: data.success ?? false,
        refundId: data.id ? String(data.id) : `PAYMOB-REF-${Date.now()}`,
        status: data.success ? "completed" : "failed",
        rawResponse: data,
        errorMessage: !data.success ? (data.message || "Refund failed") : undefined,
      };
    } catch (err: any) {
      return { success: false, status: "failed", errorMessage: err.message };
    }
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    const hmacSecret = this.config?.webhookSecret || process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret || !payload || typeof payload !== "object") return false;

    const p = payload as any;
    const concatenated = [
      p.amount_cents, p.created_at, p.currency, p.error_occured, p.has_parent_transaction,
      p.id, p.integration_id, p.is_3d_secure, p.is_auth, p.is_capture, p.is_refunded,
      p.is_standalone_payment, p.is_voided, p.order?.id, p.owner, p.pending,
      p.source_data?.pan, p.source_data?.sub_type, p.source_data?.type, p.success,
    ].join("");

    const computed = crypto.createHmac("sha512", hmacSecret).update(concatenated).digest("hex");
    return computed === signature;
  }
}

const gateways: Map<string, PaymentGateway> = new Map();

export function registerGateway(name: string, gateway: PaymentGateway): void {
  gateways.set(name.toLowerCase(), gateway);
}

export function getGateway(name: string): PaymentGateway | undefined {
  return gateways.get(name.toLowerCase());
}

export function getAvailableGateways(): string[] {
  return Array.from(gateways.keys());
}

const fawry = new FawryGateway();
fawry.initialize({
  merchantId: process.env.FAWRY_MERCHANT_CODE,
  secretKey: process.env.FAWRY_SECURITY_KEY,
  environment: (process.env.PAYMENT_ENV as "sandbox" | "production") || "sandbox",
  callbackUrl: process.env.FAWRY_CALLBACK_URL,
});
registerGateway("fawry", fawry);

const paymob = new PaymobGateway();
paymob.initialize({
  apiKey: process.env.PAYMOB_API_KEY,
  environment: (process.env.PAYMENT_ENV as "sandbox" | "production") || "sandbox",
  webhookSecret: process.env.PAYMOB_HMAC_SECRET,
  metadata: {
    integrationId: process.env.PAYMOB_INTEGRATION_ID,
    iframeId: process.env.PAYMOB_IFRAME_ID,
  },
});
registerGateway("paymob", paymob);
