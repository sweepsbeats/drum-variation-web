'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AudioProcessor from '../lib/audioProcessor';
import MLProcessor from '../lib/mlProcessor';

/**
 * Custom hook for using AudioProcessor with ML integration in React components
 * @returns {Object} Audio processing state and functions
 */
export function useHybridAudioProcessor() {
  // Create refs to hold the processor instances
  const audioProcessorRef = useRef(null);
  const mlProcessorRef = useRef(null);
  
  // State for tracking audio processing
  const [originalSample, setOriginalSample] = useState(null);
  const [variations, setVariations] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playbackSource, setPlaybackSource] = useState(null);
  const [error, setError] = useState(null);
  const [mlBalance, setMlBalance] = useState(0.5); // 0 = all DSP, 1 = all ML
  const [isLoop, setIsLoop] = useState(false); // Track if current sample is a loop

  // Initialize the processors
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor();
    mlProcessorRef.current = new MLProcessor();
    
    // Clean up function
    return () => {
      // Stop any playing audio when component unmounts
      if (playbackSource) {
        playbackSource.stop();
      }
    };
  }, []);

  /**
   * Set the balance between DSP and ML processing
   * @param {number} balance - Balance value (0-1)
   */
  const setProcessingBalance = useCallback((balance) => {
    setMlBalance(Math.max(0, Math.min(1, balance)));
  }, []);

  /**
   * Load an audio file
   * @param {File} file - The audio file to load
   */
  const loadAudioFile = useCallback(async (file) => {
    if (!file) return;
    
    try {
      setError(null);
      setIsProcessing(true);
      
      // Check if file is an audio file
      if (!file.type.startsWith('audio/')) {
        throw new Error('File is not an audio file');
      }
      
      // Load the audio file
      const buffer = await audioProcessorRef.current.loadAudioFile(file);
      setOriginalSample(buffer);
      
      // Detect if this is likely a loop
      const features = await mlProcessorRef.current.extractFeatures(buffer);
      const detectedIsLoop = mlProcessorRef.current.isLikelyLoop(features);
      setIsLoop(detectedIsLoop);
      
      console.log(`Loaded audio file: ${file.name}, duration: ${buffer.duration.toFixed(2)}s, detected as ${detectedIsLoop ? 'loop' : 'one-shot'}`);
      
      // Reset variations when loading a new sample
      setVariations([]);
      
    } catch (err) {
      console.error('Error loading audio file:', err);
      setError(err.message || 'Failed to load audio file');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Generate variations of the loaded sample using a hybrid approach
   */
  const generateVariations = useCallback(async () => {
    if (!originalSample) {
      setError('No sample loaded');
      return;
    }
    
    try {
      setError(null);
      setIsProcessing(true);
      
      // Generate variations using both approaches
      const generatedVariations = [];
      
      // Variation 1: Attack-focused variation
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          originalSample, 
          0.6 * mlBalance,
          { focus: 'attack' }
        )
      );
      
      // Variation 2: Decay-focused variation
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          originalSample, 
          0.7 * mlBalance,
          { focus: 'decay' }
        )
      );
      
      // Variation 3: Sustain-focused variation
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          originalSample, 
          0.65 * mlBalance,
          { focus: 'sustain' }
        )
      );
      
      // Variation 4: Release-focused variation
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          originalSample, 
          0.7 * mlBalance,
          { focus: 'release' }
        )
      );
      
      // Variation 5: Tone-focused variation (brighter)
      const toneVariation = await mlProcessorRef.current.generateVariation(
        originalSample, 
        0.8 * mlBalance,
        { focus: 'tone' }
      );
      
      // Apply additional DSP processing based on ML balance
      if (mlBalance < 0.7) {
        // Add bit crushing for more tonal variation
        generatedVariations.push(
          await audioProcessorRef.current.processBitCrush(toneVariation, 10)
        );
      } else {
        generatedVariations.push(toneVariation);
      }
      
      // Variation 6: Pitch-shifted variation with envelope modifications
      const pitchShifted = await audioProcessorRef.current.processPitchShift(originalSample, isLoop ? 1 : 3);
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          pitchShifted, 
          0.5 * mlBalance,
          { focus: 'balanced' }
        )
      );
      
      // Variation 7: Reverb with dynamic envelope
      const reverbed = await audioProcessorRef.current.processReverb(
        originalSample, 
        isLoop ? 0.1 : 0.3, 
        isLoop ? 0.3 : 0.6
      );
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          reverbed, 
          0.4 * mlBalance,
          { focus: isLoop ? 'sustain' : 'release' }
        )
      );
      
      // Variation 8: Extreme hybrid variation
      let extreme;
      if (isLoop) {
        // For loops, use delay effect with moderate distortion
        const delayed = await audioProcessorRef.current.processDelay(originalSample, 0.125, 0.3);
        extreme = await audioProcessorRef.current.processDistortion(delayed, 3);
      } else {
        // For one-shots, use heavy distortion with bit crushing
        const distorted = await audioProcessorRef.current.processDistortion(originalSample, 8);
        extreme = await audioProcessorRef.current.processBitCrush(distorted, 6);
      }
      
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(
          extreme, 
          0.9 * mlBalance,
          { focus: 'balanced' }
        )
      );
      
      setVariations(generatedVariations);
      
    } catch (err) {
      console.error('Error generating variations:', err);
      setError(err.message || 'Failed to generate variations');
    } finally {
      setIsProcessing(false);
    }
  }, [originalSample, mlBalance, isLoop]);

  /**
   * Play an audio buffer
   * @param {AudioBuffer} buffer - The audio buffer to play
   * @param {string} id - Identifier for the currently playing buffer
   */
  const playBuffer = useCallback((buffer, id) => {
    // Stop any currently playing audio
    if (playbackSource) {
      playbackSource.stop();
      setPlaybackSource(null);
    }
    
    // If we're clicking the same buffer that's already playing, just stop it
    if (currentlyPlaying === id) {
      setCurrentlyPlaying(null);
      return;
    }
    
    try {
      // Play the buffer
      const source = audioProcessorRef.current.playBuffer(buffer);
      setPlaybackSource(source);
      setCurrentlyPlaying(id);
      
      // When playback ends, clear the currently playing state
      source.onended = () => {
        setCurrentlyPlaying(null);
        setPlaybackSource(null);
      };
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(err.message || 'Failed to play audio');
    }
  }, [currentlyPlaying, playbackSource]);

  /**
   * Play the original sample
   */
  const playOriginal = useCallback(() => {
    if (originalSample) {
      playBuffer(originalSample, 'original');
    }
  }, [originalSample, playBuffer]);

  /**
   * Play a specific variation
   * @param {number} index - Index of the variation to play
   */
  const playVariation = useCallback((index) => {
    if (variations && variations[index]) {
      playBuffer(variations[index], `variation-${index}`);
    }
  }, [variations, playBuffer]);

  /**
   * Stop any currently playing audio
   */
  const stopPlayback = useCallback(() => {
    if (playbackSource) {
      playbackSource.stop();
      setPlaybackSource(null);
      setCurrentlyPlaying(null);
    }
  }, [playbackSource]);

  /**
   * Export a variation as a WAV file
   * @param {number} index - Index of the variation to export
   * @param {string} filename - Filename for the exported file
   */
  const exportVariation = useCallback((index, filename) => {
    if (variations && variations[index]) {
      try {
        audioProcessorRef.current.exportBuffer(
          variations[index], 
          filename || `drum-variation-${index + 1}.wav`
        );
      } catch (err) {
        console.error('Error exporting variation:', err);
        setError(err.message || 'Failed to export variation');
      }
    }
  }, [variations]);

  /**
   * Export the original sample as a WAV file
   * @param {string} filename - Filename for the exported file
   */
  const exportOriginal = useCallback((filename) => {
    if (originalSample) {
      try {
        audioProcessorRef.current.exportBuffer(
          originalSample, 
          filename || 'original-sample.wav'
        );
      } catch (err) {
        console.error('Error exporting original sample:', err);
        setError(err.message || 'Failed to export original sample');
      }
    }
  }, [originalSample]);

  return {
    // State
    originalSample,
    variations,
    isProcessing,
    currentlyPlaying,
    error,
    mlBalance,
    isLoop,
    
    // Functions
    loadAudioFile,
    generateVariations,
    playOriginal,
    playVariation,
    stopPlayback,
    exportVariation,
    exportOriginal,
    setProcessingBalance,
    
    // Raw processor access (for advanced usage)
    audioProcessor: audioProcessorRef.current,
    mlProcessor: mlProcessorRef.current
  };
}

export default useHybridAudioProcessor;
