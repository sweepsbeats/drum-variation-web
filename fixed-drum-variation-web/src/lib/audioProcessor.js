// src/lib/audioProcessor.js
// Enhanced audio processing functionality for drum sample variations

/**
 * AudioProcessor class handles all audio processing for drum sample variations
 * Now with improved support for both one-shots and drum loops
 */
export class AudioProcessor {
  constructor() {
    // Initialize audio context when needed (must be triggered by user interaction)
    this.audioContext = null;
    this.originalBuffer = null;
    this.variations = Array(8).fill(null);
    this.isProcessing = false;
  }

  /**
   * Initialize the audio context (must be called from a user interaction)
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Load an audio file and decode it
   * @param {File} file - The audio file to load
   * @returns {Promise<AudioBuffer>} - The decoded audio buffer
   */
  async loadAudioFile(file) {
    try {
      // Initialize audio context if not already done
      this.initAudioContext();
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Store the original buffer
      this.originalBuffer = audioBuffer;
      
      return audioBuffer;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }

  /**
   * Generate variations of the loaded drum sample
   * @param {boolean} isLoop - Whether the sample is a loop
   * @returns {Promise<AudioBuffer[]>} - Array of variation audio buffers
   */
  async generateVariations(isLoop = false) {
    if (!this.originalBuffer) {
      throw new Error('No audio sample loaded');
    }

    this.isProcessing = true;
    
    try {
      // Generate 8 variations with different processing techniques
      const variations = [];
      
      // Variation 1: Transient enhancement (adjusted for loops vs one-shots)
      variations.push(await this.processTransientEnhancement(
        this.originalBuffer, 
        isLoop ? 1.1 : 1.3, 
        isLoop ? 0.95 : 0.85
      ));
      
      // Variation 2: Pitch shift (more subtle for loops)
      variations.push(await this.processPitchShift(
        this.originalBuffer, 
        isLoop ? 1 : 3
      ));
      
      // Variation 3: Pitch shift down (more subtle for loops)
      variations.push(await this.processPitchShift(
        this.originalBuffer, 
        isLoop ? -1 : -3
      ));
      
      // Variation 4: Bit crush effect (less extreme for loops)
      variations.push(await this.processBitCrush(
        this.originalBuffer, 
        isLoop ? 10 : 8
      ));
      
      // Variation 5: Reverb (shorter for loops)
      variations.push(await this.processReverb(
        this.originalBuffer, 
        isLoop ? 0.1 : 0.3, 
        isLoop ? 0.3 : 0.5
      ));
      
      // Variation 6: Delay (tempo-synced for loops)
      variations.push(await this.processDelay(
        this.originalBuffer, 
        isLoop ? 0.125 : 0.25, 
        isLoop ? 0.3 : 0.4
      ));
      
      // Variation 7: Combined effects (pitch + reverb)
      const pitchShifted = await this.processPitchShift(this.originalBuffer, isLoop ? 0.5 : 1);
      variations.push(await this.processReverb(
        pitchShifted, 
        isLoop ? 0.05 : 0.1, 
        isLoop ? 0.2 : 0.3
      ));
      
      // Variation 8: Extreme variation (less extreme for loops)
      if (isLoop) {
        // For loops, use delay with moderate distortion
        const delayed = await this.processDelay(this.originalBuffer, 0.125, 0.3);
        variations.push(await this.processDistortion(delayed, 3));
      } else {
        // For one-shots, use heavy distortion with bit crushing
        const distorted = await this.processDistortion(this.originalBuffer, 10);
        variations.push(await this.processBitCrush(distorted, 6));
      }
      
      // Store variations
      this.variations = variations;
      
      return variations;
    } catch (error) {
      console.error('Error generating variations:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process audio with transient enhancement
   * @param {AudioBuffer} buffer - Input audio buffer
   * @param {number} attackGain - Attack gain multiplier
   * @param {number} sustainGain - Sustain gain multiplier
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async processTransientEnhancement(buffer, attackGain = 1.2, sustainGain = 0.9) {
    // Create a new buffer for the processed audio
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Process each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Determine if this is likely a loop based on length and content
      const isLikelyLoop = buffer.duration > 2.0;
      
      // Adjust envelope follower parameters based on content type
      const attackTime = isLikelyLoop ? 0.002 : 0.005; // 2ms for loops, 5ms for one-shots
      const releaseTime = isLikelyLoop ? 0.02 : 0.05; // 20ms for loops, 50ms for one-shots
      const attackSamples = Math.floor(attackTime * buffer.sampleRate);
      const releaseSamples = Math.floor(releaseTime * buffer.sampleRate);
      
      let envelope = 0;
      
      // Process samples
      for (let i = 0; i < inputData.length; i++) {
        const inputSample = Math.abs(inputData[i]);
        
        // Envelope follower
        if (inputSample > envelope) {
          envelope += (inputSample - envelope) / attackSamples;
        } else {
          envelope += (inputSample - envelope) / releaseSamples;
        }
        
        // Detect transients (when envelope is rising quickly)
        // Use a more sensitive threshold for loops
        const transientThreshold = isLikelyLoop ? 1.2 : 1.5;
        const isTransient = inputSample > envelope * transientThreshold;
        
        // Apply different gain for transients and sustain
        outputData[i] = inputData[i] * (isTransient ? attackGain : sustainGain);
      }
    }
    
    return processedBuffer;
  }

  /**
   * Process audio with pitch shifting
   * @param {AudioBuffer} buffer - Input audio buffer
   * @param {number} semitones - Number of semitones to shift
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async processPitchShift(buffer, semitones) {
    // Create a new buffer for the processed audio
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Calculate pitch ratio
    const pitchRatio = Math.pow(2, semitones / 12);
    
    // Process each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Simple resampling for pitch shifting
      for (let i = 0; i < outputData.length; i++) {
        const readIndex = i * pitchRatio;
        const readIndex1 = Math.floor(readIndex);
        const readIndex2 = readIndex1 + 1;
        const fraction = readIndex - readIndex1;
        
        // Linear interpolation
        if (readIndex2 < inputData.length) {
          outputData[i] = inputData[readIndex1] * (1 - fraction) + inputData[readIndex2] * fraction;
        } else if (readIndex1 < inputData.length) {
          outputData[i] = inputData[readIndex1];
        }
      }
    }
    
    return processedBuffer;
  }

  /**
   * Process audio with bit crushing effect
   * @param {AudioBuffer} buffer - Input audio buffer
   * @param {number} bits - Target bit depth
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async processBitCrush(buffer, bits = 8) {
    // Create a new buffer for the processed audio
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Calculate step size for bit reduction
    const steps = Math.pow(2, bits);
    
    // Process each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Apply bit reduction
      for (let i = 0; i < inputData.length; i++) {
        // Scale to 0-1 range
        const scaled = (inputData[i] + 1) / 2;
        
        // Apply bit reduction
        const quantized = Math.floor(scaled * steps) / steps;
        
        // Scale back to -1 to 1 range
        outputData[i] = quantized * 2 - 1;
      }
    }
    
    return processedBuffer;
  }

  /**
   * Process audio with distortion effect
   * @param {AudioBuffer} buffer - Input audio buffer
   * @param {number} amount - Distortion amount
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async processDistortion(buffer, amount = 5) {
    // Create a new buffer for the processed audio
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Process each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Apply distortion
      for (let i = 0; i < inputData.length; i++) {
        // Waveshaping distortion
        outputData[i] = Math.tanh(inputData[i] * amount);
      }
    }
    
    return processedBuffer;
  }

  /**
   * Process audio with reverb effect
   * @param {AudioBuffer} buffer - Input audio buffer
   * @param {number} roomSize - Size of the reverb (0-1)
   * @param {number} wetDry - Wet/dry mix (0-1)
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async processReverb(buffer, roomSize = 0.2, wetDry = 0.3) {
    // Determine if this is likely a loop based on duration
    const isLikelyLoop = buffer.duration > 2.0;
    
    // Create a new buffer for the processed audio
    // For loops, don't add as much extra time for reverb tail
    const extraTime = isLikelyLoop ? 0.5 : 1.0; // seconds
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length + Math.floor(buffer.sampleRate * extraTime),
      buffer.sampleRate
    );
    
    // Create a simple reverb impulse response
    const impulseLength = Math.floor(buffer.sampleRate * roomSize);
    const impulse = this.audioContext.createBuffer(
      2,
      impulseLength,
      buffer.sampleRate
    );
    
    // Fill impulse response with decaying noise
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const impulseData = impulse.getChannelData(channel);
      for (let i = 0; i < impulseLength; i++) {
        impulseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength * 0.5));
      }
    }
    
    // Process each channel with convolution
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Copy dry signal
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * (1 - wetDry);
      }
      
      // Add wet signal (simple convolution)
      const impulseData = impulse.getChannelData(channel % impulse.numberOfChannels);
      for (let i = 0; i < inputData.length; i++) {
        for (let j = 0; j < impulseLength && i + j < outputData.length; j++) {
          outputData[i + j] += inputData[i] * impulseData[j] * wetDry;
        }
      }
    }
    
    return processedBuffer;
  }

  /**
   * Process audio with delay effect
   * @param {AudioBuffer} buffer - Input audio buffer
   * @param {number} delayTime - Delay time in seconds
   * @param {number} feedback - Feedback amount (0-1)
   * @returns {Promise<AudioBuffer>} - Processed audio buffer
   */
  async processDelay(buffer, delayTime = 0.25, feedback = 0.3) {
    // Determine if this is likely a loop based on duration
    const isLikelyLoop = buffer.duration > 2.0;
    
    // Create a new buffer for the processed audio
    // For loops, don't add as much extra time for delay tail
    const extraTime = isLikelyLoop ? 0.5 : 1.0; // seconds
    const processedBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length + Math.floor(buffer.sampleRate * extraTime),
      buffer.sampleRate
    );
    
    // Calculate delay in samples
    const delaySamples = Math.floor(delayTime * buffer.sampleRate);
    
    // Process each channel
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Copy original signal
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i];
      }
      
      // Add delay taps
      let currentFeedback = feedback;
      
      // For loops, use fewer delay taps to avoid muddiness
      const maxTaps = isLikelyLoop ? 3 : 10;
      let tapCount = 0;
      
      while (currentFeedback > 0.01 && tapCount < maxTaps) { // Stop when feedback is very low or max taps reached
        for (let i = 0; i < inputData.length; i++) {
          const delayPos = i + delaySamples;
          if (delayPos < outputData.length) {
            outputData[delayPos] += inputData[i] * currentFeedback;
          }
        }
        currentFeedback *= feedback; // Reduce feedback for next tap
        tapCount++;
      }
    }
    
