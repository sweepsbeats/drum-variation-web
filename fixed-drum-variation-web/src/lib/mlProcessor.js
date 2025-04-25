// src/lib/mlProcessor.js
// Enhanced ML-inspired audio processing for drum sample variations

/**
 * MLProcessor class provides enhanced machine learning-inspired
 * audio processing techniques for drum sample variations
 * Now with improved support for both one-shots and drum loops
 */
export class MLProcessor {
  constructor() {
    this.audioContext = null;
  }

  /**
   * Initialize the audio context
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Generate ML-inspired variations of a drum sample
   * @param {AudioBuffer} buffer - Original audio buffer
   * @param {number} variationAmount - Amount of variation (0-1)
   * @param {Object} options - Additional options for variation generation
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async generateVariation(buffer, variationAmount = 0.5, options = {}) {
    this.initAudioContext();
    
    // Extract features from the original sample
    const features = this.extractFeatures(buffer);
    
    // Determine if this is likely a loop or one-shot based on features
    const isLoop = this.isLikelyLoop(features);
    
    // Modify features based on variation amount and options
    const modifiedFeatures = this.modifyFeatures(features, variationAmount, options, isLoop);
    
    // Synthesize new audio from modified features
    return this.synthesizeAudio(buffer, modifiedFeatures, isLoop);
  }

  /**
   * Determine if the audio is likely a loop or one-shot
   * @param {Object} features - Extracted features
   * @returns {boolean} - True if likely a loop, false if likely a one-shot
   */
  isLikelyLoop(features) {
    // If we have multiple significant peaks or long duration, it's likely a loop
    return features.significantPeaks.length > 3 || features.duration > 2.0;
  }

  /**
   * Extract audio features from buffer with enhanced detection for loops
   * @param {AudioBuffer} buffer - Audio buffer to analyze
   * @returns {Object} - Extracted features
   */
  extractFeatures(buffer) {
    // Get the first channel data
    const data = buffer.getChannelData(0);
    
    // Find all significant peaks (for loop detection and processing)
    const significantPeaks = this.findSignificantPeaks(data, buffer.sampleRate);
    
    // Find the main peak (attack)
    let peakIndex = 0;
    let peakValue = 0;
    for (let i = 0; i < data.length; i++) {
      const absValue = Math.abs(data[i]);
      if (absValue > peakValue) {
        peakValue = absValue;
        peakIndex = i;
      }
    }
    
    // Calculate attack time (time to reach peak)
    const attackTime = peakIndex / buffer.sampleRate;
    
    // Calculate decay time (time from peak to -12dB)
    let decayIndex = peakIndex;
    const decayThreshold = peakValue * 0.25; // -12dB is approximately 25% of peak
    for (let i = peakIndex; i < data.length; i++) {
      if (Math.abs(data[i]) < decayThreshold) {
        decayIndex = i;
        break;
      }
    }
    const decayTime = (decayIndex - peakIndex) / buffer.sampleRate;
    
    // Calculate sustain level (average amplitude during middle portion)
    let sustainLevel = 0;
    const sustainStart = Math.min(decayIndex, Math.floor(data.length * 0.3));
    const sustainEnd = Math.floor(data.length * 0.7);
    for (let i = sustainStart; i < sustainEnd && i < data.length; i++) {
      sustainLevel += Math.abs(data[i]);
    }
    sustainLevel /= (sustainEnd - sustainStart) || 1;
    
    // Calculate release time (final portion decay rate)
    const releaseStart = Math.floor(data.length * 0.7);
    let releaseTime = (data.length - releaseStart) / buffer.sampleRate;
    
    // Calculate total energy
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      energy += data[i] * data[i];
    }
    energy /= data.length;
    
    // Calculate spectral centroid (simplified)
    // In a real ML system, we would use FFT for spectral analysis
    // Here we use a simplified approach based on zero-crossings
    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || 
          (data[i] < 0 && data[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const spectralCentroid = zeroCrossings / data.length * buffer.sampleRate / 2;
    
    // Calculate dynamic range
    let min = 1.0;
    let max = -1.0;
    for (let i = 0; i < data.length; i++) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    const dynamicRange = max - min;
    
    // Calculate transient density (for loop detection)
    const transientDensity = significantPeaks.length / buffer.duration;
    
    return {
      attackTime,
      decayTime,
      sustainLevel,
      releaseTime,
      energy,
      spectralCentroid,
      peakValue,
      peakIndex,
      duration: buffer.duration,
      dynamicRange,
      transientDensity,
      significantPeaks
    };
  }

  /**
   * Find significant peaks in audio data (for loop processing)
   * @param {Float32Array} data - Audio data
   * @param {number} sampleRate - Sample rate
   * @returns {Array} - Array of peak indices
   */
  findSignificantPeaks(data, sampleRate) {
    const peaks = [];
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
    const threshold = 0.3; // Threshold for peak detection
    let maxValue = 0;
    
    // Find the maximum value for threshold calculation
    for (let i = 0; i < data.length; i++) {
      maxValue = Math.max(maxValue, Math.abs(data[i]));
    }
    
    // Find peaks
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const currentValue = Math.abs(data[i]);
      
      // Check if this is a local maximum and above threshold
      if (currentValue > maxValue * threshold) {
        let isPeak = true;
        
        // Check if it's a local maximum
        for (let j = i - windowSize; j < i + windowSize; j++) {
          if (j !== i && Math.abs(data[j]) > currentValue) {
            isPeak = false;
            break;
          }
        }
        
        if (isPeak) {
          peaks.push({
            index: i,
            value: currentValue,
            time: i / sampleRate
          });
          
          // Skip ahead to avoid detecting the same peak
          i += windowSize;
        }
      }
    }
    
    return peaks;
  }

