'use client';

import React, { useRef, useEffect, useState } from 'react';

export default function WaveformDisplay({ audioBuffer, color = '#4a9eff', height = 100, playing = false, onPlaybackComplete }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(playing);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // Draw waveform when buffer changes
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get audio data (first channel)
    const audioData = audioBuffer.getChannelData(0);
    const step = Math.ceil(audioData.length / width);
    const amp = height / 2;
    
    // Draw waveform
    ctx.fillStyle = color;
    
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = audioData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
  }, [audioBuffer, color, height]);
  
  // Handle playback animation
  useEffect(() => {
    if (!audioBuffer) return;
    
    if (playing && !isPlaying) {
      // Start playback animation
      setIsPlaying(true);
      startTimeRef.current = Date.now();
      
      const animate = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const position = elapsed / audioBuffer.duration;
        
        if (position >= 1) {
          // Playback complete
          setIsPlaying(false);
          setPlaybackPosition(0);
          if (onPlaybackComplete) onPlaybackComplete();
        } else {
          setPlaybackPosition(position);
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (!playing && isPlaying) {
      // Stop playback animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsPlaying(false);
      setPlaybackPosition(0);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playing, isPlaying, audioBuffer, onPlaybackComplete]);
  
  // Draw playback position
  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Redraw waveform
    if (audioBuffer) {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, height);
      
      // Get audio data (first channel)
      const audioData = audioBuffer.getChannelData(0);
      const step = Math.ceil(audioData.length / canvas.width);
      const amp = height / 2;
      
      // Draw waveform
      ctx.fillStyle = color;
      
      for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        for (let j = 0; j < step; j++) {
          const datum = audioData[(i * step) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
      }
      
      // Draw playback position
      const x = Math.floor(playbackPosition * canvas.width);
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(x, 0, 2, height);
    }
  }, [playbackPosition, isPlaying, audioBuffer, color, height]);
  
  // Handle canvas resize
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = height;
      
      // Redraw waveform
      if (audioBuffer) {
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, height);
        
        // Get audio data (first channel)
        const audioData = audioBuffer.getChannelData(0);
        const step = Math.ceil(audioData.length / canvas.width);
        const amp = height / 2;
        
        // Draw waveform
        ctx.fillStyle = color;
        
        for (let i = 0; i < canvas.width; i++) {
          let min = 1.0;
          let max = -1.0;
          
          for (let j = 0; j < step; j++) {
            const datum = audioData[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          
          ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
        
        // Draw playback position if playing
        if (isPlaying) {
          const x = Math.floor(playbackPosition * canvas.width);
          ctx.fillStyle = '#ff4a4a';
          ctx.fillRect(x, 0, 2, height);
        }
      }
    });
    
    resizeObserver.observe(parent);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [audioBuffer, color, height, isPlaying, playbackPosition]);
  
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <canvas 
        ref={canvasRef} 
        width="300" 
        height={height} 
        className="w-full h-full"
      />
    </div>
  );
}

