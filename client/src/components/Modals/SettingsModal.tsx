import React, { useRef, useState } from 'react';
import { X, Download, Upload, Server, HardDrive, CheckCircle2 } from 'lucide-react';
import { importBackup } from '../../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalNotes: number;
    totalFolders: number;
  };
  onRefreshData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onRefreshData
}) => {
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    window.open('/api/export/backup', '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await importBackup(json);
      setImportSuccess(`Imported ${res.importedNotes} notes and ${res.importedFolders} folders!`);
      await onRefreshData();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder rounded-xl shadow-2xl p-5 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-apple-darkBorder/60">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-apple-yellow" />
            <h3 className="font-semibold text-sm text-white dark:text-white light:text-black">
              Self-Hosted Settings & Storage
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-apple-darkMuted hover:text-white dark:hover:text-white light:hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* System Info Box */}
          <div className="p-3 rounded-lg bg-black/30 dark:bg-black/30 light:bg-black/5 border border-apple-darkBorder/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-apple-darkMuted">Engine</span>
              <span className="font-medium text-white dark:text-white light:text-black">
                SQLite WAL + Node.js (Docker Ready)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-apple-darkMuted">Active Notes</span>
              <span className="font-semibold text-apple-yellow">{stats.totalNotes} notes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-apple-darkMuted">Folders</span>
              <span className="font-semibold text-white dark:text-white light:text-black">{stats.totalFolders} folders</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-apple-darkMuted">License</span>
              <span className="font-medium text-emerald-400">MIT Open Source</span>
            </div>
          </div>

          {/* Backup & Export Section */}
          <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-white dark:text-white light:text-black flex items-center gap-1.5">
              <HardDrive size={14} className="text-apple-yellow" />
              Database Backup & Portability
            </h4>
            <p className="text-apple-darkMuted leading-relaxed">
              Export your entire database to a JSON file or restore from a previous backup at any time.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-apple-darkHover dark:bg-apple-darkHover light:bg-apple-lightHover hover:bg-black/40 text-white dark:text-white light:text-black font-medium transition-colors"
              >
                <Download size={14} className="text-apple-yellow" />
                <span>Export Backup</span>
              </button>

              <button
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-apple-darkHover dark:bg-apple-darkHover light:bg-apple-lightHover hover:bg-black/40 text-white dark:text-white light:text-black font-medium transition-colors disabled:opacity-50"
              >
                <Upload size={14} className="text-apple-yellow" />
                <span>{importing ? 'Importing...' : 'Restore Backup'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {importSuccess && (
              <div className="p-2 mt-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>{importSuccess}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end mt-6 pt-3 border-t border-apple-darkBorder/60">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
