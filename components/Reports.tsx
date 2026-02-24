import React, { useState } from 'react';
import { FileText, Download, Loader2, FileBarChart, Package, DollarSign, Receipt } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
//import { generateReport } from '../src/utils/pdfGenerator';
import {
  generateSalesSummaryHtml,
  generateInventoryHtml,
  generateProfitLossHtml,
  generateSalesHistoryHtml,
  generateAdjustmentsHtml
} from '../src/utils/htmlPdfGenerator';

interface ReportsProps {
  data: any;
}

interface ReportType {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
}

export const Reports: React.FC<ReportsProps> = ({ data }) => {
  const { t } = useLanguage();
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reportTypes: ReportType[] = [
    {
      id: 'sales_summary',
      nameKey: 'report_sales_summary',
      descKey: 'report_sales_summary_desc',
      icon: <FileBarChart size={24} />,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'inventory',
      nameKey: 'report_inventory',
      descKey: 'report_inventory_desc',
      icon: <Package size={24} />,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'profit_loss',
      nameKey: 'report_profit_loss',
      descKey: 'report_profit_loss_desc',
      icon: <DollarSign size={24} />,
      color: 'from-amber-500 to-amber-600'
    },
    {
      id: 'sales_history',
      nameKey: 'report_sales_history',
      descKey: 'report_sales_history_desc',
      icon: <Receipt size={24} />,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const handleGenerateReport = async (reportType: string) => {
    setGenerating(reportType);
    setError(null);

    try {
      let htmlContent = '';
      let filename = '';
      const timestamp = new Date().getTime();

      switch (reportType) {
        case 'sales_summary':
          htmlContent = generateSalesSummaryHtml(data);
          filename = `TradeMaster_Sales_Summary_${timestamp}.pdf`;
          break;
        case 'inventory':
          htmlContent = generateInventoryHtml(data);
          filename = `TradeMaster_Inventory_${timestamp}.pdf`;
          break;
        case 'profit_loss':
          htmlContent = generateProfitLossHtml(data);
          filename = `TradeMaster_Profit_Loss_${timestamp}.pdf`;
          break;
        case 'sales_history':
          htmlContent = generateSalesHistoryHtml(data);
          filename = `TradeMaster_Sales_History_${timestamp}.pdf`;
          break;
        case 'adjustments': // New report type you can add a button for!
          htmlContent = generateAdjustmentsHtml(data);
          filename = `TradeMaster_Partner_Adjustments_${timestamp}.pdf`;
          break;
        default:
          throw new Error(`Report type '${reportType}' is not implemented yet.`);
      }

      const electron = (window as any).electron;

      if (electron && electron.exportPdf) {
        const result = await electron.exportPdf(htmlContent, filename);
        if (result.success) {
          console.log("PDF saved successfully to:", result.filePath);
        }
      } else {
        throw new Error("Electron API is not available.");
      }

    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{t('reports_title') || 'PDF Reports'}</h2>
          <p className="text-slate-500 mt-1">{t('reports_subtitle') || 'Generate professional reports for your business'}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
          <FileText size={28} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <p className="font-medium">{t('report_error') || 'Error generating report'}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`bg-gradient-to-r ${report.color} p-4 text-white`}>
              <div className="flex items-center gap-3">
                {report.icon}
                <div>
                  <h3 className="font-semibold text-lg">
                    {t(report.nameKey) || report.id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-4">
              <p className="text-slate-600 text-sm mb-4">
                {t(report.descKey) || `Generate a ${report.id.replace('_', ' ')} report`}
              </p>

              <button
                onClick={() => handleGenerateReport(report.id)}
                disabled={generating !== null}
                className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                  ${generating === report.id
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                  }
                  ${generating && generating !== report.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {generating === report.id ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('generating') || 'Generating...'}
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    {t('download_pdf') || 'Download PDF'}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h4 className="font-semibold text-blue-800 mb-2">{t('reports_info_title') || 'About PDF Reports'}</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• {t('reports_info_1') || 'Reports are generated from your current data'}</li>
          <li>• {t('reports_info_2') || 'PDF files can be shared or printed for records'}</li>
          <li>• {t('reports_info_3') || 'Reports include summaries, tables, and analysis'}</li>
          <li>• {t('reports_info_4') || 'Reports are generated entirely in your browser - no data is sent to any server'}</li>
        </ul>
      </div>
    </div>
  );
};