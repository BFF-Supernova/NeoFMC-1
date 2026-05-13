import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Brain, ShieldAlert, AlertTriangle, Target, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";

export default function AIRiskEngine() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("ews");
  const [ewsData, setEwsData] = useState<any>(null);
  const [segmentation, setSegmentation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchEWS = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-risk/early-warning", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setEwsData(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSegmentation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-risk/portfolio-risk-segmentation", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSegmentation(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "ews" && !ewsData) fetchEWS();
    if (tab === "segmentation" && !segmentation) fetchSegmentation();
  };

  useState(() => { fetchEWS(); });

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const riskColors: Record<string, string> = {
    very_low: "bg-green-500", low: "bg-green-400", medium: "bg-yellow-400", high: "bg-orange-500", very_high: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            {t("محرك المخاطر الذكي", "AI Risk Engine")}
          </h1>
          <p className="text-muted-foreground">{t("تسجيل ائتماني، كشف احتيال، إنذار مبكر، وتحليل المحفظة", "Credit scoring, fraud detection, early warning & portfolio analysis")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ews">{t("الإنذار المبكر", "Early Warning")}</TabsTrigger>
          <TabsTrigger value="segmentation">{t("تجزئة المخاطر", "Risk Segmentation")}</TabsTrigger>
          <TabsTrigger value="scoring">{t("التسجيل الائتماني", "Credit Scoring")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ews">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("تنبيهات الإنذار المبكر", "Early Warning Alerts")}</h2>
              <Button onClick={fetchEWS} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("تحديث", "Refresh")}
              </Button>
            </div>

            {ewsData?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("إجمالي التنبيهات", "Total Alerts")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{ewsData.summary.total}</div></CardContent></Card>
                <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">{t("حرج", "Critical")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{ewsData.summary.critical}</div></CardContent></Card>
                <Card className="border-yellow-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">{t("تحذير", "Warning")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{ewsData.summary.warning}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("معلومات", "Info")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{ewsData.summary.info}</div></CardContent></Card>
              </div>
            )}

            <div className="space-y-3">
              {ewsData?.alerts?.slice(0, 20).map((alert: any, i: number) => (
                <Card key={i} className={alert.severity === "critical" ? "border-red-300" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {alert.severity === "critical" ? <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" /> : <ShieldAlert className="h-5 w-5 text-yellow-500 mt-0.5" />}
                        <div>
                          <h3 className="font-medium">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                          <p className="text-xs text-primary mt-2">{t("الإجراء الموصى:", "Recommended:")} {alert.recommendedAction}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${severityColors[alert.severity] || ""}`}>{alert.severity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!ewsData?.alerts || ewsData.alerts.length === 0) && !loading && (
                <Card><CardContent className="p-8 text-center text-muted-foreground">{t("لا توجد تنبيهات حالياً", "No alerts at this time")}</CardContent></Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="segmentation">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("تجزئة مخاطر المحفظة", "Portfolio Risk Segmentation")}</h2>
              <Button onClick={fetchSegmentation} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("تحديث", "Refresh")}
              </Button>
            </div>

            {segmentation && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("إجمالي القروض", "Total Loans")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segmentation.totalLoans}</div></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("إجمالي المبلغ", "Total Amount")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(segmentation.totalAmount)}</div></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("المتوسط المرجح", "Weighted Avg Score")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segmentation.weightedAvgScore}</div></CardContent></Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>{t("خريطة حرارية للمخاطر", "Risk Heatmap")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(segmentation.buckets || {}).map(([bucket, data]: [string, any]) => (
                        <div key={bucket} className="flex items-center gap-3">
                          <div className="w-24 text-sm font-medium capitalize">{bucket.replace(/_/g, " ")}</div>
                          <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden relative">
                            <div className={`h-full ${riskColors[bucket] || "bg-gray-400"} rounded-full transition-all`} style={{ width: `${Math.max(data.percentage, 2)}%` }} />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">{data.count} {t("قروض", "loans")} ({data.percentage}%)</span>
                          </div>
                          <div className="w-32 text-sm text-right">{formatCurrency(data.totalAmount)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("نموذج التسجيل الائتماني", "Credit Scoring Model")}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>{t(
                "يستخدم النظام نموذج تسجيل ائتماني متعدد العوامل مع طبقة تفسيرية كاملة. يتم تقييم كل طلب قرض بناءً على عوامل مرجحة مع توضيح مساهمة كل عامل في القرار النهائي.",
                "The system uses a multi-factor credit scoring model with a full explainability layer. Each loan application is evaluated based on weighted factors with clear contribution of each factor to the final decision."
              )}</p>
              <h4>{t("عوامل التسجيل", "Scoring Factors")}</h4>
              <table className="w-full text-sm">
                <thead><tr><th className="text-left">{t("العامل", "Factor")}</th><th className="text-right">{t("الوزن", "Weight")}</th><th className="text-left">{t("الاتجاه", "Direction")}</th></tr></thead>
                <tbody>
                  <tr><td>{t("تاريخ السداد", "Repayment History")}</td><td className="text-right">20%</td><td><ArrowUp className="h-4 w-4 text-green-500 inline" /> {t("إيجابي", "Positive")}</td></tr>
                  <tr><td>{t("درجة I-Score", "I-Score Value")}</td><td className="text-right">15%</td><td><ArrowUp className="h-4 w-4 text-green-500 inline" /> {t("إيجابي", "Positive")}</td></tr>
                  <tr><td>{t("نسبة القرض للدخل", "Loan-to-Income Ratio")}</td><td className="text-right">12%</td><td><ArrowDown className="h-4 w-4 text-red-500 inline" /> {t("سلبي", "Negative")}</td></tr>
                  <tr><td>{t("التخلف السابق", "Previous Defaults")}</td><td className="text-right">12%</td><td><ArrowDown className="h-4 w-4 text-red-500 inline" /> {t("سلبي", "Negative")}</td></tr>
                  <tr><td>{t("أيام التأخر", "Days Overdue History")}</td><td className="text-right">10%</td><td><ArrowDown className="h-4 w-4 text-red-500 inline" /> {t("سلبي", "Negative")}</td></tr>
                  <tr><td>{t("سنوات العمل", "Employment Years")}</td><td className="text-right">8%</td><td><ArrowUp className="h-4 w-4 text-green-500 inline" /> {t("إيجابي", "Positive")}</td></tr>
                  <tr><td>{t("العمر", "Age")}</td><td className="text-right">5%</td><td><ArrowUp className="h-4 w-4 text-green-500 inline" /> {t("إيجابي", "Positive")}</td></tr>
                  <tr><td>{t("الضمانات", "Collateral")}</td><td className="text-right">5%</td><td><ArrowUp className="h-4 w-4 text-green-500 inline" /> {t("إيجابي", "Positive")}</td></tr>
                  <tr><td>{t("معدل سداد المجموعة", "Group Repayment Rate")}</td><td className="text-right">5%</td><td><ArrowUp className="h-4 w-4 text-green-500 inline" /> {t("إيجابي", "Positive")}</td></tr>
                </tbody>
              </table>
              <p className="text-sm text-muted-foreground mt-4">{t("إصدار النموذج: neo-fmc-cs-v1.0", "Model Version: neo-fmc-cs-v1.0")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
