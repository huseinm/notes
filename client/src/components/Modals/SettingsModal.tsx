import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  Server,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Lock,
  Wifi,
  AlertCircle
} from 'lucide-react';
import {
  connectToServer,
  exportLocalBackup,
  importBackup,
  syncWithServer,
  updateServerPassword
} from '../../api';
import {
  isNativeApp,
  loadServerConfig,
  SyncStatusSnapshot
} from '../../sync/localStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalNotes: number;
    totalFolders: number;
  };
  syncSnapshot?: SyncStatusSnapshot;
  onRefreshData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  stats,
  syncSnapshot,
  onRefreshData
}) => {
  const [mode, setMode] = useState<'same_origin' | 'remote_server' | 'local_only'>('same_origin');
  const [serverUrl, setServerUrl] = useState('');
  const [password, setPassword] = useState('');
  const [newServerPassword, setNewServerPassword] = useState('');
  const [showPasswordConfig, setShowPasswordConfig] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeApp = isNativeApp();

  useEffect(() => {
    if (isOpen) {
      const cfg = loadServerConfig();
      setMode(cfg.mode);
      setServerUrl(cfg.serverUrl || '');
      setPassword('');
      setNewServerPassword('');
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setStatusMsg(null);

    try {
      const res = await connectToServer({
        mode,
        serverUrl: mode === 'remote_server' ? serverUrl : '',
        password: password || undefined
      });
      await onRefreshData();
      setStatusMsg({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      if (res.success) {
        setPassword('');
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to connect to server'
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleManualSync = async () => {
    setConnecting(true);
    setStatusMsg(null);
    try {
      const ok = await syncWithServer(true);
      await onRefreshData();
      setStatusMsg({
        type: ok ? 'success' : 'error',
        text: ok
          ? 'All notes and folders synced with your server!'
          : 'Server unreachable — your notes are safely saved on this device.'
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveNewServerPassword = async () => {
    setConnecting(true);
    setStatusMsg(null);
    try {
      const res = await updateServerPassword(newServerPassword);
      setStatusMsg({ type: 'success', text: res.message });
      setNewServerPassword('');
      setShowPasswordConfig(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMsg(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await importBackup(json);
      await onRefreshData();
      setStatusMsg({
        type: 'success',
        text: `Imported ${res.importedNotes} notes and ${res.importedFolders} folders!`
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Import error: ${err.message}`
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90dvh] flex flex-col bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-xl shadow-2xl overflow-hidden select-none text-notes-lightText dark:text-notes-darkText"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-notes-lightBorder dark:border-notes-darkBorder/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-notes-yellow" />
            <h3 className="font-semibold text-sm text-notes-lightText dark:text-white">
              Server Sync, Storage & Backups
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Status Banner */}
          {statusMsg && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Section 1: Self-Hosted NAS / Server Connection */}
          <form onSubmit={handleConnectAndSync} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-notes-lightText dark:text-white flex items-center gap-1.5">
                <Wifi size={14} className="text-notes-yellow" />
                <span>Sync & Connection Mode</span>
              </h4>
              {syncSnapshot && syncSnapshot.status !== 'local_only' && (
                <button
                  type="button"
                  disabled={connecting}
                  onClick={handleManualSync}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-notes-yellow/15 hover:bg-notes-yellow text-amber-700 dark:text-notes-yellow hover:text-black font-medium text-[11px] transition-colors"
                >
                  <RefreshCw size={11} className={connecting ? 'animate-spin' : ''} />
                  <span>Sync Now</span>
                </button>
              )}
            </div>

            <p className="text-notes-lightMuted dark:text-notes-darkMuted leading-relaxed">
              Your notes are always stored locally on this device first for zero-data-loss offline access, and sync automatically with your NAS or server when connected.
            </p>

            {/* Mode Selector Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {!nativeApp && (
                <button
                  type="button"
                  onClick={() => setMode('same_origin')}
                  className={`py-2 px-2.5 rounded-lg border text-left transition-colors ${
                    mode === 'same_origin'
                      ? 'border-notes-yellow bg-notes-yellow/15 text-notes-lightText dark:text-white font-semibold'
                      : 'border-notes-lightBorder dark:border-notes-darkBorder/60 text-notes-lightMuted dark:text-notes-darkMuted'
                  }`}
                >
                  <div className="text-xs">This Server</div>
                  <div className="text-[10px] opacity-75 truncate">Current Web Host</div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode('remote_server')}
                className={`py-2 px-2.5 rounded-lg border text-left transition-colors ${
                  mode === 'remote_server'
                    ? 'border-notes-yellow bg-notes-yellow/15 text-notes-lightText dark:text-white font-semibold'
                    : 'border-notes-lightBorder dark:border-notes-darkBorder/60 text-notes-lightMuted dark:text-notes-darkMuted'
                }`}
              >
                <div className="text-xs">Remote NAS / IP</div>
                <div className="text-[10px] opacity-75 truncate">Connect via IP or URL</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('local_only')}
                className={`py-2 px-2.5 rounded-lg border text-left transition-colors ${
                  mode === 'local_only'
                    ? 'border-notes-yellow bg-notes-yellow/15 text-notes-lightText dark:text-white font-semibold'
                    : 'border-notes-lightBorder dark:border-notes-darkBorder/60 text-notes-lightMuted dark:text-notes-darkMuted'
                }`}
              >
                <div className="text-xs">On-Device Only</div>
                <div className="text-[10px] opacity-75 truncate">Offline Standalone</div>
              </button>
            </div>

            {/* Remote Server URL & Password Inputs */}
            {mode === 'remote_server' && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-notes-lightMuted dark:text-notes-darkMuted mb-1">
                    NAS / Server Address (IP & Port or Domain)
                  </label>
                  <input
                    type="text"
                    placeholder="http://192.168.1.100:3000"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-black/5 dark:bg-black/30 border border-notes-lightBorder dark:border-notes-darkBorder outline-none focus:border-notes-yellow text-notes-lightText dark:text-white"
                  />
                </div>
              </div>
            )}

            {mode !== 'local_only' && (
              <div>
                <label className="block text-[11px] font-medium text-notes-lightMuted dark:text-notes-darkMuted mb-1">
                  Server Password (leave blank if no password is set on server)
                </label>
                <input
                  type="password"
                  placeholder="Optional server password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-black/5 dark:bg-black/30 border border-notes-lightBorder dark:border-notes-darkBorder outline-none focus:border-notes-yellow text-notes-lightText dark:text-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={connecting}
                className="px-4 py-2 rounded-lg bg-notes-yellow hover:bg-notes-yellowHover text-black font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {connecting
                  ? 'Connecting & Syncing...'
                  : mode === 'local_only'
                  ? 'Use On-Device Standalone Mode'
                  : 'Save & Sync with Server'}
              </button>

              {mode !== 'local_only' && (
                <button
                  type="button"
                  onClick={() => setShowPasswordConfig(!showPasswordConfig)}
                  className="flex items-center gap-1 text-[11px] text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white"
                >
                  <Lock size={12} />
                  <span>{showPasswordConfig ? 'Hide Security' : 'Configure Server Password'}</span>
                </button>
              )}
            </div>

            {/* Optional Server Password Management */}
            {showPasswordConfig && mode !== 'local_only' && (
              <div className="p-3 rounded-lg bg-black/5 dark:bg-black/30 border border-notes-lightBorder dark:border-notes-darkBorder/60 space-y-2 mt-2">
                <div className="font-medium text-notes-lightText dark:text-white">
                  Set or Change Server Login Password
                </div>
                <p className="text-[11px] text-notes-lightMuted dark:text-notes-darkMuted">
                  Protect your NAS/server with a password when connecting from Meta Quest or other devices. Leave empty and click Save to disable password protection.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="New server password (or empty to remove)"
                    value={newServerPassword}
                    onChange={(e) => setNewServerPassword(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-notes-lightBorder dark:border-notes-darkBorder outline-none focus:border-notes-yellow text-notes-lightText dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewServerPassword}
                    className="px-3 py-1.5 rounded-lg bg-notes-lightHover dark:bg-notes-darkHover hover:bg-notes-yellow hover:text-black font-medium text-xs transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Section 2: System & Sync Status Box */}
          <div className="p-3 rounded-lg bg-black/5 dark:bg-black/30 border border-notes-lightBorder dark:border-notes-darkBorder/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-notes-lightMuted dark:text-notes-darkMuted">Storage Engine</span>
              <span className="font-medium text-notes-lightText dark:text-white">
                Offline-First Local DB + SQLite WAL Sync
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-notes-lightMuted dark:text-notes-darkMuted">Active Notes</span>
              <span className="font-semibold text-amber-600 dark:text-notes-yellow">
                {stats.totalNotes} notes ({stats.totalFolders} folders)
              </span>
            </div>
            {syncSnapshot && (
              <div className="flex items-center justify-between">
                <span className="text-notes-lightMuted dark:text-notes-darkMuted">
                  Pending Offline Changes
                </span>
                <span className="font-medium text-notes-lightText dark:text-white">
                  {syncSnapshot.pendingCount} queued
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-notes-lightMuted dark:text-notes-darkMuted">License</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                MIT Open Source
              </span>
            </div>
          </div>

          {/* Section 3: Backup & Export Section */}
          <div className="space-y-2 pt-1 border-t border-notes-lightBorder dark:border-notes-darkBorder/40">
            <h4 className="font-semibold text-notes-lightText dark:text-white flex items-center gap-1.5 pt-2">
              <HardDrive size={14} className="text-notes-yellow" />
              Database Backup & Portability
            </h4>
            <p className="text-notes-lightMuted dark:text-notes-darkMuted leading-relaxed">
              Export all notes and folders to a portable JSON file or restore from a backup file at any time (works both online and offline).
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportLocalBackup()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-notes-lightHover dark:bg-notes-darkHover hover:bg-black/10 dark:hover:bg-black/40 text-notes-lightText dark:text-white font-medium transition-colors"
              >
                <Download size={14} className="text-notes-yellow" />
                <span>Export Backup</span>
              </button>

              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-notes-lightHover dark:bg-notes-darkHover hover:bg-black/10 dark:hover:bg-black/40 text-notes-lightText dark:text-white font-medium transition-colors disabled:opacity-50"
              >
                <Upload size={14} className="text-notes-yellow" />
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-notes-lightBorder dark:border-notes-darkBorder/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded-lg bg-notes-yellow hover:bg-notes-yellowHover text-black font-semibold transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
