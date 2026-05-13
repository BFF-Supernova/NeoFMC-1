import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Download } from "lucide-react";

export default function Legal() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("tos");

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t("الشروط والأحكام والسياسات", "Terms, Policies & Agreements")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tos">{t("شروط الخدمة", "Terms of Service")}</TabsTrigger>
          <TabsTrigger value="privacy">{t("سياسة الخصوصية", "Privacy Policy")}</TabsTrigger>
          <TabsTrigger value="dpa">{t("اتفاقية معالجة البيانات", "DPA")}</TabsTrigger>
        </TabsList>

        <TabsContent value="tos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("شروط الخدمة — نظام نيو إف إم سي", "Terms of Service — Neo FMC Platform")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("آخر تحديث: ١ أبريل ٢٠٢٦", "Last Updated: April 1, 2026")}</p>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              {language === "ar" ? (
                <div dir="rtl">
                  <h3>١. مقدمة</h3>
                  <p>تحكم شروط الخدمة هذه ("الشروط") استخدامكم لمنصة نيو إف إم سي ("المنصة")، وهي نظام إدارة موارد مؤسسات التمويل متناهي الصغر المقدم كخدمة سحابية (SaaS). باستخدامكم للمنصة، فإنكم توافقون على الالتزام بهذه الشروط.</p>
                  <h3>٢. تعريفات</h3>
                  <p><strong>"المستأجر"</strong>: المؤسسة المالية المرخصة التي تشترك في المنصة. <strong>"المستخدم"</strong>: أي شخص لديه حساب على المنصة تحت مستأجر. <strong>"البيانات"</strong>: جميع المعلومات المدخلة والمولدة عبر المنصة.</p>
                  <h3>٣. الترخيص والامتثال التنظيمي</h3>
                  <p>المنصة مصممة لدعم الامتثال للوائح هيئة الرقابة المالية (FRA) والبنك المركزي المصري (CBE). يظل المستأجر مسؤولاً عن الحصول على جميع التراخيص المطلوبة والامتثال للقوانين المعمول بها في جمهورية مصر العربية.</p>
                  <h3>٤. حماية البيانات</h3>
                  <p>نلتزم بقانون حماية البيانات الشخصية رقم ١٥١ لسنة ٢٠٢٠ (PDPL). يتم تخزين جميع البيانات داخل مراكز بيانات معتمدة مع تشفير AES-256 أثناء التخزين وTLS 1.3 أثناء النقل.</p>
                  <h3>٥. اتفاقية مستوى الخدمة (SLA)</h3>
                  <p>نضمن توافر المنصة بنسبة ٩٩.٩٪ شهرياً لعملاء الخطة المؤسسية. في حالة عدم تحقيق هذا المستوى، يحق للمستأجر الحصول على رصيد خدمة وفقاً للجدول التالي:</p>
                  <ul>
                    <li>توافر أقل من ٩٩.٩٪: رصيد ١٠٪ من الرسوم الشهرية</li>
                    <li>توافر أقل من ٩٩.٥٪: رصيد ٢٥٪ من الرسوم الشهرية</li>
                    <li>توافر أقل من ٩٩.٠٪: رصيد ٥٠٪ من الرسوم الشهرية</li>
                  </ul>
                  <h3>٦. ملكية البيانات</h3>
                  <p>يحتفظ المستأجر بملكية كاملة لجميع بياناته. يحق للمستأجر طلب تصدير بياناته في أي وقت بصيغ معيارية.</p>
                  <h3>٧. إنهاء الخدمة</h3>
                  <p>يمكن لأي من الطرفين إنهاء الاتفاقية بإشعار كتابي مدته ٣٠ يوماً. عند الإنهاء، يتم توفير البيانات للتصدير لمدة ٩٠ يوماً.</p>
                  <h3>٨. القانون الحاكم</h3>
                  <p>تخضع هذه الشروط لقوانين جمهورية مصر العربية وتُفسَّر وفقاً لها. أي نزاع ينشأ يخضع للاختصاص الحصري لمحاكم القاهرة.</p>
                </div>
              ) : (
                <div>
                  <h3>1. Introduction</h3>
                  <p>These Terms of Service ("Terms") govern your use of the Neo FMC Platform ("Platform"), a cloud-based microfinance ERP system provided as Software-as-a-Service (SaaS). By using the Platform, you agree to comply with these Terms.</p>
                  <h3>2. Definitions</h3>
                  <p><strong>"Tenant"</strong>: The licensed financial institution subscribing to the Platform. <strong>"User"</strong>: Any person with an account on the Platform under a Tenant. <strong>"Data"</strong>: All information entered and generated through the Platform.</p>
                  <h3>3. Licensing and Regulatory Compliance</h3>
                  <p>The Platform is designed to support compliance with Financial Regulatory Authority (FRA) and Central Bank of Egypt (CBE) regulations. The Tenant remains responsible for obtaining all required licenses and complying with applicable laws of the Arab Republic of Egypt.</p>
                  <h3>4. Data Protection</h3>
                  <p>We comply with the Personal Data Protection Law No. 151 of 2020 (PDPL). All data is stored in certified data centers with AES-256 encryption at rest and TLS 1.3 encryption in transit.</p>
                  <h3>5. Service Level Agreement (SLA)</h3>
                  <p>We guarantee 99.9% monthly Platform availability for Enterprise plan customers. If this level is not achieved, the Tenant is entitled to service credit per the following schedule:</p>
                  <ul>
                    <li>Availability below 99.9%: 10% credit of monthly fees</li>
                    <li>Availability below 99.5%: 25% credit of monthly fees</li>
                    <li>Availability below 99.0%: 50% credit of monthly fees</li>
                  </ul>
                  <h3>6. Data Ownership</h3>
                  <p>The Tenant retains full ownership of all their data. The Tenant may request data export at any time in standard formats.</p>
                  <h3>7. Termination</h3>
                  <p>Either party may terminate the agreement with 30 days written notice. Upon termination, data will be available for export for 90 days.</p>
                  <h3>8. Governing Law</h3>
                  <p>These Terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any disputes shall be subject to the exclusive jurisdiction of Cairo courts.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("سياسة الخصوصية — نظام نيو إف إم سي", "Privacy Policy — Neo FMC Platform")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("آخر تحديث: ١ أبريل ٢٠٢٦", "Last Updated: April 1, 2026")}</p>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              {language === "ar" ? (
                <div dir="rtl">
                  <h3>١. المقدمة</h3>
                  <p>تصف سياسة الخصوصية هذه كيفية جمع واستخدام وحماية البيانات الشخصية عبر منصة نيو إف إم سي، وذلك وفقاً لقانون حماية البيانات الشخصية رقم ١٥١ لسنة ٢٠٢٠.</p>
                  <h3>٢. البيانات التي نجمعها</h3>
                  <ul>
                    <li><strong>بيانات العملاء:</strong> الاسم، الرقم القومي، العنوان، رقم الهاتف، صور بطاقة الهوية</li>
                    <li><strong>البيانات المالية:</strong> طلبات القروض، المدفوعات، الأرصدة، التقارير الائتمانية</li>
                    <li><strong>بيانات المستخدمين:</strong> البريد الإلكتروني، الدور الوظيفي، سجل الدخول</li>
                    <li><strong>بيانات التشغيل:</strong> سجلات المراجعة، عناوين IP، بصمات الأجهزة</li>
                  </ul>
                  <h3>٣. أساس المعالجة القانوني</h3>
                  <p>نعالج البيانات الشخصية بناءً على: (أ) الالتزام التعاقدي، (ب) الامتثال للمتطلبات التنظيمية لهيئة الرقابة المالية والبنك المركزي المصري، (ج) المصلحة المشروعة في منع الاحتيال.</p>
                  <h3>٤. حقوق صاحب البيانات</h3>
                  <p>وفقاً للقانون، لديك الحق في: الوصول إلى بياناتك، تصحيحها، حذفها (حق النسيان)، نقلها، تقييد معالجتها.</p>
                  <h3>٥. الاحتفاظ بالبيانات</h3>
                  <ul>
                    <li>البيانات الشخصية: طوال فترة العلاقة التجارية + ٣٠ يوماً</li>
                    <li>وثائق اعرف عميلك: ٥ سنوات بعد إغلاق الحساب</li>
                    <li>السجلات المالية: ٧ سنوات (متطلبات البنك المركزي)</li>
                    <li>سجلات المراجعة: ١٠ سنوات (متطلبات هيئة الرقابة المالية)</li>
                  </ul>
                  <h3>٦. أمن البيانات</h3>
                  <p>نطبق تشفير AES-256 أثناء التخزين، وTLS 1.3 أثناء النقل، مع عزل البيانات على مستوى قاعدة البيانات (RLS) لكل مستأجر.</p>
                  <h3>٧. الاتصال بنا</h3>
                  <p>مسؤول حماية البيانات: compliance@neofmc.com</p>
                </div>
              ) : (
                <div>
                  <h3>1. Introduction</h3>
                  <p>This Privacy Policy describes how we collect, use, and protect personal data through the Neo FMC Platform, in accordance with the Personal Data Protection Law No. 151 of 2020 (PDPL).</p>
                  <h3>2. Data We Collect</h3>
                  <ul>
                    <li><strong>Client Data:</strong> Name, National ID, address, phone number, ID card images</li>
                    <li><strong>Financial Data:</strong> Loan applications, payments, balances, credit reports</li>
                    <li><strong>User Data:</strong> Email, role, login history</li>
                    <li><strong>Operational Data:</strong> Audit logs, IP addresses, device fingerprints</li>
                  </ul>
                  <h3>3. Legal Basis for Processing</h3>
                  <p>We process personal data based on: (a) Contractual obligation, (b) Compliance with FRA and CBE regulatory requirements, (c) Legitimate interest in fraud prevention.</p>
                  <h3>4. Data Subject Rights</h3>
                  <p>Under the law, you have the right to: Access your data, Rectify it, Erase it (right to be forgotten), Port it, Restrict its processing.</p>
                  <h3>5. Data Retention</h3>
                  <ul>
                    <li>Personal data: Duration of business relationship + 30 days</li>
                    <li>KYC documents: 5 years after account closure</li>
                    <li>Financial records: 7 years (CBE requirement)</li>
                    <li>Audit logs: 10 years (FRA requirement)</li>
                  </ul>
                  <h3>6. Data Security</h3>
                  <p>We apply AES-256 encryption at rest, TLS 1.3 in transit, with database-level Row-Level Security (RLS) isolation per tenant.</p>
                  <h3>7. Contact Us</h3>
                  <p>Data Protection Officer: compliance@neofmc.com</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dpa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("اتفاقية معالجة البيانات (DPA)", "Data Processing Agreement (DPA)")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("نموذج لعملاء B2B", "Template for B2B Clients")}</p>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              {language === "ar" ? (
                <div dir="rtl">
                  <h3>١. الأطراف</h3>
                  <p>تُبرم اتفاقية معالجة البيانات هذه بين المستأجر ("المتحكم في البيانات") ونيو إف إم سي ("معالج البيانات").</p>
                  <h3>٢. نطاق المعالجة</h3>
                  <p>يعالج معالج البيانات البيانات الشخصية نيابة عن المتحكم فقط لغرض تقديم خدمات إدارة التمويل متناهي الصغر.</p>
                  <h3>٣. التزامات معالج البيانات</h3>
                  <ul>
                    <li>معالجة البيانات فقط وفقاً لتعليمات المتحكم الموثقة</li>
                    <li>ضمان التزام الموظفين بالسرية</li>
                    <li>تطبيق التدابير الأمنية المناسبة (تشفير، عزل البيانات، التحكم في الوصول)</li>
                    <li>إخطار المتحكم بأي خرق للبيانات خلال ٧٢ ساعة</li>
                    <li>المساعدة في الاستجابة لطلبات أصحاب البيانات</li>
                  </ul>
                  <h3>٤. نقل البيانات</h3>
                  <p>لن يتم نقل البيانات خارج جمهورية مصر العربية دون موافقة كتابية مسبقة.</p>
                  <h3>٥. المدة والإنهاء</h3>
                  <p>تسري هذه الاتفاقية طوال مدة اتفاقية الخدمة. عند الإنهاء، يتم حذف أو إعادة جميع البيانات حسب اختيار المتحكم.</p>
                </div>
              ) : (
                <div>
                  <h3>1. Parties</h3>
                  <p>This Data Processing Agreement is entered between the Tenant ("Data Controller") and Neo FMC ("Data Processor").</p>
                  <h3>2. Scope of Processing</h3>
                  <p>The Data Processor processes personal data on behalf of the Controller solely for the purpose of providing microfinance management services.</p>
                  <h3>3. Data Processor Obligations</h3>
                  <ul>
                    <li>Process data only according to documented Controller instructions</li>
                    <li>Ensure personnel are bound by confidentiality</li>
                    <li>Implement appropriate security measures (encryption, data isolation, access controls)</li>
                    <li>Notify Controller of any data breach within 72 hours</li>
                    <li>Assist with data subject access request responses</li>
                  </ul>
                  <h3>4. Data Transfers</h3>
                  <p>Data will not be transferred outside the Arab Republic of Egypt without prior written consent.</p>
                  <h3>5. Duration and Termination</h3>
                  <p>This agreement runs for the duration of the service agreement. Upon termination, all data will be deleted or returned at the Controller's choice.</p>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t("تحميل النسخة العربية (PDF)", "Download Arabic Version (PDF)")}
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t("تحميل النسخة الإنجليزية (PDF)", "Download English Version (PDF)")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
