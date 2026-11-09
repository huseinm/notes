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
      <div className="w-full max-w-md bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder rounded-xl shadow-2xl p-5 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-apple-darkBorder/60">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-apple-yellow" />
            <h3 className="font-semibold text-sm text-white dark:text-white light:text-black">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-apple-darkMuted hover:text-white dark:hover:text-white light:hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 divide-y divide-apple-darkBorder/40 max-h-80 overflow-y-auto">
          {shortcuts.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 text-xs">
              <span className="text-apple-darkText/80 dark:text-apple-darkText/80 light:text-apple-lightText/80">
                {item.desc}
              </span>
              <kbd className="px-2 py-0.5 rounded bg-black/40 dark:bg-black/40 light:bg-black/10 border border-apple-darkBorder/60 text-apple-yellow font-mono font-medium text-[11px]">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end mt-4 pt-3 border-t border-apple-darkBorder/60">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
