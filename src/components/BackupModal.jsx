import React, { useState } from 'react';
import { Download, Upload, FileText, Table, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { exportUserDataToJson, importUserDataFromJson, exportUserDataToCsv } from '../utils/dataMigration';

const BackupModal = ({ isOpen, onClose, onImportSuccess, leavesQuota, currentUser }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setStatusMsg(null);
    const result = await exportUserDataToJson(leavesQuota, currentUser?.id);
    setIsExporting(false);
    if (result.success) {
      setStatusMsg({ type: 'success', text: `Successfully exported ${result.count} records (leaves + WFH/Office logs) to JSON backup!` });
    } else {
      setStatusMsg({ type: 'error', text: `Export failed: ${result.error}` });
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setStatusMsg(null);
    const result = await exportUserDataToCsv(currentUser?.id);
    setIsExportingCsv(false);
    if (result.success) {
      setStatusMsg({ type: 'success', text: `Successfully exported ${result.count} records to CSV spreadsheet!` });
    } else {
      setStatusMsg({ type: 'error', text: `CSV Export failed: ${result.error}` });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMsg(null);
    const result = await importUserDataFromJson(file, currentUser?.id);
    setIsImporting(false);

    if (result.success) {
      setStatusMsg({ type: 'success', text: `Successfully imported ${result.leavesCount} records and ${result.plansCount} plans into your account!` });
      if (onImportSuccess) {
        await onImportSuccess(result.quotaSettings);
      }
    } else {
      setStatusMsg({ type: 'error', text: `Import failed: ${result.error}` });
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-6 z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Backup & Export</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Export, import, or generate CSV spreadsheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Status Alert Message */}
        {statusMsg && (
          <div className={`p-3.5 rounded-2xl border text-xs flex gap-2.5 items-start ${
            statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Export Card */}
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-foreground block">Export Data</span>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Export all your PL/EL/RH leaves, WFH logs, and trip plans.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Download size={14} /> {isExporting ? 'Exporting...' : 'JSON Backup'}
            </button>
            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Table size={14} /> {isExportingCsv ? 'Generating...' : 'Spreadsheet (CSV)'}
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-foreground block">Restore / Import File</span>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Upload a previously exported `.json` file to restore your leaves, WFH logs, and plans into this account.
            </p>
          </div>
          <label className="w-full py-3 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
            <Upload size={15} /> {isImporting ? 'Importing...' : 'Select Backup JSON File'}
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" disabled={isImporting} />
          </label>
        </div>

        <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground font-mono">
          <ShieldCheck size={13} className="text-emerald-500" /> All WFH & Leave data preserved strictly in JSON format
        </div>

      </div>
    </div>
  );
};

export default BackupModal;
