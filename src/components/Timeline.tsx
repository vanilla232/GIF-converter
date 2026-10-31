import { useRef, useState } from 'react';

interface TimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
  onSeek: (val: number) => void;
}

export default function Timeline({ 
  duration, startTime, endTime, currentTime, onStartChange, onEndChange, onSeek 
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const safeDuration = isFinite(duration) && duration > 0 ? duration : 0;
  
  const startPercent = safeDuration > 0 ? (startTime / safeDuration) * 100 : 0;
  const endPercent = safeDuration > 0 ? (endTime / safeDuration) * 100 : 100;
  const currentPercent = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;

  const getTimeFromClientX = (clientX: number) => {
    if (!trackRef.current || safeDuration === 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width === 0) return 0;
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    return ratio * safeDuration;
  };

  const handlePointerDown = (e: React.PointerEvent, type: 'start' | 'end' | 'scrub') => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    
    if (type === 'scrub') {
      setIsScrubbing(true);
      onSeek(getTimeFromClientX(e.clientX));
    } else {
      setDragging(type);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging && !isScrubbing) return;
    
    const newTime = getTimeFromClientX(e.clientX);
    if (dragging === 'start') {
      const clampedTime = Math.min(newTime, endTime - 0.1);
      onStartChange(Math.max(0, clampedTime));
    } else if (dragging === 'end') {
      const clampedTime = Math.max(newTime, startTime + 0.1);
      onEndChange(Math.min(safeDuration, clampedTime));
    } else if (isScrubbing) {
      onSeek(newTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(null);
    setIsScrubbing(false);
  };

  if (safeDuration === 0) return null;

  return (
    <div className="timeline-container">
      <div 
        className="timeline-track-wrapper" 
        ref={trackRef} 
        onPointerDown={(e) => handlePointerDown(e, 'scrub')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="timeline-track-bg"></div>
        
        <div 
          className="timeline-track-active" 
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
        ></div>
        
        <div 
          className="timeline-playhead" 
          style={{ left: `${currentPercent}%` }}
        ></div>

        <div 
          className="timeline-handle" 
          style={{ left: `${startPercent}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'start')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="timeline-handle-grip"></div>
        </div>
        
        <div 
          className="timeline-handle" 
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => handlePointerDown(e, 'end')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="timeline-handle-grip"></div>
        </div>
      </div>
      <div className="timeline-labels">
        <span>{isFinite(startTime) ? startTime.toFixed(1) : 0}s</span>
        <span>{isFinite(currentTime) ? currentTime.toFixed(1) : 0}s</span>
        <span>{isFinite(endTime) ? endTime.toFixed(1) : 0}s</span>
      </div>
    </div>
  );
}