    return processedBuffer;
  }

  /**
   * Play an audio buffer
   * @param {AudioBuffer} buffer - The audio buffer to play
   * @returns {AudioBufferSourceNode} - The source node for controlling playback
   */
  playBuffer(buffer) {
    // Initialize audio context if not already done
    this.initAudioContext();
    
    // Create source node
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Connect to output
    source.connect(this.audioContext.destination);
    
    // Start playback
    source.start();
    
    return source;
  }

  /**
   * Export audio buffer as WAV file
   * @param {AudioBuffer} buffer - The audio buffer to export
   * @param {string} filename - The filename for the exported file
   */
  exportBuffer(buffer, filename) {
    // Create WAV file
    const wav = this.bufferToWav(buffer);
    
    // Create download link
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    // Create and trigger download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename || 'drum-variation.wav';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Convert AudioBuffer to WAV format
   * @param {AudioBuffer} buffer - The audio buffer to convert
   * @returns {ArrayBuffer} - WAV file as ArrayBuffer
   */
  bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    // Create buffer with WAV header
    const dataLength = buffer.length * blockAlign;
    const headerLength = 44;
    const wavBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(wavBuffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // "data" sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const offset = 44;
    const channelData = [];
    
    // Extract channel data
    for (let channel = 0; channel < numChannels; channel++) {
      channelData.push(buffer.getChannelData(channel));
    }
    
    // Interleave channel data and convert to 16-bit PCM
    let index = 0;
    const volume = 0.9; // Avoid clipping
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i])) * volume;
        const pcmSample = sample < 0 ? sample * 32768 : sample * 32767;
        view.setInt16(offset + index, pcmSample, true);
        index += 2;
      }
    }
    
    return wavBuffer;
  }

  /**
   * Helper function to write a string to a DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export default AudioProcessor;
