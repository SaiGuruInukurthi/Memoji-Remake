'use client'

import { forwardRef } from 'react'

interface CameraPanelProps {
  aspectRatio: number
  isReady: boolean
  error: string | null
}

export const CameraPanel = forwardRef<HTMLVideoElement, CameraPanelProps>(
  function CameraPanel({ aspectRatio, isReady, error }, ref) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 rounded-xl overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-10">
              <div className="text-center p-4">
                <p className="text-red-300 text-lg font-semibold">Camera Error</p>
                <p className="text-red-200 text-sm mt-2">{error}</p>
              </div>
            </div>
          )}

          {!isReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
                <p className="text-gray-300">Initializing camera...</p>
              </div>
            </div>
          )}

          <div
            className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
            style={{
              aspectRatio: aspectRatio,
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
            }}
          >
            <video
              ref={ref}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
              style={{ aspectRatio: aspectRatio }}
            />

            {/* Overlay frame */}
            <div className="absolute inset-0 border-2 border-blue-500/30 rounded-lg pointer-events-none" />
            
            {/* Face guide circle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-2 border-white/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="w-full px-4 py-2 bg-gray-800/50 flex items-center justify-between">
          <span className="text-sm text-gray-400">Camera Input</span>
          <span className={`text-sm ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
            {isReady ? '● Live' : '○ Connecting...'}
          </span>
        </div>
      </div>
    )
  }
)
