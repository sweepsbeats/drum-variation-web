// src/lib/waveformVisualizer.js
// Waveform visualization for audio samples and variations

/**
 * WaveformVisualizer class for rendering audio waveforms on canvas
 */
export class WaveformVisualizer {
  /**
   * Create a new waveform visualizer
   * @param {HTMLCanvasElement} canvas - The canvas element to draw on
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buffer = null;
    this.color = '#4a9eff';
    this.backgroundColor = 'rgba(30, 30, 30, 0.2)';
    this.waveformData = null;
    this.isPlaying = false;
    this.playbackPosition = 0;
  }

  /**
   * Set the audio buffer to visualize
   * @param {AudioBuffer} buffer - The audio buffer to visualize
   */
  setBuffer(buffer) {
    this.buffer = buffer;
    this.generateWaveformData();
    this.draw();
  }

  /**
   * Set the color of the waveform
   * @param {string} color - CSS color string
   */
  setColor(color) {
    this.color = color;
    if (this.waveformData) {
      this.draw();
    }
  }

  /**
   * Set the background color
   * @param {string} color - CSS color string
   */
  setBackgroundColor(color) {
    this.backgroundColor = color;
    if (this.waveformData) {
      this.draw();
    }
  }

  /**
   * Generate waveform data from audio buffer
   */
  generateWaveformData() {
    if (!this.buffer) return;

    // Get the first channel data (mono or left channel)
    const channelData = this.buffer.getChannelData(0);
    const numSamples = this.canvas.width;
    
    // Calculate how many audio samples we need to combine for each pixel
    const samplesPerPixel = Math.floor(channelData.length / numSamples);
    
    // Create arrays for min and max values at each pixel
    this.waveformData = {
      min: new Float32Array(numSamples),
      max: new Float32Array(numSamples)
    };
    
    // For each pixel, find the min and max values
    for (let i = 0; i < numSamples; i++) {
      const startSample = i * samplesPerPixel;
      let min = 0;
      let max = 0;
      
      // Find min and max in this pixel's samples
      for (let j = 0; j < samplesPerPixel && startSample + j < channelData.length; j++) {
        const sample = channelData[startSample + j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      this.waveformData.min[i] = min;
      this.waveformData.max[i] = max;
    }
  }

  /**
   * Draw the waveform on the canvas
   */
  draw() {
    if (!this.waveformData) return;
    
    // Clear the canvas
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set up drawing style
    this.ctx.fillStyle = this.color;
    
    // Calculate the vertical center of the canvas
    const center = this.canvas.height / 2;
    
    // Draw the waveform
    for (let i = 0; i < this.waveformData.min.length; i++) {
      // Calculate height for min and max values
      const minHeight = this.waveformData.min[i] * center;
      const maxHeight = this.waveformData.max[i] * center;
      
      // Draw from min to max (a vertical line for each pixel)
      this.ctx.fillRect(i, center + minHeight, 1, maxHeight - minHeight);
    }
    
    // Draw playback position if playing
    if (this.isPlaying) {
      this.drawPlaybackPosition();
    }
  }

  /**
   * Draw the current playback position
   */
  drawPlaybackPosition() {
    if (!this.buffer) return;
    
    // Calculate x position based on playback position
    const x = Math.floor((this.playbackPosition / this.buffer.duration) * this.canvas.width);
    
    // Draw a vertical line at the playback position
    this.ctx.strokeStyle = '#ff4a4a';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.stroke();
  }

  /**
   * Update the playback position
   * @param {number} position - Current playback position in seconds
   */
  updatePlaybackPosition(position) {
    this.playbackPosition = position;
    this.isPlaying = true;
    this.draw();
  }

  /**
   * Stop playback visualization
   */
  stopPlayback() {
    this.isPlaying = false;
    this.draw();
  }

  /**
   * Resize the canvas to match its display size
   */
  resize() {
    // Get the display size of the canvas
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    
    // Check if the canvas is not the same size
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      // Make the canvas the same size
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      
      // Regenerate waveform data and redraw
      if (this.buffer) {
        this.generateWaveformData();
        this.draw();
      }
    }
  }
}

export default WaveformVisualizer;