  /**
   * Modify audio features based on variation amount and options
   * @param {Object} features - Original features
   * @param {number} amount - Variation amount (0-1)
   * @param {Object} options - Additional options for specific variation types
   * @param {boolean} isLoop - Whether the audio is a loop
   * @returns {Object} - Modified features
   */
  modifyFeatures(features, amount, options = {}, isLoop = false) {
    // Create a copy of the features
    const modified = { ...features };
    
    // Get variation focus from options or use default
    const focus = options.focus || 'balanced';
    
    // Apply random variations based on amount and focus
    const randomize = (value, range, focusFactor = 1.0) => {
      const variation = (Math.random() * 2 - 1) * range * amount * focusFactor;
      return value * (1 + variation);
    };
    
    // Modify attack time with focus factor
    const attackFocus = focus === 'attack' ? 2.0 : 1.0;
    modified.attackTime = randomize(features.attackTime, 0.7, attackFocus);
    
    // Modify decay time with focus factor
    const decayFocus = focus === 'decay' ? 2.0 : 1.0;
    modified.decayTime = randomize(features.decayTime, 0.8, decayFocus);
    
    // Modify sustain level with focus factor
    const sustainFocus = focus === 'sustain' ? 2.0 : 1.0;
    modified.sustainLevel = randomize(features.sustainLevel, 0.6, sustainFocus);
    
    // Modify release time with focus factor
    const releaseFocus = focus === 'release' ? 2.0 : 1.0;
    modified.releaseTime = randomize(features.releaseTime, 0.9, releaseFocus);
    
    // Modify spectral centroid (brightness/tone) with focus factor
    const toneFocus = focus === 'tone' ? 2.0 : 1.0;
    modified.spectralCentroid = randomize(features.spectralCentroid, 0.6, toneFocus);
    
    // Modify energy (volume) with less variation for loops
    const energyRange = isLoop ? 0.2 : 0.4;
    modified.energy = randomize(features.energy, energyRange);
    
    // For loops, modify the timing of peaks slightly
    if (isLoop && features.significantPeaks.length > 0) {
      modified.significantPeaks = features.significantPeaks.map(peak => {
        return {
          ...peak,
          index: Math.floor(randomize(peak.index, 0.02)),
          value: randomize(peak.value, 0.1)
        };
      });
    }
    
    return modified;
  }

