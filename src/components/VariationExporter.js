'use client';

import React, { useRef } from 'react';
import useHybridAudioProcessor from '../hooks/useHybridAudioProcessor';

export default function VariationExporter({ variation, index, children, className, onExport }) {
  const { exportVariation } = useHybridAudioProcessor();
  const containerRef = useRef(null);
  
  // Handle drag start
  const handleDragStart = (e) => {
    if (!variation) return;
    
    // Create a temporary filename for the variation
    const filename = `drum-variation-${index + 1}.wav`;
    
    // Export the variation to a temporary file
    try {
      // Set drag image (optional)
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        e.dataTransfer.setDragImage(
          containerRef.current,
          e.clientX - rect.left,
          e.clientY - rect.top
        );
      }
      
      // Set data for drag operation
      e.dataTransfer.setData('text/plain', filename);
      e.dataTransfer.effectAllowed = 'copy';
      
      // Trigger export
      if (onExport) {
        onExport(index, filename);
      } else {
        exportVariation(index, filename);
      }
    } catch (err) {
      console.error('Error starting drag operation:', err);
    }
  };
  
  return (
    <div
      ref={containerRef}
      className={className}
      draggable={!!variation}
      onDragStart={handleDragStart}
    >
      {children}
    </div>
  );
}

