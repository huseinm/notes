import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  RotateCw,
  Check,
  RefreshCw,
  ScanLine,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

export type ScanFilterMode = 'document' | 'grayscale' | 'color' | 'original';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptScan: (scannedFile: File) => Promise<void>;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onAcceptScan
}) => {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [filterMode, setFilterMode] = useState<ScanFilterMode>('document');
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [isSaving, setIsSaving] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSourceImage(null);
      setFilterMode('document');
      setRotation(0);
      setIsSaving(false);
    }
  }, [isOpen]);

  // Render processed scan onto preview canvas whenever image, filter, or rotation changes
  useEffect(() => {
    if (!sourceImage || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Cap maximum dimension to 2000px for fast mobile processing while keeping crisp print/PDF quality
    const maxDim = 2000;
    let srcW = sourceImage.naturalWidth || sourceImage.width;
    let srcH = sourceImage.naturalHeight || sourceImage.height;
    if (srcW > maxDim || srcH > maxDim) {
      const scale = maxDim / Math.max(srcW, srcH);
      srcW = Math.round(srcW * scale);
      srcH = Math.round(srcH * scale);
    }

    const isRotated90 = rotation % 180 !== 0;
    canvas.width = isRotated90 ? srcH : srcW;
    canvas.height = isRotated90 ? srcW : srcH;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(sourceImage, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    if (filterMode === 'original') return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    if (filterMode === 'grayscale') {
      // High-contrast grayscale
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Slight S-curve contrast boost
        const contrasted = Math.min(255, Math.max(0, (lum - 128) * 1.35 + 135));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }
    } else if (filterMode === 'color') {
      // Enhanced color document (brightens paper background & sharpens ink contrast)
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const val = data[i + c];
          const enhanced = Math.min(255, Math.max(0, (val - 120) * 1.4 + 140));
          data[i + c] = enhanced;
        }
      }
    } else if (filterMode === 'document') {
      // Crisp B&W Document Scan filter (removes shadows on paper while keeping text sharp)
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Soft threshold transition between 110 and 175 for smooth anti-aliased text on pure white paper
        let out: number;
        if (lum > 170) {
          out = 255;
        } else if (lum < 95) {
          out = Math.max(15, lum * 0.25);
        } else {
          out = ((lum - 95) / (170 - 95)) * 240 + 15;
        }
        data[i] = out;
        data[i + 1] = out;
        data[i + 2] = out;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [sourceImage, filterMode, rotation]);

  if (!isOpen) return null;

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setSourceImage(img);
        setRotation(0);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAccept = async () => {
    if (!previewCanvasRef.current || isSaving) return;
    setIsSaving(true);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        previewCanvasRef.current?.toBlob(resolve, 'image/jpeg', 0.92)
      );
      if (!blob) throw new Error('Failed to generate scanned document image');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const scannedFile = new File([blob], `scan-${timestamp}.jpg`, {
        type: 'image/jpeg'
      });

      await onAcceptScan(scannedFile);
      onClose();
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92dvh] flex flex-col bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-2xl shadow-2xl overflow-hidden text-notes-lightText dark:text-notes-darkText"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-notes-lightBorder dark:border-notes-darkBorder/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-notes-yellow" />
            <h3 className="font-semibold text-sm text-notes-lightText dark:text-white">
              Scan Document
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hidden Camera & Gallery Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Modal Body */}
        {!sourceImage ? (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-notes-yellow/15 flex items-center justify-center text-notes-yellow">
              <ScanLine size={32} />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h4 className="font-semibold text-base text-notes-lightText dark:text-white">
                Capture Document or Receipt
              </h4>
              <p className="text-xs text-notes-lightMuted dark:text-notes-darkMuted leading-relaxed">
                Take a photo of a document with your camera. You can preview, rotate, and apply high-contrast document enhancement before saving it to your note.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-notes-yellow hover:bg-notes-yellowHover text-black font-semibold text-sm shadow-sm transition-colors"
              >
                <Camera size={18} />
                <span>Open Camera to Scan</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-notes-lightHover dark:bg-notes-darkHover hover:bg-black/10 dark:hover:bg-white/10 text-notes-lightText dark:text-white font-medium text-xs transition-colors"
              >
                <ImageIcon size={16} />
                <span>Choose from Photos</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scan Preview Canvas Container */}
            <div className="flex-1 min-h-[240px] max-h-[55dvh] bg-black/90 flex items-center justify-center p-3 overflow-auto">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain rounded shadow-lg bg-white"
              />
            </div>

            {/* Filter & Rotation Controls */}
            <div className="p-3 bg-notes-lightSidebar dark:bg-[#1e1e20] border-t border-notes-lightBorder dark:border-notes-darkBorder/60 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[11px] font-medium text-notes-lightMuted dark:text-notes-darkMuted">
                  <Sparkles size={13} className="text-notes-yellow" />
                  <span>Scan Mode:</span>
                </div>

                {/* Rotation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 270) % 360)}
                    title="Rotate Left"
                    className="p-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] border border-notes-lightBorder dark:border-notes-darkBorder text-notes-lightText dark:text-white hover:border-notes-yellow transition-colors"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title="Rotate Right"
                    className="p-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] border border-notes-lightBorder dark:border-notes-darkBorder text-notes-lightText dark:text-white hover:border-notes-yellow transition-colors"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </div>

              {/* Filter Mode Pills */}
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(
                  [
                    { id: 'document', label: 'Document' },
                    { id: 'grayscale', label: 'Grayscale' },
                    { id: 'color', label: 'Color' },
                    { id: 'original', label: 'Original' }
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFilterMode(mode.id)}
                    className={`py-1.5 px-2 rounded-lg font-medium text-[11px] transition-colors ${
                      filterMode === mode.id
                        ? 'bg-notes-yellow text-black font-semibold shadow-xs'
                        : 'bg-white dark:bg-[#2c2c2e] text-notes-lightText dark:text-notes-darkText border border-notes-lightBorder dark:border-notes-darkBorder/60'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Retake / Accept Action Bar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-notes-lightHover dark:bg-notes-darkHover text-notes-lightText dark:text-white text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleAccept}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-notes-yellow hover:bg-notes-yellowHover text-black font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isSaving ? 'Saving to Note...' : 'Accept & Add to Note'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
