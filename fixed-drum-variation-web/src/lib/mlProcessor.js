// src/lib/mlProcessor.js
// Simplified ML-inspired audio processing for drum sample variations

/**
 * MLProcessor class provides simplified machine learning-inspired
 * audio processing techniques for drum sample variations
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
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async generateVariation(buffer, variationAmount = 0.5) {
    this.initAudioContext();
    
    // Extract features from the original sample
    const features = this.extractFeatures(buffer);
    
    // Modify features based on variation amount
    const modifiedFeatures = this.modifyFeatures(features, variationAmount);
    
    // Synthesize new audio from modified features
    return this.synthesizeAudio(buffer, modifiedFeatures);
  }

  /**
   * Extract audio features from buffer
   * @param {AudioBuffer} buffer - Audio buffer to analyze
   * @returns {Object} - Extracted features
   */
  extractFeatures(buffer) {
    // Get the first channel data
    const data = buffer.getChannelData(0);
    
    // Find the peak (attack)
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
    
    return {
      attackTime,
      decayTime,
      energy,
      spectralCentroid,
      peakValue,
      peakIndex,
      duration: buffer.duration
    };
  }

  /**
   * Modify audio features based on variation amount
   * @param {Object} features - Original features
   * @param {number} amount - Variation amount (0-1)
   * @returns {Object} - Modified features
   */
  modifyFeatures(features, amount) {
    // Create a copy of the features
    const modified = { ...features };
    
    // Apply random variations based on amount
    const randomize = (value, range) => {
      const variation = (Math.random() * 2 - 1) * range * amount;
      return value * (1 + variation);
    };
    
    // Modify attack time (can be shorter or longer)
    modified.attackTime = randomize(features.attackTime, 0.5);
    
    // Modify decay time (can be shorter or longer)
    modified.decayTime = randomize(features.decayTime, 0.7);
    
    // Modify spectral centroid (brightness)
    modified.spectralCentroid = randomize(features.spectralCentroid, 0.4);
    
    // Modify energy (volume)
    modified.energy = randomize(features.energy, 0.3);
    
    return modified;
  }

  /**
   * Synthesize audio from modified features
   * @param {AudioBuffer} originalBuffer - Original audio buffer
   * @param {Object} features - Modified features
   * @returns {AudioBuffer} - Synthesized audio buffer
   */
  async synthesizeAudio(originalBuffer, features) {
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
      
      // Apply feature-based transformations
      
      // 1. Adjust attack (time stretching around the attack portion)
      const originalAttackSamples = Math.floor(features.peakIndex);
      const newAttackSamples = Math.floor(features.attackTime * originalBuffer.sampleRate);
      
      // 2. Adjust decay
      const originalDecaySamples = Math.floor(features.decayTime * originalBuffer.sampleRate);
      const newDecaySamples = Math.floor(features.decayTime * originalBuffer.sampleRate);
      
      // 3. Apply spectral shaping (simplified with a basic filter)
      // In a real ML system, we would use spectral modeling
      // Here we use a simplified approach
      
      // Copy and modify the sample data
      for (let i = 0; i < outputData.length; i++) {
        // Determine which part of the envelope we're in
        if (i < newAttackSamples) {
          // Attack phase - time stretch
          const originalIndex = Math.floor(i * originalAttackSamples / newAttackSamples);
          outputData[i] = inputData[Math.min(originalIndex, inputData.length - 1)];
        } else if (i < newAttackSamples + newDecaySamples) {
          // Decay phase - time stretch
          const decayPosition = (i - newAttackSamples) / newDecaySamples;
          const originalDecayIndex = Math.floor(features.peakIndex + decayPosition * originalDecaySamples);
          outputData[i] = inputData[Math.min(originalDecayIndex, inputData.length - 1)];
        } else {
          // Sustain/release phase - copy with potential shortening/lengthening
          const position = (i - newAttackSamples - newDecaySamples) / 
                          (outputData.length - newAttackSamples - newDecaySamples);
          const originalIndex = Math.floor(features.peakIndex + originalDecaySamples + 
                               position * (inputData.length - features.peakIndex - originalDecaySamples));
          outputData[i] = originalIndex < inputData.length ? inputData[originalIndex] : 0;
        }
      }
      
      // Apply energy adjustment (volume)
      // Fixed: Calculate energy ratio correctly
      const energyRatio = Math.sqrt(features.energy / (features.energy > 0 ? features.energy : 0.0001));
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] *= energyRatio;
      }
      
      // Apply spectral adjustment (simplified)
      // Higher spectral centroid = more high frequencies
      // Fixed: Calculate spectral ratio correctly
      const spectralRatio = features.spectralCentroid / (features.spectralCentroid > 0 ? features.spectralCentroid : 0.0001);
      if (spectralRatio > 1) {
        // Boost high frequencies (simplified approach)
        for (let i = 1; i < outputData.length; i++) {
          // Add a bit of the difference to enhance high frequencies
          outputData[i] += (outputData[i] - outputData[i-1]) * (spectralRatio - 1) * 0.5;
        }
      } else if (spectralRatio < 1) {
        // Reduce high frequencies (simplified approach)
        let prevSample = outputData[0];
        for (let i = 1; i < outputData.length; i++) {
          // Simple one-pole low-pass filter
          outputData[i] = outputData[i] * spectralRatio + prevSample * (1 - spectralRatio);
          prevSample = outputData[i];
        }
      }
    }
    
    return newBuffer;
  }
}

export default MLProcessor;
