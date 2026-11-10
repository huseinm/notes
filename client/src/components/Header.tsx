import React from 'react';
import { 
  PanelLeftClose, 
  PanelLeft, 
  Sun, 
  Moon, 
  Database, 
  Keyboard, 
  CheckCircle2,
  NotebookPen
} from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  saveStatus: 'saved' | 'saving' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  onOpenShortcuts,
  saveStatus
}) => {
  return (
    <header className="h-12 border-b border-apple-lightBorder dark:border-apple-darkBorder bg-apple-lightSidebar dark:bg-apple-darkSidebar flex items-center justify-between px-3.5 z-20 select-none transition-colors">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Collapse folders (Cmd+\\)" : "Expand folders (Cmd+\\)"}
          className="p-1.5 rounded-md hover:bg-apple-lightHover dark:hover:bg-apple-darkHover text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>

        <div className="flex items-center gap-2">
          {/* Notes Distinctive Yellow/Amber Notepad Icon */}
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#f8d068] via-[#e5a93c] to-[#c48920] flex items-center justify-center shadow-xs text-black">
            <NotebookPen size={13} strokeWidth={2.3} />
          </div>
          <span className="font-semibold text-sm tracking-tight text-apple-lightText dark:text-apple-darkText">
            Notes
          </span>
          <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-apple-yellow/15 text-amber-700 dark:text-apple-yellow">
            Self-Hosted
          </span>
        </div>
      </div>

      {/* Center status indicator */}
      <div className="flex items-center text-xs text-apple-lightMuted dark:text-apple-darkMuted">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 animate-pulse text-amber-600 dark:text-apple-yellow">
            <span className="w-2 h-2 rounded-full bg-apple-yellow"></span>
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 opacity-80">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="hidden sm:inline">All changes saved</span>
          </span>
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
          className="p-1.5 rounded-md hover:bg-apple-lightHover dark:hover:bg-apple-darkHover text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          <Keyboard size={17} />
        </button>

        <button
          onClick={onToggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-1.5 rounded-md hover:bg-apple-lightHover dark:hover:bg-apple-darkHover text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings, Backups & Storage"
          className="p-1.5 rounded-md hover:bg-apple-lightHover dark:hover:bg-apple-darkHover text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
        >
          <Database size={17} />
        </button>
      </div>
    </header>
  );
};
