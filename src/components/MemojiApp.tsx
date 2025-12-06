'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FaceLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { useWebcam } from '@/hooks/useWebcam'
import { useFaceLandmarker } from '@/hooks/useFaceLandmarker'
import { usePoseLandmarker } from '@/hooks/usePoseLandmarker'
import { CameraPanel } from '@/components/CameraPanel'
import { AvatarPanel, AVATARS, AvatarKey, AvatarSettings, getDefaultSettings } from '@/components/AvatarPanel'
import { extractBlendshapes, BlendshapeData } from '@/lib/blendshapes'
import { extractPoseData, PoseData } from '@/lib/poseTracking'

export default function MemojiApp() {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>('avatar')
  const [blendshapes, setBlendshapes] = useState<BlendshapeData>({})
  const [headRotation, setHeadRotation] = useState({ x: 0, y: 0, z: 0 })
  const [poseData, setPoseData] = useState<PoseData | null>(null)
  const [fps, setFps] = useState(0)
  const [debugMode, setDebugMode] = useState(false) // Debug mode OFF by default
  const [bodyTrackingEnabled, setBodyTrackingEnabled] = useState(false) // Body tracking OFF - needs calibration
  const [showOverlay, setShowOverlay] = useState(false) // MediaPipe overlay toggle
  const [faceResult, setFaceResult] = useState<FaceLandmarkerResult | null>(null)
  const [poseResult, setPoseResult] = useState<PoseLandmarkerResult | null>(null)
  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>(() => getDefaultSettings('avatar'))
  const animationRef = useRef<number | null>(null)
  const fpsRef = useRef<number[]>([])
  const lastTimeRef = useRef<number>(performance.now())

  const { videoRef, isReady: webcamReady, error: webcamError, aspectRatio } = useWebcam()
  const { faceLandmarker, isLoading: landmarkerLoading, error: landmarkerError, detectFace } = useFaceLandmarker()
  const { poseLandmarker, isLoading: poseLoading, error: poseError, detectPose } = usePoseLandmarker()

  // Reset settings when avatar changes
  const handleAvatarChange = (newAvatar: AvatarKey) => {
    setSelectedAvatar(newAvatar)
    setAvatarSettings(getDefaultSettings(newAvatar))
  }

  // Face detection loop
  const runDetection = useCallback(() => {
    if (!videoRef.current || !faceLandmarker) {
      animationRef.current = requestAnimationFrame(runDetection)
      return
    }

    // Face detection
    const result = detectFace(videoRef.current)
    setFaceResult(result) // Store for overlay

    if (result) {
      // Extract blendshapes
      const shapes = extractBlendshapes(result.faceBlendshapes)
      setBlendshapes(shapes)

      // Extract head rotation from transformation matrix
      if (result.facialTransformationMatrixes?.[0]) {
        const matrix = result.facialTransformationMatrixes[0].data
        // Extract rotation from 4x4 transformation matrix
        // The matrix is column-major, so we need to extract Euler angles
        const m = matrix
        
        // Simplified extraction (assuming small rotations)
        const rotY = Math.atan2(m[8], m[10]) // Yaw
        const rotX = Math.atan2(-m[9], Math.sqrt(m[8] * m[8] + m[10] * m[10])) // Pitch
        const rotZ = Math.atan2(m[1], m[5]) // Roll

        setHeadRotation({
          x: rotX * 0.5, // Dampen the rotation
          y: -rotY * 0.5, // Mirror and dampen
          z: -rotZ * 0.3,
        })
      }
    }

    // Pose detection (if enabled and landmarker ready)
    if (bodyTrackingEnabled && poseLandmarker) {
      const poseRes = detectPose(videoRef.current)
      setPoseResult(poseRes) // Store for overlay
      if (poseRes) {
        const pose = extractPoseData(poseRes)
        setPoseData(pose)
      }
    } else {
      setPoseResult(null)
    }

    // Calculate FPS
    const now = performance.now()
    const delta = now - lastTimeRef.current
    lastTimeRef.current = now
    fpsRef.current.push(1000 / delta)
    if (fpsRef.current.length > 30) {
      fpsRef.current.shift()
    }
    const avgFps = fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length
    setFps(Math.round(avgFps))

    animationRef.current = requestAnimationFrame(runDetection)
  }, [faceLandmarker, detectFace, poseLandmarker, detectPose, bodyTrackingEnabled, videoRef])

  // Start detection when ready
  useEffect(() => {
    if (webcamReady && faceLandmarker) {
      animationRef.current = requestAnimationFrame(runDetection)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [webcamReady, faceLandmarker, runDetection])

  const isLoading = landmarkerLoading || poseLoading
  const error = webcamError || landmarkerError || poseError

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black p-4">
      {/* Header with controls */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">
          Memoji Clone
        </h1>

        <div className="flex items-center gap-4">
          {/* Debug mode toggle */}
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              debugMode 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎛️ Debug {debugMode ? 'ON' : 'OFF'}
          </button>

          {/* Body tracking toggle */}
          <button
            onClick={() => setBodyTrackingEnabled(!bodyTrackingEnabled)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              bodyTrackingEnabled 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🦴 Body {bodyTrackingEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Overlay toggle */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showOverlay 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            👁️ Overlay {showOverlay ? 'ON' : 'OFF'}
          </button>

          {/* Avatar selector dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="avatar-select" className="text-sm text-gray-400">
              Avatar:
            </label>
            <select
              id="avatar-select"
              value={selectedAvatar}
              onChange={(e) => handleAvatarChange(e.target.value as AvatarKey)}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
            >
              {Object.entries(AVATARS).map(([key, { name }]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* FPS counter */}
          <div className="text-sm text-gray-500">
            {fps} FPS
          </div>

          {/* Blink debug display */}
          <div className="text-sm text-gray-400 font-mono">
            L: {(blendshapes['eyeBlinkLeft'] ?? 0).toFixed(2)} | R: {(blendshapes['eyeBlinkRight'] ?? 0).toFixed(2)}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-sm text-yellow-500">Loading model...</span>
              </>
            ) : error ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-500">Error</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-500">Ready</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content - 2 equal panels */}
      <main className="flex-1 flex gap-4 min-h-0">
        {/* Camera Panel */}
        <CameraPanel
          ref={videoRef}
          aspectRatio={aspectRatio}
          isReady={webcamReady}
          error={webcamError}
          showOverlay={showOverlay}
          faceResult={faceResult}
          poseResult={poseResult}
        />

        {/* Avatar Panel */}
        <AvatarPanel
          selectedAvatar={selectedAvatar}
          blendshapes={blendshapes}
          headRotation={headRotation}
          poseData={poseData}
          settings={avatarSettings}
          onSettingsChange={setAvatarSettings}
          debugMode={debugMode}
        />
      </main>

      {/* Footer */}
      <footer className="mt-4 text-center text-xs text-gray-600">
        MediaPipe FaceLandmarker + PoseLandmarker + Three.js + Next.js
      </footer>
    </div>
  )
}
