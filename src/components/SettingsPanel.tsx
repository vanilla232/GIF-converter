import { useState } from 'react';
import { RotateCw, FlipHorizontal } from 'lucide-react';

interface SettingsPanelProps {
  onConvert: (settings: any) => void;
  onConvertAll: (settings: any) => void;
  isConverting: boolean;
  startTime: number;
  endTime: number;
  setStartTime: (val: number) => void;
  setEndTime: (val: number) => void;
  fps: number;
  setFps: (val: number) => void;
  resolution: string;
  setResolution: (val: string) => void;
  cropMode: string;
  setCropMode: (val: string) => void;
  rotation: number;
  setRotation: (val: number) => void;
  flip: boolean;
  setFlip: (val: boolean) => void;
}

export default function SettingsPanel({ 
  onConvert, onConvertAll, isConverting, 
  startTime, setStartTime, 
  endTime, setEndTime,
  fps, setFps,
  resolution, setResolution,
  cropMode, setCropMode,
  rotation, setRotation,
  flip, setFlip
}: SettingsPanelProps) {
  const [colors, setColors] = useState(256);
  const [dithering, setDithering] = useState(true);

  const getSettings = () => ({ 
    startTime, 
    duration: endTime - startTime, 
    fps, 
    resolution, 
    cropMode, 
    rotation, 
    flip,
    colors,
    dithering
  });

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  return (
    <div className="settings-panel">
      <div className="settings-group">
        <h3>Формат кадра</h3>
        <div className="button-row">
          <button className={cropMode === 'free' ? 'active' : ''} onClick={() => setCropMode('free')}>Свободный</button>
          <button className={cropMode === '1:1' ? 'active' : ''} onClick={() => setCropMode('1:1')}>1:1</button>
          <button className={cropMode === '16:9' ? 'active' : ''} onClick={() => setCropMode('16:9')}>16:9</button>
        </div>
      </div>

      <div className="settings-group">
        <h3>Трансформация</h3>
        <div className="button-row">
          <button title="Повернуть" onClick={handleRotate}><RotateCw size={18} /> {rotation}°</button>
          <button title="Отразить" onClick={() => setFlip(!flip)} className={flip ? 'active' : ''}><FlipHorizontal size={18} /></button>
        </div>
      </div>

      <div className="settings-group">
        <h3>Время (Секунды)</h3>
        <div className="setting-item">
          <label>Начало</label>
          <input type="number" value={Number(startTime.toFixed(1))} onChange={(e) => setStartTime(Number(e.target.value))} min="0" step="0.1" />
        </div>
        <div className="setting-item">
          <label>Конец</label>
          <input type="number" value={Number(endTime.toFixed(1))} onChange={(e) => setEndTime(Number(e.target.value))} min="0" step="0.1" />
        </div>
      </div>

      <div className="settings-group">
        <h3>Настройки GIF</h3>
        
        <div className="setting-item">
          <label>FPS (Кадры в секунду)</label>
          <input type="number" value={fps} onChange={(e) => setFps(Number(e.target.value))} min="1" max="50" />
        </div>

        <div className="setting-item">
          <label>Разрешение</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="original">Оригинал</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Цвета (Палитра): {colors}</label>
          <input type="range" min="2" max="256" value={colors} onChange={(e) => setColors(Number(e.target.value))} className="settings-range" />
        </div>

        <div className="setting-item checkbox-item">
          <label>Дизеринг (Dithering)</label>
          <input type="checkbox" checked={dithering} onChange={(e) => setDithering(e.target.checked)} />
        </div>
      </div>

      <div className="settings-footer">
        <button className="primary convert-btn" onClick={() => onConvert(getSettings())} disabled={isConverting}>
          {isConverting ? 'Конвертация...' : 'Конвертировать'}
        </button>
        <button className="secondary convert-all-btn" onClick={() => onConvertAll(getSettings())} disabled={isConverting}>
          Конвертировать всё
        </button>
      </div>
    </div>
  );
}