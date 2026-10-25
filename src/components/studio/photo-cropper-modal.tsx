'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export interface PhotoCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage: string | null;
  onSave: (pngDataUrl: string) => void;
}

export function PhotoCropperModal(props: PhotoCropperModalProps) {
  if (!props.isOpen) return null;
  return <PhotoCropperContent key={props.initialImage ?? 'empty'} {...props} />;
}

function PhotoCropperContent({
  onClose,
  initialImage,
  onSave,
}: PhotoCropperModalProps) {
  const [rawImage, setRawImage] = useState<string | null>(initialImage);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f1411';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (img && img.complete) {
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height) * zoom;
      const w = img.width * scale;
      const h = img.height * scale;
      const cx = canvas.width / 2 + pan.x;
      const cy = canvas.height / 2 + pan.y;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    } else {
      ctx.fillStyle = '#64756b';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload an image to crop', canvas.width / 2, canvas.height / 2);
    }

    // Circular Mask overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.arc(canvas.width / 2, canvas.height / 2, 105, 0, Math.PI * 2, true);
    ctx.fill();

    // Circle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 105, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (rawImage) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
      img.src = rawImage;
    } else {
      imgRef.current = null;
      drawCanvas();
    }
  }, [drawCanvas, rawImage]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, pan, zoom]);

  function handlePanStart(e: React.MouseEvent) {
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setIsPanning(true);
  }

  function handlePanMove(e: React.MouseEvent) {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  }

  function handlePanEnd() {
    setIsPanning(false);
  }

  function handleImageFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setRawImage(result);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const img = imgRef.current;
    if (!img) {
      onClose();
      return;
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = 400;
    offscreen.height = 400;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const displayRadius = 105;
    const scale = Math.max(280 / img.width, 280 / img.height) * zoom;
    const factor = 400 / (displayRadius * 2);

    const cx = (140 + pan.x - 140 + displayRadius) * factor;
    const cy = (140 + pan.y - 140 + displayRadius) * factor;
    const w = img.width * scale * factor;
    const h = img.height * scale * factor;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);

    const pngDataUrl = offscreen.toDataURL('image/png');
    onSave(pngDataUrl);
  }

  return (
    <div
      className="photo-cropper-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-modal-title"
    >
      <div className="photo-cropper-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <strong id="photo-modal-title" className="text-base font-semibold">
            Crop & Position Profile Photo
          </strong>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </div>

        <div
          className="cropper-stage"
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
        >
          <canvas ref={canvasRef} width={280} height={280} />
        </div>

        <div className="cropper-slider-row">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
          />
          <span>{zoom.toFixed(1)}x</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Drag on image to reposition</span>
          <label className="button secondary file-button py-1 px-3 text-xs">
            <Upload size={12} />
            <span>Upload New Image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageFileUpload}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="button secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="button primary" onClick={handleSave}>
            Apply & Save to Resume
          </Button>
        </div>
      </div>
    </div>
  );
}
