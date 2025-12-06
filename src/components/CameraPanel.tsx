'use client'

import { forwardRef, useRef, useEffect } from 'react'
import { FaceLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision'

// Face mesh connections for drawing (simplified - key contours only)
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10]
const LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362]
const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33]
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61]
const LEFT_EYEBROW = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336]
const RIGHT_EYEBROW = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107]
const NOSE_BRIDGE = [168, 6, 197, 195, 5]

// Pose connections (upper body)
const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], // left shoulder to elbow
  [13, 15], // left elbow to wrist
  [12, 14], // right shoulder to elbow
  [14, 16], // right elbow to wrist
  [15, 17], // left wrist to pinky
  [15, 19], // left wrist to index
  [15, 21], // left wrist to thumb
  [16, 18], // right wrist to pinky
  [16, 20], // right wrist to index
  [16, 22], // right wrist to thumb
  [11, 23], // left shoulder to hip
  [12, 24], // right shoulder to hip
  [23, 24], // hips
]

interface CameraPanelProps {
  aspectRatio: number
  isReady: boolean
  error: string | null
  showOverlay?: boolean
  faceResult?: FaceLandmarkerResult | null
  poseResult?: PoseLandmarkerResult | null
}

export const CameraPanel = forwardRef<HTMLVideoElement, CameraPanelProps>(
  function CameraPanel({ aspectRatio, isReady, error, showOverlay = false, faceResult, poseResult }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Draw overlay when results change
    useEffect(() => {
      if (!showOverlay || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw face landmarks
      if (faceResult?.faceLandmarks?.[0]) {
        const landmarks = faceResult.faceLandmarks[0]
        
        // Helper to draw connected path
        const drawPath = (indices: number[], color: string, lineWidth: number = 2) => {
          ctx.strokeStyle = color
          ctx.lineWidth = lineWidth
          ctx.beginPath()
          
          for (let i = 0; i < indices.length; i++) {
            const lm = landmarks[indices[i]]
            if (!lm) continue
            // Mirror X since video is mirrored
            const x = (1 - lm.x) * canvas.width
            const y = lm.y * canvas.height
            
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
        }

        // Draw face contours
        drawPath(FACE_OVAL, '#00ff88', 2)
        drawPath(LEFT_EYE, '#00ffff', 2)
        drawPath(RIGHT_EYE, '#00ffff', 2)
        drawPath(LIPS_OUTER, '#ff6b6b', 2)
        drawPath(LEFT_EYEBROW, '#ffff00', 2)
        drawPath(RIGHT_EYEBROW, '#ffff00', 2)
        drawPath(NOSE_BRIDGE, '#ff88ff', 2)

        // Draw key landmark points
        const keyPoints = [1, 33, 263, 61, 291, 199] // nose tip, eyes, mouth corners
        ctx.fillStyle = '#ffffff'
        for (const idx of keyPoints) {
          const lm = landmarks[idx]
          if (!lm) continue
          const x = (1 - lm.x) * canvas.width
          const y = lm.y * canvas.height
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw pose landmarks
      if (poseResult?.landmarks?.[0]) {
        const landmarks = poseResult.landmarks[0]
        
        // Draw connections
        ctx.strokeStyle = '#ff00ff'
        ctx.lineWidth = 3
        
        for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
          const start = landmarks[startIdx]
          const end = landmarks[endIdx]
          if (!start || !end) continue
          
          // Mirror X
          const x1 = (1 - start.x) * canvas.width
          const y1 = start.y * canvas.height
          const x2 = (1 - end.x) * canvas.width
          const y2 = end.y * canvas.height
          
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
        
        // Draw pose landmark points (upper body only: 0-24)
        for (let i = 0; i <= 24; i++) {
          const lm = landmarks[i]
          if (!lm) continue
          
          const x = (1 - lm.x) * canvas.width
          const y = lm.y * canvas.height
          const visibility = lm.visibility ?? 1
          
          if (visibility > 0.5) {
            // Color based on landmark type
            if (i <= 10) {
              ctx.fillStyle = '#00ff88' // Face
            } else if (i <= 16) {
              ctx.fillStyle = '#ff00ff' // Arms
            } else if (i <= 22) {
              ctx.fillStyle = '#ffff00' // Hands
            } else {
              ctx.fillStyle = '#00ffff' // Hips
            }
            
            ctx.beginPath()
            ctx.arc(x, y, 5, 0, Math.PI * 2)
            ctx.fill()
            
            // White border
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
    }, [showOverlay, faceResult, poseResult])

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

            {/* MediaPipe overlay canvas */}
            {showOverlay && (
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            )}

            {/* Overlay frame */}
            <div className="absolute inset-0 border-2 border-blue-500/30 rounded-lg pointer-events-none" />
            
            {/* Face guide circle - hide when overlay is on */}
            {!showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-64 border-2 border-white/20 rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="w-full px-4 py-2 bg-gray-800/50 flex items-center justify-between">
          <span className="text-sm text-gray-400">Camera Input</span>
          <div className="flex items-center gap-3">
            {showOverlay && (
              <span className="text-sm text-cyan-400">● Overlay</span>
            )}
            <span className={`text-sm ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
              {isReady ? '● Live' : '○ Connecting...'}
            </span>
          </div>
        </div>
      </div>
    )
  }
)
