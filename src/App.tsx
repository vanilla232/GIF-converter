import { useState, useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { invoke } from '@tauri-apps/api/core';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import DropZone from './components/DropZone';
import FileList from './components/FileList';
import Editor from './components/Editor';
import './App.css';

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  const addFiles = (newPaths: string[]) => {
    const validPaths = newPaths.filter((p) => 
      /\.(mp4|mov|avi|webm|png|jpg|jpeg|gif)$/i.test(p)
    );
    setFiles((prev) => {
      const unique = validPaths.filter(p => !prev.includes(p));
      return [...prev, ...unique];
    });
  };

  useEffect(() => {
    let unlistenDrop: (() => void) | undefined;

    const setup = async () => {
      try {
        const webview = getCurrentWebview();
        unlistenDrop = await webview.onDragDropEvent((event) => {
          if (event.payload.type === 'drop') {
            addFiles(event.payload.paths);
          }
        });
      } catch (err) {
        console.error(err);
      }
    };

    setup();

    return () => {
      if (unlistenDrop) unlistenDrop();
    };
  }, []);

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Media',
          extensions: ['mp4', 'mov', 'avi', 'webm', 'png', 'jpg', 'jpeg', 'gif']
        }]
      });
      
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        addFiles(paths);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setFiles([]);
    setIsEditorOpen(false);
  };

  const handleStartEditing = () => {
    if (files.length > 0) {
      setSelectedIndex(0);
      setIsEditorOpen(true);
    }
  };

  const handleConvert = async (settings: any) => {
    if (files.length === 0) return;

    const outputPath = await save({
      title: 'Сохранить GIF как...',
      filters: [{ name: 'GIF', extensions: ['gif'] }],
      defaultPath: 'output.gif',
    });

    if (!outputPath) return;

    const lastSlash = outputPath.lastIndexOf('\\') !== -1 ? outputPath.lastIndexOf('\\') : outputPath.lastIndexOf('/');
    const outputDir = outputPath.substring(0, lastSlash);
    const outputName = outputPath.substring(lastSlash + 1);

    setIsConverting(true);

    try {
      await invoke('convert_all', {
        inputPaths: [files[selectedIndex]],
        outputDir: outputDir,
        customName: outputName,
        startTime: settings.startTime,
        duration: settings.duration,
        fps: settings.fps,
        resolution: settings.resolution,
        cropMode: settings.cropMode,
        cropLeft: settings.crop.x,
        cropRight: 1 - (settings.crop.x + settings.crop.w),
        cropTop: settings.crop.y,
        cropBottom: 1 - (settings.crop.y + settings.crop.h),
        rotation: settings.rotation,
        flip: settings.flip,
        colors: settings.colors,
        dithering: settings.dithering,
      });
    } catch (error) {
      await message(String(error), { title: 'Ошибка конвертации', kind: 'error' });
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertAll = async (settings: any) => {
    if (files.length === 0) return;

    const outputDir = await open({
      title: 'Выберите папку для сохранения',
      directory: true,
    });

    if (!outputDir) return;

    setIsConverting(true);

    try {
      await invoke('convert_all', {
        inputPaths: files,
        outputDir: outputDir,
        customName: null,
        startTime: settings.startTime,
        duration: settings.duration,
        fps: settings.fps,
        resolution: settings.resolution,
        cropMode: settings.cropMode,
        cropLeft: settings.crop.x,
        cropRight: 1 - (settings.crop.x + settings.crop.w),
        cropTop: settings.crop.y,
        cropBottom: 1 - (settings.crop.y + settings.crop.h),
        rotation: settings.rotation,
        flip: settings.flip,
        colors: settings.colors,
        dithering: settings.dithering,
      });
    } catch (error) {
      await message(String(error), { title: 'Ошибка конвертации', kind: 'error' });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="main-content">
      {isConverting && (
        <div className="global-overlay">
          <div className="progress-modal">
            <h2>Идет конвертация...</h2>
            <div className="spinner"></div>
          </div>
        </div>
      )}

      {!isEditorOpen ? (
        <div className="start-screen">
          {files.length === 0 ? (
            <DropZone onSelectFiles={handleSelectFiles} />
          ) : (
            <FileList 
              files={files} 
              onRemove={handleRemoveFile} 
              onSelectFiles={handleSelectFiles}
              onClearAll={handleClearAll}
            />
          )}
          {files.length > 0 && (
            <button className="primary start-edit-btn" onClick={handleStartEditing}>
              Перейти в редактор ({files.length})
            </button>
          )}
        </div>
      ) : (
        <Editor 
          files={files} 
          selectedIndex={selectedIndex} 
          onSelectFile={setSelectedIndex}
          onBack={() => setIsEditorOpen(false)}
          onConvert={handleConvert}
          onConvertAll={handleConvertAll}
          isConverting={isConverting}
        />
      )}
    </div>
  );
}

export default App;