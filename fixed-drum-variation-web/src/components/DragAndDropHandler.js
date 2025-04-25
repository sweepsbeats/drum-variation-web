'use client';

import React, { useRef, useEffect } from 'react';

export default function DragAndDropHandler({ onFileDrop, children, className }) {
  const dropZoneRef = useRef(null);

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    // Prevent default behavior for all drag events
    const preventDefault = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Handle the drop event
    const handleDrop = (e) => {
      preventDefault(e);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        // Filter for audio files
        const audioFiles = files.filter(file => file.type.startsWith('audio/'));
        
        if (audioFiles.length > 0) {
          onFileDrop(audioFiles[0]); // Pass the first audio file to the handler
        }
      }
    };

    // Add event listeners
    dropZone.addEventListener('dragenter', preventDefault);
    dropZone.addEventListener('dragover', preventDefault);
    dropZone.addEventListener('dragleave', preventDefault);
    dropZone.addEventListener('drop', handleDrop);

    // Clean up
    return () => {
      dropZone.removeEventListener('dragenter', preventDefault);
      dropZone.removeEventListener('dragover', preventDefault);
      dropZone.removeEventListener('dragleave', preventDefault);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [onFileDrop]);

  return (
    <div ref={dropZoneRef} className={className}>
      {children}
    </div>
  );
}

