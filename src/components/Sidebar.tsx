import { FileVideo, List, Settings } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const [active, setActive] = useState('converter');

  return (
    <div className="sidebar">
      <div 
        className={`sidebar-icon ${active === 'converter' ? 'active' : ''}`}
        onClick={() => setActive('converter')}
      >
        <FileVideo size={24} />
      </div>
      <div 
        className={`sidebar-icon ${active === 'queue' ? 'active' : ''}`}
        onClick={() => setActive('queue')}
      >
        <List size={24} />
      </div>
      <div className="sidebar-spacer" />
      <div 
        className={`sidebar-icon ${active === 'settings' ? 'active' : ''}`}
        onClick={() => setActive('settings')}
      >
        <Settings size={24} />
      </div>
    </div>
  );
}