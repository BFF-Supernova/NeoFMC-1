import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, TrendingUp, Shield, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export default function IFRS9Dashboard() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [provisions, setProvisions] = useState<any>(null);
  const [cbeMatrix, setCbeMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [provRes, matrixRes] = await Promise.all([
        fetch("/api/ifrs9/portfolio-provisions", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/ifrs9/cbe-matrix", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (provRes.ok) setProvisions(await provRes.json());
      if (matrixRes.ok) setCbeMatrix(await matrixRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("محرك IFRS 9 والمخصصات", "IFRS 9 & Provisioning Engine")}</h1>
          <p className="text-muted-foreground">{t("حساب الخسائر الائتمانية المتوقعة ومصفوفة مخصصات البنك المركزي", "Expected Credit Loss calculation & CBE provisioning matrix")}</p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("إعادة الحساب", "Recalculate")}
        </Button>
      </div>

      {provisions && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("إجمالي المحفظة", "Total Portfolio")}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(provisions.totalPortfolio)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("إجمالي ECL", "Total ECL")}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-destructive">{formatCurrency(provisions.totalECL)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("نسبة التغطية", "Coverage Ratio")}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{(provisions.provisionCoverageRatio * 100).toFixed(2)}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("عدد المراحل", "Stage Breakdown")}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{provisions.byStage?.length || 0} {t("مراحل", "Stages")}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("توزيع المراحل", "Stage Distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t("المرحلة", "Stage")}</th>
                      <th className="text-right p-2">{t("عدد القروض", "Loan Count")}</th>
                      <th className="text-right p-2">{t("إجمالي التعرض", "Total Exposure")}</th>
                      <th className="text-right p-2">{t("متوسط PD", "Avg PD")}</th>
                      <th className="text-right p-2">{t("متوسط LGD", "Avg LGD")}</th>
                      <th className="text-right p-2">{t("إجمالي ECL", "Total ECL")}</th>
                      <th className="text-right p-2">{t("نسبة المخصص", "Provision Rate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provisions.byStage?.map((stage: any) => (
                      <tr key={stage.stage} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            stage.stage === 1 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                            stage.stage === 2 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}>
                            {stage.stage === 3 && <AlertTriangle className="h-3 w-3" />}
                            Stage {stage.stage}: {stage.stageLabel}
                          </span>
                        </td>
                        <td className="text-right p-2">{stage.loanCount}</td>
                        <td className="text-right p-2">{formatCurrency(stage.totalExposure)}</td>
                        <td className="text-right p-2">{(stage.avgPD * 100).toFixed(2)}%</td>
                        <td className="text-right p-2">{(stage.avgLGD * 100).toFixed(2)}%</td>
                        <td className="text-right p-2 font-medium text-destructive">{formatCurrency(stage.totalECL)}</td>
                        <td className="text-right p-2">{(stage.provisionRate * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {cbeMatrix && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("مصفوفة مخصصات البنك المركزي المصري", "CBE Provisioning Matrix")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">{t("التصنيف", "Classification")}</th>
                    <th className="text-right p-2">{t("الحد الأدنى", "Min Rate")}</th>
                    <th className="text-right p-2">{t("الحد الأقصى", "Max Rate")}</th>
                    <th className="text-right p-2">{t("مرحلة IFRS 9", "IFRS 9 Stage")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cbeMatrix).map(([key, val]: [string, any]) => (
                    <tr key={key} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium capitalize">{key}</td>
                      <td className="text-right p-2">{(val.minRate * 100).toFixed(0)}%</td>
                      <td className="text-right p-2">{(val.maxRate * 100).toFixed(0)}%</td>
                      <td className="text-right p-2">Stage {val.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
