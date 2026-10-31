import { ImagePlus } from 'lucide-react';

interface DropZoneProps {
  onSelectFiles: () => void;
}

export default function DropZone({ onSelectFiles }: DropZoneProps) {
  return (
    <div className="dropzone">
      <ImagePlus size={64} className="dropzone-icon" />
      <h2>Перетащите файлы сюда</h2>
      <p style={{ marginBottom: '20px' }}>Поддерживаются видео и изображения</p>
      <button className="primary" onClick={onSelectFiles}>
        Или выберите файлы
      </button>
    </div>
  );
}