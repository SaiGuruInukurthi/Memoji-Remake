'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision'

// Smoothing factor for pose landmarks (0 = no smoothing, 1 = infinite smoothing)
const POSE_SMOOTHING = 0.6
// Minimum visibility threshold for landmarks
const MIN_VISIBILITY = 0.5
// Number of frames to keep showing last valid pose
const POSE_HOLD_FRAMES = 10

export function usePoseLandmarker() {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastVideoTimeRef = useRef<number>(-1)
  const smoothedLandmarksRef = useRef<NormalizedLandmark[] | null>(null)
  const framesSinceValidPoseRef = useRef<number>(0)
  const lastValidResultRef = useRef<PoseLandmarkerResult | null>(null)

  useEffect(() => {
    let mounted = true

    const initPoseLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })

        if (mounted) {
          setPoseLandmarker(landmarker)
          setIsLoading(false)
          console.log('PoseLandmarker initialized successfully')
        }
      } catch (err) {
        console.error('Failed to initialize PoseLandmarker:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize pose detection')
          setIsLoading(false)
        }
      }
    }

    initPoseLandmarker()

    return () => {
      mounted = false
    }
  }, [])

  const detectPose = useCallback(
    (video: HTMLVideoElement): PoseLandmarkerResult | null => {
      if (!poseLandmarker || video.currentTime === lastVideoTimeRef.current) {
        // Return last valid result if we're within hold frames
        if (framesSinceValidPoseRef.current < POSE_HOLD_FRAMES && lastValidResultRef.current) {
          framesSinceValidPoseRef.current++
          return lastValidResultRef.current
        }
        return null
      }

      lastVideoTimeRef.current = video.currentTime
      const timestamp = performance.now()

      try {
        const result = poseLandmarker.detectForVideo(video, timestamp)
        
        // Check if we got valid landmarks
        if (!result.landmarks || result.landmarks.length === 0) {
          framesSinceValidPoseRef.current++
          if (framesSinceValidPoseRef.current < POSE_HOLD_FRAMES && lastValidResultRef.current) {
            return lastValidResultRef.current
          }
          return null
        }

        const newLandmarks = result.landmarks[0]
        
        // Check visibility of key landmarks (shoulders)
        const leftShoulder = newLandmarks[11]
        const rightShoulder = newLandmarks[12]
        if ((!leftShoulder || (leftShoulder.visibility ?? 0) < MIN_VISIBILITY) &&
            (!rightShoulder || (rightShoulder.visibility ?? 0) < MIN_VISIBILITY)) {
          framesSinceValidPoseRef.current++
          if (framesSinceValidPoseRef.current < POSE_HOLD_FRAMES && lastValidResultRef.current) {
            return lastValidResultRef.current
          }
          return null
        }

        // Apply smoothing
        if (smoothedLandmarksRef.current) {
          const smoothed: NormalizedLandmark[] = newLandmarks.map((lm, i) => {
            const prev = smoothedLandmarksRef.current![i]
            if (!prev) return lm
            
            return {
              x: prev.x * POSE_SMOOTHING + lm.x * (1 - POSE_SMOOTHING),
              y: prev.y * POSE_SMOOTHING + lm.y * (1 - POSE_SMOOTHING),
              z: prev.z * POSE_SMOOTHING + lm.z * (1 - POSE_SMOOTHING),
              visibility: lm.visibility,
            }
          })
          smoothedLandmarksRef.current = smoothed
          
          // Create smoothed result
          const smoothedResult: PoseLandmarkerResult = {
            landmarks: [smoothed],
            worldLandmarks: result.worldLandmarks,
            segmentationMasks: result.segmentationMasks,
            close: result.close,
          }
          
          framesSinceValidPoseRef.current = 0
          lastValidResultRef.current = smoothedResult
          return smoothedResult
        } else {
          smoothedLandmarksRef.current = newLandmarks
          framesSinceValidPoseRef.current = 0
          lastValidResultRef.current = result
          return result
        }
      } catch (err) {
        console.error('Pose detection error:', err)
        framesSinceValidPoseRef.current++
        if (framesSinceValidPoseRef.current < POSE_HOLD_FRAMES && lastValidResultRef.current) {
          return lastValidResultRef.current
        }
        return null
      }
    },
    [poseLandmarker]
  )

  return {
    poseLandmarker,
    isLoading,
    error,
    detectPose,
  }
}
