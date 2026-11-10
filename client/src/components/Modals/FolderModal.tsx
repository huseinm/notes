import React, { useState, useEffect } from 'react';
import { Folder } from '../../types';
import { X } from 'lucide-react';

interface FolderModalProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, name: string) => Promise<void>;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  folder,
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name);
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(folder.id, name.trim());
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-[#252528] border border-apple-lightBorder dark:border-apple-darkBorder rounded-xl shadow-2xl p-5 select-none text-apple-lightText dark:text-apple-darkText"
      >
        <div className="flex items-center justify-between pb-3 border-b border-apple-lightBorder dark:border-apple-darkBorder/60">
          <h3 className="font-semibold text-sm text-apple-lightText dark:text-white">
            Rename Folder
          </h3>
          <button
            onClick={onClose}
            className="text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-apple-lightMuted dark:text-apple-darkMuted mb-1">
              Folder Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg bg-black/5 dark:bg-black/30 border border-apple-lightBorder dark:border-apple-darkBorder outline-none focus:border-apple-yellow text-apple-lightText dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold transition-colors shadow-xs"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
