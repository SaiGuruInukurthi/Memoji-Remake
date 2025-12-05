'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

interface UseFaceLandmarkerReturn {
  faceLandmarker: FaceLandmarker | null
  isLoading: boolean
  error: string | null
  detectFace: (video: HTMLVideoElement) => FaceLandmarkerResult | null
}

export function useFaceLandmarker(): UseFaceLandmarkerReturn {
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastTimestampRef = useRef<number>(-1)

  useEffect(() => {
    let isMounted = true

    async function initFaceLandmarker() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        })

        if (isMounted) {
          setFaceLandmarker(landmarker)
          setIsLoading(false)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize face landmarker'
        if (isMounted) {
          setError(message)
          setIsLoading(false)
        }
        console.error('FaceLandmarker init error:', err)
      }
    }

    initFaceLandmarker()

    return () => {
      isMounted = false
    }
  }, [])

  const detectFace = useCallback(
    (video: HTMLVideoElement): FaceLandmarkerResult | null => {
      if (!faceLandmarker || video.readyState < 2) {
        return null
      }

      const timestamp = performance.now()
      
      // Avoid duplicate timestamps
      if (timestamp <= lastTimestampRef.current) {
        return null
      }
      lastTimestampRef.current = timestamp

      try {
        return faceLandmarker.detectForVideo(video, timestamp)
      } catch (err) {
        console.error('Face detection error:', err)
        return null
      }
    },
    [faceLandmarker]
  )

  return { faceLandmarker, isLoading, error, detectFace }
}
