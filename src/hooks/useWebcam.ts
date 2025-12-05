'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebcamOptions {
  width?: number
  height?: number
}

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean
  error: string | null
  aspectRatio: number
}

export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const { width = 1280, height = 720 } = options
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState(width / height)

  useEffect(() => {
    let stream: MediaStream | null = null

    async function setupWebcam() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('getUserMedia is not supported in this browser')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: 'user',
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream

          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              const actualWidth = videoRef.current.videoWidth
              const actualHeight = videoRef.current.videoHeight
              setAspectRatio(actualWidth / actualHeight)
              videoRef.current.play()
              setIsReady(true)
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access webcam'
        setError(message)
        console.error('Webcam access error:', err)
      }
    }

    setupWebcam()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      setIsReady(false)
    }
  }, [width, height])

  return { videoRef, isReady, error, aspectRatio }
}
