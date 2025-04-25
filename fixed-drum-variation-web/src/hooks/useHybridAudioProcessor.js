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
      
      // Variation 1: Subtle ML variation
      const mlVariation1 = await mlProcessorRef.current.generateVariation(
        originalSample, 
        0.2 * mlBalance
      );
      generatedVariations.push(mlVariation1);
      
      // Variation 2: DSP transient enhancement
      if (mlBalance < 0.8) {
        generatedVariations.push(
          await audioProcessorRef.current.processTransientEnhancement(originalSample, 1.2, 0.9)
        );
      } else {
        // More ML-focused variation if ML balance is high
        generatedVariations.push(
          await mlProcessorRef.current.generateVariation(originalSample, 0.3 * mlBalance)
        );
      }
      
      // Variation 3: Pitch shift with ML
      const pitchShifted = await audioProcessorRef.current.processPitchShift(originalSample, 2);
      if (mlBalance > 0.3) {
        // Apply ML processing to the pitch-shifted version if ML balance is significant
        generatedVariations.push(
          await mlProcessorRef.current.generateVariation(pitchShifted, 0.4 * mlBalance)
        );
      } else {
        generatedVariations.push(pitchShifted);
      }
      
      // Variation 4: ML medium variation
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(originalSample, 0.5 * mlBalance)
      );
      
      // Variation 5: DSP bit crush with ML
      const bitCrushed = await audioProcessorRef.current.processBitCrush(originalSample, 8);
      if (mlBalance > 0.4) {
        // Apply ML processing to the bit-crushed version if ML balance is significant
        generatedVariations.push(
          await mlProcessorRef.current.generateVariation(bitCrushed, 0.3 * mlBalance)
        );
      } else {
        generatedVariations.push(bitCrushed);
      }
      
      // Variation 6: ML stronger variation
      generatedVariations.push(
        await mlProcessorRef.current.generateVariation(originalSample, 0.7 * mlBalance)
      );
      
      // Variation 7: DSP reverb with ML
      const reverbed = await audioProcessorRef.current.processReverb(originalSample, 0.2, 0.5);
      if (mlBalance > 0.5) {
        // Apply ML processing to the reverbed version if ML balance is significant
        generatedVariations.push(
          await mlProcessorRef.current.generateVariation(reverbed, 0.4 * mlBalance)
        );
      } else {
        generatedVariations.push(reverbed);
      }
      
      // Variation 8: Extreme hybrid variation
      const distorted = await audioProcessorRef.current.processDistortion(originalSample, 5);
      const extreme = await mlProcessorRef.current.generateVariation(distorted, 0.9 * mlBalance);
      generatedVariations.push(extreme);
      
      setVariations(generatedVariations);
      
    } catch (err) {
      console.error('Error generating variations:', err);
      setError(err.message || 'Failed to generate variations');
    } finally {
      setIsProcessing(false);
    }
  }, [originalSample, mlBalance]);

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

