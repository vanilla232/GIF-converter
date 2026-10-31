import { useEffect, useRef, useState } from 'react';

interface CropOverlayProps {
  cropMode: string;
  crop: { x: number; y: number; w: number; h: number };
  setCrop: (crop: { x: number; y: number; w: number; h: number }) => void;
  videoAspectRatio: number;
}

type Handle = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

export default function CropOverlay({ cropMode, crop, setCrop, videoAspectRatio }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<Handle | null>(null);
  const startPos = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 0, h: 0 } });

  useEffect(() => {
    if (cropMode === '1:1') {
      let size = 1;
      let w = size;
      let h = (size * videoAspectRatio) / 1;
      if (h > 1) {
        h = 1;
        w = 1 / videoAspectRatio;
      }
      setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
    } else if (cropMode === '16:9') {
      let w = 1;
      let h = (w * videoAspectRatio) / (16 / 9);
      if (h > 1) {
        h = 1;
        w = (16 / 9) / videoAspectRatio;
      }
      setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
    }
  }, [cropMode, videoAspectRatio, setCrop]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const dx = (e.clientX - startPos.current.x) / rect.width;
      const dy = (e.clientY - startPos.current.y) / rect.height;

      let { x, y, w, h } = startPos.current.crop;

      if (dragging === 'move') {
        x = Math.max(0, Math.min(1 - w, x + dx));
        y = Math.max(0, Math.min(1 - h, y + dy));
      } else {
        const ratio = cropMode === '1:1' ? 1 / videoAspectRatio : cropMode === '16:9' ? (16 / 9) / videoAspectRatio : null;

        if (dragging.includes('l')) {
          const newX = Math.max(0, Math.min(x + w - 0.05, x + dx));
          const newW = w + (x - newX);
          if (ratio) {
            const newH = newW / ratio;
            if (y + newH <= 1) {
              x = newX; w = newW; h = newH;
            }
          } else {
            x = newX; w = newW;
          }
        }
        if (dragging.includes('r')) {
          const newW = Math.max(0.05, Math.min(1 - x, w + dx));
          if (ratio) {
            const newH = newW / ratio;
            if (y + newH <= 1) {
              w = newW; h = newH;
            }
          } else {
            w = newW;
          }
        }
        if (dragging.includes('t')) {
          const newY = Math.max(0, Math.min(y + h - 0.05, y + dy));
          const newH = h + (y - newY);
          if (ratio) {
            const newW = newH * ratio;
            if (x + newW <= 1) {
              y = newY; h = newH; w = newW;
            }
          } else {
            y = newY; h = newH;
          }
        }
        if (dragging.includes('b')) {
          const newH = Math.max(0.05, Math.min(1 - y, h + dy));
          if (ratio) {
            const newW = newH * ratio;
            if (x + newW <= 1) {
              h = newH; w = newW;
            }
          } else {
            h = newH;
          }
        }
      }

      setCrop({ x, y, w, h });
    };

    const handlePointerUp = () => setDragging(null);

    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, cropMode, videoAspectRatio, setCrop]);

  const startDrag = (e: React.PointerEvent, handle: Handle) => {
    e.preventDefault();
    e.stopPropagation();
    startPos.current = { x: e.clientX, y: e.clientY, crop };
    setDragging(handle);
  };

  return (
    <div 
      className="crop-overlay" 
      ref={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="crop-box"
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.w * 100}%`,
          height: `${crop.h * 100}%`,
        }}
        onPointerDown={(e) => startDrag(e, 'move')}
      >
        <div className="crop-handle tl" onPointerDown={(e) => startDrag(e, 'tl')}></div>
        <div className="crop-handle tr" onPointerDown={(e) => startDrag(e, 'tr')}></div>
        <div className="crop-handle bl" onPointerDown={(e) => startDrag(e, 'bl')}></div>
        <div className="crop-handle br" onPointerDown={(e) => startDrag(e, 'br')}></div>
        <div className="crop-handle t" onPointerDown={(e) => startDrag(e, 't')}></div>
        <div className="crop-handle b" onPointerDown={(e) => startDrag(e, 'b')}></div>
        <div className="crop-handle l" onPointerDown={(e) => startDrag(e, 'l')}></div>
        <div className="crop-handle r" onPointerDown={(e) => startDrag(e, 'r')}></div>
      </div>
    </div>
  );
}