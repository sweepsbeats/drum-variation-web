'use client';

import React, { useState, useEffect } from 'react';
import useHybridAudioProcessor from '../hooks/useHybridAudioProcessor';
import DragAndDropHandler from '../components/DragAndDropHandler';
import VariationExporter from '../components/VariationExporter';
import WaveformDisplay from '../components/WaveformDisplay';

export default function DrumVariationApp() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  
  const {
    originalSample,
    variations,
    isProcessing,
    currentlyPlaying,
    error,
    mlBalance,
    loadAudioFile,
    generateVariations,
    playOriginal,
    playVariation,
    stopPlayback,
    exportVariation,
    setProcessingBalance
  } = useHybridAudioProcessor();

  // Handle file drop
  const handleFileDrop = async (file) => {
    if (file && file.type.startsWith('audio/')) {
      setFileName(file.name);
      await loadAudioFile(file);
    }
  };

  // Handle file input change
  const handleFileInputChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        setFileName(file.name);
        await loadAudioFile(file);
      }
    }
  };

  // Handle ML balance slider change
  const handleBalanceChange = (e) => {
    setProcessingBalance(parseFloat(e.target.value));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Drum Sample Variation Generator
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Upload a drum sample and generate unique variations in your browser
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) }

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left panel - Sample input */}
              <div className="md:col-span-1 flex flex-col gap-4">
                <DragAndDropHandler 
                  onFileDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-64 cursor-pointer transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                >
                  <input 
                    type="file" 
                    id="fileInput"
                    className="hidden" 
                    accept="audio/*" 
                    onChange={handleFileInputChange} 
                  />
                  <svg 
                    className="w-12 h-12 text-gray-400 mb-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-gray-600 text-center">
                    Drag & drop your drum sample here<br />or 
                    <label htmlFor="fileInput" className="text-blue-600 hover:text-blue-800 cursor-pointer ml-1">
                      browse to upload
                    </label>
                  </p>
                  {fileName && (
                    <p className="mt-2 text-sm font-medium text-blue-600">{fileName}</p>
                  ) }
                </DragAndDropHandler>
                
                <div className="flex flex-col gap-2">
                  <button
                    className={`py-2 px-4 rounded-md font-medium ${
                      originalSample && !isProcessing
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!originalSample || isProcessing}
                    onClick={generateVariations}
                  >
                    {isProcessing ? 'Processing...' : 'Generate Variations'}
                  </button>
                  
                  <button
                    className={`py-2 px-4 rounded-md font-medium ${
                      originalSample
                        ? currentlyPlaying === 'original'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!originalSample}
                    onClick={currentlyPlaying === 'original' ? stopPlayback : playOriginal}
                  >
                    {currentlyPlaying === 'original' ? 'Stop' : 'Play Original'}
                  </button>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Original Sample</h3>
                  <div className="border rounded-md p-2 bg-gray-50">
                    <WaveformDisplay 
                      audioBuffer={originalSample}
                      playing={currentlyPlaying === 'original'}
                      onPlaybackComplete={stopPlayback}
                    />
                  </div>
                </div>
                
                {/* ML/DSP Balance Slider */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Processing Balance</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">DSP</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mlBalance}
                      onChange={handleBalanceChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-500 ml-2">ML</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Adjust the balance between traditional DSP and ML-inspired processing
                  </p>
                </div>
              </div>
              
              {/* Right panel - Variations grid */}
              <div className="md:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Variations</h2>
                
                {variations.length === 0 ? (
                  <div className="border rounded-lg p-8 bg-gray-50 flex flex-col items-center justify-center h-96">
                    <p className="text-gray-500 text-center">
                      {originalSample 
                        ? 'Click "Generate Variations" to create drum variations'
                        : 'Load a drum sample to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {variations.map((variation, index) => (
                      <VariationExporter
                        key={index}
                        variation={variation}
                        index={index}
                        className={`border rounded-md p-3 ${currentlyPlaying === `variation-${index}` ? 'border-green-500 bg-green-50' : 'hover:border-blue-300'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Variation {index + 1}</h3>
                          <div className="flex gap-1">
                            <button
                              className={`p-1 rounded-full ${currentlyPlaying === `variation-${index}` ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                              onClick={() => currentlyPlaying === `variation-${index}` ? stopPlayback() : playVariation(index)}
                              title={currentlyPlaying === `variation-${index}` ? 'Stop' : 'Play'}
                            >
                              {currentlyPlaying === `variation-${index}` ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <rect x="6" y="4" width="4" height="16" />
                                  <rect x="14" y="4" width="4" height="16" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                            <button
                              className="p-1 rounded-full bg-blue-500 text-white"
                              onClick={() => exportVariation(index)}
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="h-16 bg-gray-50 rounded">
                          <WaveformDisplay 
                            audioBuffer={variation}
                            color="#4ade80"
                            playing={currentlyPlaying === `variation-${index}`}
                            onPlaybackComplete={stopPlayback}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">Drag to export</p>
                      </VariationExporter>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Drag variations directly into your DAW or other applications</p>
          <p className="mt-2">All processing happens in your browser - no server uploads required</p>
        </div>
      </div>
    </div>
  );
}

