import { useState, useEffect } from 'react';
import { FileVideo, FileImage, ArrowLeft } from 'lucide-react';
import Preview from './Preview';
import Timeline from './Timeline';
import SettingsPanel from './SettingsPanel';

interface EditorProps {
  files: string[];
  selectedIndex: number;
  onSelectFile: (index: number) => void;
  onBack: () => void;
  onConvert: (settings: any) => void;
  onConvertAll: (settings: any) => void;
  isConverting: boolean;
}

export default function Editor({ 
  files, selectedIndex, onSelectFile, onBack, onConvert, onConvertAll, isConverting 
}: EditorProps) {
  const selectedFile = files[selectedIndex];
  
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);

  const [fps, setFps] = useState(15);
  const [resolution, setResolution] = useState('original');
  const [cropMode, setCropMode] = useState('free');
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 });

  useEffect(() => {
    setStartTime(0);
    setEndTime(5);
    setCurrentTime(0);
    setVideoDuration(0);
    setRotation(0);
    setFlip(false);
    setCropMode('free');
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setSeekTo(null);
  }, [selectedIndex]);

  const handleDurationChange = (dur: number) => {
    if (isNaN(dur) || !isFinite(dur) || dur <= 0) return;
    setVideoDuration(prev => {
      if (prev === 0) {
        setEndTime(dur > 5 ? 5 : dur);
      }
      return dur;
    });
  };

  const handleSeek = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return;
    setSeekTo(time);
    setCurrentTime(time);
  };

  const handleConvertClick = (panelSettings: any) => {
    onConvert({ ...panelSettings, crop });
  };

  const handleConvertAllClick = (panelSettings: any) => {
    onConvertAll({ ...panelSettings, crop });
  };

  return (
    <div className="editor-layout">
      <div className="editor-sidebar">
        <button className="back-btn" onClick={onBack} disabled={isConverting}>
          <ArrowLeft size={20} />
        </button>
        <div className="mini-file-list">
          {files.map((file, index) => (
            <div 
              key={index} 
              className={`mini-file-item ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => !isConverting && onSelectFile(index)}
            >
              {/\.(mp4|webm|mov|avi)$/i.test(file) ? <FileVideo size={20} /> : <FileImage size={20} />}
            </div>
          ))}
        </div>
      </div>

      <div className="editor-center">
        <div className="editor-topbar">
          <span className="editor-filename">{selectedFile.split(/[\\/]/).pop()}</span>
        </div>

        <Preview 
          filePath={selectedFile} 
          onDurationChange={handleDurationChange} 
          onTimeUpdate={setCurrentTime}
          seekTo={seekTo}
          startTime={startTime}
          endTime={endTime}
          cropMode={cropMode}
          crop={crop}
          setCrop={setCrop}
          rotation={rotation}
          flip={flip}
        />
        
        <Timeline 
          duration={videoDuration}
          startTime={startTime}
          endTime={endTime}
          currentTime={currentTime}
          onStartChange={setStartTime}
          onEndChange={setEndTime}
          onSeek={handleSeek}
        />
      </div>

      <div className="editor-right">
        <SettingsPanel 
          onConvert={handleConvertClick} 
          onConvertAll={handleConvertAllClick}
          isConverting={isConverting} 
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          fps={fps}
          setFps={setFps}
          resolution={resolution}
          setResolution={setResolution}
          cropMode={cropMode}
          setCropMode={setCropMode}
          rotation={rotation}
          setRotation={setRotation}
          flip={flip}
          setFlip={setFlip}
        />
      </div>
    </div>
  );
}