  /**
   * Synthesize audio from modified features
   * @param {AudioBuffer} originalBuffer - Original audio buffer
   * @param {Object} features - Modified features
   * @param {boolean} isLoop - Whether the audio is a loop
   * @returns {AudioBuffer} - Synthesized audio buffer
   */
  async synthesizeAudio(originalBuffer, features, isLoop = false) {
    // Create a new buffer with the same length
    const newBuffer = this.audioContext.createBuffer(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );
    
    // Process each channel
    for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
      const inputData = originalBuffer.getChannelData(channel);
      const outputData = newBuffer.getChannelData(channel);
      
      if (isLoop) {
        // For loops, process each segment between peaks separately
        this.processLoopAudio(inputData, outputData, features);
      } else {
        // For one-shots, process the entire sample with ADSR envelope
        this.processOneShot(inputData, outputData, features);
      }
      
      // Apply energy adjustment (volume)
      const energyRatio = Math.sqrt(features.energy / (features.energy > 0 ? features.energy : 0.0001));
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] *= energyRatio;
      }
      
      // Apply spectral adjustment (simplified)
      // Higher spectral centroid = more high frequencies
      const spectralRatio = features.spectralCentroid / (features.spectralCentroid > 0 ? features.spectralCentroid : 0.0001);
      this.applySpectralAdjustment(outputData, spectralRatio);
    }
    
    return newBuffer;
  }

  /**
   * Process one-shot sample with ADSR envelope modifications
   * @param {Float32Array} inputData - Input audio data
   * @param {Float32Array} outputData - Output audio data
   * @param {Object} features - Modified features
   */
  processOneShot(inputData, outputData, features) {
    // Calculate key points in samples
    const attackEnd = Math.floor(features.attackTime * features.peakValue * inputData.length);
    const decayEnd = attackEnd + Math.floor(features.decayTime * inputData.length);
    const releaseStart = Math.floor(inputData.length * 0.7);
    
    // Process samples
    for (let i = 0; i < outputData.length; i++) {
      // Determine which part of the envelope we're in
      if (i < attackEnd) {
        // Attack phase - time stretch
        const originalIndex = Math.floor(i * features.peakIndex / attackEnd);
        outputData[i] = inputData[Math.min(originalIndex, inputData.length - 1)];
      } else if (i < decayEnd) {
        // Decay phase - time stretch
        const decayPosition = (i - attackEnd) / (decayEnd - attackEnd);
        const originalDecayIndex = Math.floor(features.peakIndex + decayPosition * (features.decayTime * inputData.length));
        outputData[i] = inputData[Math.min(originalDecayIndex, inputData.length - 1)];
      } else if (i < releaseStart) {
        // Sustain phase - adjust level
        outputData[i] = inputData[i] * (features.sustainLevel / 0.25);
      } else {
        // Release phase - adjust slope
        const releasePosition = (i - releaseStart) / (outputData.length - releaseStart);
        const releaseValue = 1.0 - releasePosition * (features.releaseTime / 0.3);
        outputData[i] = inputData[i] * Math.max(0, releaseValue);
      }
    }
  }

  /**
   * Process loop audio with per-segment modifications
   * @param {Float32Array} inputData - Input audio data
   * @param {Float32Array} outputData - Output audio data
   * @param {Object} features - Modified features
   */
  processLoopAudio(inputData, outputData, features) {
    // First, copy the original data
    for (let i = 0; i < inputData.length; i++) {
      outputData[i] = inputData[i];
    }
    
    // If we have significant peaks, process each segment
    if (features.significantPeaks && features.significantPeaks.length > 1) {
      const peaks = features.significantPeaks;
      
      // Process each segment between peaks
      for (let p = 0; p < peaks.length; p++) {
        const currentPeak = peaks[p];
        const nextPeak = peaks[p + 1] || { index: inputData.length };
        
        // Calculate segment boundaries
        const segmentStart = currentPeak.index;
        const segmentEnd = nextPeak.index;
        const segmentLength = segmentEnd - segmentStart;
        
        if (segmentLength < 10) continue; // Skip very short segments
        
        // Calculate envelope points for this segment
        const attackEnd = segmentStart + Math.floor(segmentLength * 0.1 * features.attackTime / 0.01);
        const decayEnd = segmentStart + Math.floor(segmentLength * 0.3);
        const releaseStart = segmentStart + Math.floor(segmentLength * 0.7);
        
        // Apply envelope modifications to this segment
        for (let i = segmentStart; i < segmentEnd && i < outputData.length; i++) {
          if (i < attackEnd) {
            // Attack phase - adjust slope
            const attackPosition = (i - segmentStart) / (attackEnd - segmentStart);
            const attackFactor = attackPosition * (2.0 - features.attackTime / 0.01);
            outputData[i] = inputData[i] * attackFactor;
          } else if (i < decayEnd) {
            // Decay phase - adjust slope
            const decayPosition = (i - attackEnd) / (decayEnd - attackEnd);
            const decayFactor = 1.0 - decayPosition * (1.0 - features.sustainLevel / 0.25) * (features.decayTime / 0.05);
            outputData[i] = inputData[i] * decayFactor;
          } else if (i < releaseStart) {
            // Sustain phase - adjust level
            outputData[i] = inputData[i] * (features.sustainLevel / 0.25);
          } else {
            // Release phase - adjust slope
            const releasePosition = (i - releaseStart) / (segmentEnd - releaseStart);
            const releaseValue = (features.sustainLevel / 0.25) * (1.0 - releasePosition * (features.releaseTime / 0.1));
            outputData[i] = inputData[i] * Math.max(0, releaseValue);
          }
        }
      }
    }
  }

  /**
   * Apply spectral adjustment to audio data
   * @param {Float32Array} data - Audio data to adjust
   * @param {number} spectralRatio - Spectral ratio for adjustment
   */
  applySpectralAdjustment(data, spectralRatio) {
    if (spectralRatio > 1) {
      // Boost high frequencies (simplified approach)
      for (let i = 1; i < data.length; i++) {
        // Add a bit of the difference to enhance high frequencies
        data[i] += (data[i] - data[i-1]) * (spectralRatio - 1) * 0.5;
      }
    } else if (spectralRatio < 1) {
      // Reduce high frequencies (simplified approach)
      let prevSample = data[0];
      for (let i = 1; i < data.length; i++) {
        // Simple one-pole low-pass filter
        data[i] = data[i] * spectralRatio + prevSample * (1 - spectralRatio);
        prevSample = data[i];
      }
    }
  }
}

export default MLProcessor;
