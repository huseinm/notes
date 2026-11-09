import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Cmd / Ctrl + N', desc: 'Create new note' },
    { key: 'Cmd / Ctrl + F', desc: 'Search all notes' },
    { key: 'Cmd / Ctrl + \\', desc: 'Toggle folders sidebar' },
    { key: 'Cmd / Ctrl + B', desc: 'Bold text' },
    { key: 'Cmd / Ctrl + I', desc: 'Italic text' },
    { key: 'Cmd / Ctrl + U', desc: 'Underline text' },
    { key: 'Cmd / Ctrl + Shift + 7', desc: 'Numbered list' },
    { key: 'Cmd / Ctrl + Shift + 8', desc: 'Bullet list' },
    { key: 'Cmd / Ctrl + Shift + 9', desc: 'Task / Checklist' },
    { key: 'Cmd / Ctrl + Shift + C', desc: 'Monospaced / Code block' },
    { key: 'Cmd / Ctrl + P', desc: 'Print / Save as PDF' },
    { key: 'Esc', desc: 'Close modals / Clear search' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#252528] border border-apple-lightBorder dark:border-apple-darkBorder rounded-xl shadow-2xl p-5 select-none text-apple-lightText dark:text-apple-darkText">
        <div className="flex items-center justify-between pb-3 border-b border-apple-lightBorder dark:border-apple-darkBorder/60">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-apple-yellow" />
            <h3 className="font-semibold text-sm text-apple-lightText dark:text-white">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 divide-y divide-apple-lightBorder dark:divide-apple-darkBorder/40 max-h-80 overflow-y-auto">
          {shortcuts.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 text-xs">
              <span className="text-apple-lightText/85 dark:text-apple-darkText/80">
                {item.desc}
              </span>
              <kbd className="px-2 py-0.5 rounded bg-black/5 dark:bg-black/40 border border-apple-lightBorder dark:border-apple-darkBorder/60 text-amber-700 dark:text-apple-yellow font-mono font-medium text-[11px]">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end mt-4 pt-3 border-t border-apple-lightBorder dark:border-apple-darkBorder/60">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
