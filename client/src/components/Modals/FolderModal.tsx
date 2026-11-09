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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder rounded-xl shadow-2xl p-5 select-none">
        <div className="flex items-center justify-between pb-3 border-b border-apple-darkBorder/60">
          <h3 className="font-semibold text-sm text-white dark:text-white light:text-black">
            Rename Folder
          </h3>
          <button
            onClick={onClose}
            className="text-apple-darkMuted hover:text-white dark:hover:text-white light:hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-apple-darkMuted mb-1">
              Folder Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg bg-black/30 dark:bg-black/30 light:bg-black/5 border border-apple-darkBorder outline-none focus:border-apple-yellow text-white dark:text-white light:text-black"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg text-apple-darkMuted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold transition-colors shadow-sm"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
