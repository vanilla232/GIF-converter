import { FileVideo, FileImage, Trash2, Plus, XCircle } from 'lucide-react';

interface FileListProps {
  files: string[];
  onRemove: (index: number) => void;
  onSelectFiles: () => void;
  onClearAll: () => void;
}

export default function FileList({ files, onRemove, onSelectFiles, onClearAll }: FileListProps) {
  const getFileName = (path: string) => {
    return path.split(/[\\/]/).pop() || path;
  };

  const isVideo = (path: string) => /\.(mp4|webm|mov|avi)$/i.test(path);

  return (
    <div className="file-list-container">
      <div className="file-list-header">
        <h2 className="file-list-title">Очередь ({files.length})</h2>
        <div className="header-actions">
          <button className="clear-all-btn" onClick={onClearAll} title="Очистить всё">
            <XCircle size={16} /> Очистить
          </button>
          <button className="primary add-files-btn" onClick={onSelectFiles}>
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>
      <div className="file-list-items">
        {files.map((filePath, index) => (
          <div key={`${filePath}-${index}`} className="file-item">
            <div className="file-item-info">
              <div className="file-item-icon">
                {isVideo(filePath) ? <FileVideo size={20} /> : <FileImage size={20} />}
              </div>
              <div className="file-item-details">
                <span className="file-item-name">{getFileName(filePath)}</span>
                <span className="file-item-size">{filePath}</span>
              </div>
            </div>
            <button className="file-item-remove" onClick={() => onRemove(index)}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}