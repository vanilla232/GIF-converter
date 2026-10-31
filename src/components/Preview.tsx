import { useEffect, useState, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import CropOverlay from './CropOverlay';

interface PreviewProps {
  filePath: string;
  onDurationChange: (duration: number) => void;
  onTimeUpdate: (time: number) => void;
  seekTo: number | null;
  startTime: number;
  endTime: number;
  cropMode: string;
  crop: { x: number; y: number; w: number; h: number };
  setCrop: (crop: { x: number; y: number; w: number; h: number }) => void;
  rotation: number;
  flip: boolean;
}

export default function Preview({ 
  filePath, onDurationChange, onTimeUpdate, seekTo, startTime, endTime,
  cropMode, crop, setCrop, rotation, flip
}: PreviewProps) {
  const [url, setUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(filePath);

  useEffect(() => {
    setUrl(convertFileSrc(filePath));
    setIsPlaying(false);
  }, [filePath]);

  useEffect(() => {
    if (seekTo !== null && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        onDurationChange(video.duration);
      }
      if (video.videoWidth && video.videoHeight) {
        setAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    if (video.readyState >= 1) handleMetadata();
    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('durationchange', handleMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('durationchange', handleMetadata);
    };
  }, [filePath, onDurationChange]);

  useEffect(() => {
    let animationFrameId: number;
    
    const updatePlayhead = () => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        if (isFinite(time)) {
          onTimeUpdate(time);
          if (isPlaying && time >= endTime) {
            videoRef.current.currentTime = startTime;
          }
        }
      }
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updatePlayhead);
    } else if (videoRef.current) {
      const time = videoRef.current.currentTime;
      if (isFinite(time)) onTimeUpdate(time);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, startTime, endTime, onTimeUpdate]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const transformStyle = {
    transform: `rotate(${rotation}deg) scaleX(${flip ? -1 : 1})`,
    transition: 'transform 0.3s ease',
  };

  return (
    <div className="preview-container">
      <div className="video-wrapper" style={{ aspectRatio: `${aspectRatio}` }}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={url}
            className="preview-media"
            style={transformStyle}
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <img 
            src={url} 
            className="preview-media" 
            style={transformStyle}
            alt="preview" 
            onLoad={(e) => setAspectRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} 
          />
        )}
        
        <CropOverlay 
          cropMode={cropMode}
          crop={crop}
          setCrop={setCrop}
          videoAspectRatio={aspectRatio}
        />
      </div>
      
      {isVideo && (
        <div className="video-controls">
          <button className="play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <div className="volume-control">
            <button onClick={() => setIsMuted(!isMuted)}>
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={isMuted ? 0 : volume} 
              onChange={handleVolumeChange} 
              className="volume-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
}