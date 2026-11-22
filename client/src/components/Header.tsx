import React from 'react';
import { 
  PanelLeftClose, 
  PanelLeft, 
  Sun, 
  Moon, 
  Database, 
  Keyboard, 
  CheckCircle2,
  NotebookPen,
  CloudOff,
  HardDrive,
  Lock,
  RefreshCw
} from 'lucide-react';
import { SyncStatusSnapshot } from '../sync/localStore';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  saveStatus: 'saved' | 'saving' | 'error';
  syncSnapshot?: SyncStatusSnapshot;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  onOpenShortcuts,
  saveStatus,
  syncSnapshot
}) => {
  return (
    <header className="h-12 border-b border-notes-lightBorder dark:border-notes-darkBorder bg-notes-lightSidebar dark:bg-notes-darkSidebar flex items-center justify-between px-3.5 z-20 select-none transition-colors">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Collapse folders (Cmd+\\)" : "Expand folders (Cmd+\\)"}
          className="p-1.5 rounded-md hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>

        <div className="flex items-center gap-2">
          {/* Notes Distinctive Yellow/Amber Notepad Icon */}
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#f8d068] via-[#e5a93c] to-[#c48920] flex items-center justify-center shadow-xs text-black">
            <NotebookPen size={13} strokeWidth={2.3} />
          </div>
          <span className="font-semibold text-sm tracking-tight text-notes-lightText dark:text-notes-darkText">
            Notes
          </span>
          <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-notes-yellow/15 text-amber-700 dark:text-notes-yellow">
            Self-Hosted
          </span>
        </div>
      </div>

      {/* Center status & sync indicator */}
      <div className="flex items-center gap-2 text-xs text-notes-lightMuted dark:text-notes-darkMuted">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 animate-pulse text-amber-600 dark:text-notes-yellow">
            <span className="w-2 h-2 rounded-full bg-notes-yellow"></span>
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (!syncSnapshot || syncSnapshot.status === 'synced') && (
          <button
            onClick={onOpenSettings}
            title="All changes saved & synced. Click to configure server sync."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-notes-lightHover dark:hover:bg-notes-darkHover transition-colors"
          >
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="hidden sm:inline">Synced</span>
          </button>
        )}
        {saveStatus === 'saved' && syncSnapshot?.status === 'syncing' && (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-notes-yellow">
            <RefreshCw size={12} className="animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </span>
        )}
        {saveStatus === 'saved' && syncSnapshot?.status === 'local_only' && (
          <button
            onClick={onOpenSettings}
            title="Notes are saved on this device. Click to connect a self-hosted NAS or server."
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-notes-yellow/15 text-amber-700 dark:text-notes-yellow hover:bg-notes-yellow/25 transition-colors font-medium text-[11px]"
          >
            <HardDrive size={12} />
            <span>On-Device</span>
            <span className="hidden md:inline opacity-80">· Connect Server</span>
          </button>
        )}
        {saveStatus === 'saved' && syncSnapshot?.status === 'offline' && (
          <button
            onClick={onOpenSettings}
            title="Server unreachable — all changes are safely stored on your device and will sync automatically when back online."
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors font-medium text-[11px]"
          >
            <CloudOff size={12} />
            <span>
              Offline · Saved Locally
              {syncSnapshot.pendingCount > 0 ? ` (${syncSnapshot.pendingCount})` : ''}
            </span>
          </button>
        )}
        {saveStatus === 'saved' && syncSnapshot?.status === 'auth_required' && (
          <button
            onClick={onOpenSettings}
            title="Server requires password authentication"
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors font-medium text-[11px]"
          >
            <Lock size={12} />
            <span>Server Login Required</span>
          </button>
        )}
        {saveStatus === 'error' && (
          <span className="text-rose-500 font-medium">Save failed</span>
        )}
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (Cmd+/)"
          className="p-1.5 rounded-md hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          <Keyboard size={17} />
        </button>

        <button
          onClick={onToggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-1.5 rounded-md hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings, Backups & Storage"
          className="p-1.5 rounded-md hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          <Database size={17} />
        </button>
      </div>
    </header>
  );
};
