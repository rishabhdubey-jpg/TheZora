"use client";

import { useEffect } from 'react';

export default function ProtectionLayer() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard.writeText(''); 
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); }
      
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault();
      }
    };

    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); };
    const handleDragStart = (e: DragEvent) => { e.preventDefault(); };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}
