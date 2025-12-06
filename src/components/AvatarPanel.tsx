'use client'

import { useRef, useEffect, Suspense, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrthographicCamera, Environment, Grid, Html, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import {
  BlendshapeData,
  createBlendshapeMapping,
  applyBlendshapes,
  logMorphTargets,
  logMappingCoverage,
} from '@/lib/blendshapes'
import {
  extractEyeGaze,
  extractEyelidState,
  findEyeBones,
  findEyelidBones,
  applyEyeGazeToBones,
  applyEyelidBlink,
  logAllBones,
  EyelidBones,
} from '@/lib/eyeTracking'
import {
  PoseData,
  BodyBones,
  findBodyBones,
  applyPoseToBones,
  logBodyBones,
} from '@/lib/poseTracking'

// Loading indicator component
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4" />
        <p className="text-white text-sm font-medium">Loading model...</p>
        <p className="text-purple-400 text-lg font-bold">{progress.toFixed(0)}%</p>
      </div>
    </Html>
  )
}

// Camera/position settings interface
export interface AvatarSettings {
  positionX: number
  positionY: number
  positionZ: number
  scale: number
  cameraZoom: number
  cameraY: number
}

// Avatar model paths with camera settings
export const AVATARS = {
  avatar: {
    name: 'Avatar (Fast)',
    path: '/avatars/avatar.glb',
    // Head-only view for Ready Player Me avatar
    position: [-0.09, -4.73, -3.66] as [number, number, number],
    scale: 3.1,
    cameraZoom: 225,
    cameraY: -0.02,
  },
  'doll-ramen': {
    name: 'Doll Ramen (ARKit) - 87MB',
    path: '/avatars/doll_ramen_arkit_facial_rig_test.glb',
    position: [-0.16, -4.16, -0.95] as [number, number, number],
    scale: 2.9,
    cameraZoom: 500,
    cameraY: 0.18,
  },
  'spartan-halo': {
    name: 'Spartan Armor (Halo)',
    path: '/avatars/spartan_halo.glb',
    position: [-0.09, -4.93, -3.66] as [number, number, number],
    scale: 2.1,
    cameraZoom: 225,
    cameraY: 0.46,
  },
} as const

export type AvatarKey = keyof typeof AVATARS

// Get default settings from avatar config
export function getDefaultSettings(avatarKey: AvatarKey): AvatarSettings {
  const config = AVATARS[avatarKey]
  return {
    positionX: config.position[0],
    positionY: config.position[1],
    positionZ: config.position[2],
    scale: config.scale,
    cameraZoom: config.cameraZoom,
    cameraY: config.cameraY,
  }
}

interface AvatarModelProps {
  avatarKey: AvatarKey
  blendshapes: BlendshapeData
  headRotation?: { x: number; y: number; z: number }
  poseData?: PoseData | null
  settings: AvatarSettings
}

function AvatarModel({ avatarKey, blendshapes, headRotation, poseData, settings }: AvatarModelProps) {
  const avatarConfig = AVATARS[avatarKey]
  const { scene } = useGLTF(avatarConfig.path)
  const meshRef = useRef<THREE.Object3D>(null)
  const blendshapeMappingRef = useRef<Map<string, number>>(new Map())
  const morphTargetMeshRef = useRef<THREE.Mesh | null>(null)
  const leftEyeBoneRef = useRef<THREE.Bone | null>(null)
  const rightEyeBoneRef = useRef<THREE.Bone | null>(null)
  const eyelidBonesRef = useRef<EyelidBones>({ leftUpper: null, leftLower: null, rightUpper: null, rightLower: null })
  const bodyBonesRef = useRef<BodyBones | null>(null)
  const lastAvatarRef = useRef<string>('')

  // Find mesh with morph targets, create mapping, and find eye/eyelid bones
  useEffect(() => {
    const isNewAvatar = lastAvatarRef.current !== avatarConfig.path
    lastAvatarRef.current = avatarConfig.path

    let foundMesh: THREE.Mesh | null = null

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
        foundMesh = child
      }
    })

    if (foundMesh) {
      morphTargetMeshRef.current = foundMesh
      const mesh = foundMesh as THREE.Mesh
      blendshapeMappingRef.current = createBlendshapeMapping(mesh.morphTargetDictionary)

      // Log debug info for each new avatar
      if (isNewAvatar) {
        console.log(`\n========== Loaded avatar: ${avatarConfig.path} ==========`)
        logMorphTargets(mesh.morphTargetDictionary)
        logMappingCoverage(blendshapeMappingRef.current, mesh.morphTargetDictionary)
      }
    } else {
      console.warn('No mesh with morph targets found in avatar')
    }

    // Find eye bones for bone-based eye tracking
    const eyeBones = findEyeBones(scene)
    leftEyeBoneRef.current = eyeBones.leftEye
    rightEyeBoneRef.current = eyeBones.rightEye

    // Find eyelid bones for bone-based blinking
    const eyelidBones = findEyelidBones(scene)
    eyelidBonesRef.current = eyelidBones
    
    // Always log bone info for new avatars
    if (isNewAvatar) {
      if (eyeBones.leftEye || eyeBones.rightEye) {
        console.log('Eye bones found:', {
          leftEye: eyeBones.leftEye?.name,
          rightEye: eyeBones.rightEye?.name,
        })
      } else {
        console.log('No eye bones found - using blendshape-based eye tracking')
      }

      const hasEyelidBones = eyelidBones.leftUpper || eyelidBones.rightUpper
      if (hasEyelidBones) {
        console.log('Eyelid bones found:', {
          leftUpper: eyelidBones.leftUpper?.name,
          leftLower: eyelidBones.leftLower?.name,
          rightUpper: eyelidBones.rightUpper?.name,
          rightLower: eyelidBones.rightLower?.name,
        })
      } else {
        console.log('No eyelid bones found - using blendshape-based blinking')
      }

      logAllBones(scene)
      
      // Find body bones for pose tracking
      const foundBodyBones = findBodyBones(scene)
      bodyBonesRef.current = foundBodyBones
      logBodyBones(foundBodyBones)
    }
  }, [scene, avatarConfig.path])

  // Apply blendshapes, eye tracking, and eyelid blinking every frame
  useFrame(() => {
    const mesh = morphTargetMeshRef.current
    if (mesh && mesh.morphTargetInfluences) {
      applyBlendshapes(
        blendshapes,
        mesh.morphTargetInfluences,
        blendshapeMappingRef.current,
        0.5 // smoothing factor
      )
    }

    // Apply eye bone tracking if bones are available
    if (leftEyeBoneRef.current || rightEyeBoneRef.current) {
      const eyeGaze = extractEyeGaze(blendshapes)
      applyEyeGazeToBones(
        eyeGaze,
        leftEyeBoneRef.current,
        rightEyeBoneRef.current,
        0.4 // smoothing factor for eyes
      )
    }

    // Apply eyelid bone blinking if eyelid bones are available
    const eyelidBones = eyelidBonesRef.current
    if (eyelidBones.leftUpper || eyelidBones.rightUpper) {
      const eyelidState = extractEyelidState(blendshapes)
      applyEyelidBlink(eyelidState, eyelidBones, 0.7) // Fast response for blinks
    }

    // Apply body pose tracking if pose data and body bones are available
    const bodyBones = bodyBonesRef.current
    if (poseData && bodyBones) {
      applyPoseToBones(poseData, bodyBones, 0.3)
    }

    // Apply head rotation if available
    if (meshRef.current && headRotation) {
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        headRotation.x,
        0.3
      )
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        headRotation.y,
        0.3
      )
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        headRotation.z,
        0.3
      )
    }
  })

  return (
    <primitive
      ref={meshRef}
      object={scene}
      position={[settings.positionX, settings.positionY, settings.positionZ]}
      scale={settings.scale}
    />
  )
}

interface AvatarPanelProps {
  selectedAvatar: AvatarKey
  blendshapes: BlendshapeData
  headRotation?: { x: number; y: number; z: number }
  poseData?: PoseData | null
  settings: AvatarSettings
  onSettingsChange: (settings: AvatarSettings) => void
  debugMode: boolean
}

export function AvatarPanel({
  selectedAvatar,
  blendshapes,
  headRotation,
  poseData,
  settings,
  onSettingsChange,
  debugMode,
}: AvatarPanelProps) {

  return (
    <div className="flex-1 flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex-1 relative">
        <Canvas>
          {/* Orthographic camera for strict X/Y/Z Cartesian plane */}
          <OrthographicCamera
            makeDefault
            position={[0, settings.cameraY, 5]}
            zoom={settings.cameraZoom}
            near={0.1}
            far={1000}
          />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />

          {/* Grid for X/Y/Z reference (optional, can be toggled) */}
          <Grid
            args={[10, 10]}
            position={[0, -2, 0]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#4a5568"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#718096"
            fadeDistance={10}
            fadeStrength={1}
            followCamera={false}
          />

          {/* Axes helper for X/Y/Z reference */}
          <axesHelper args={[2]} position={[-3, -2, 0]} />

          {/* Environment for nice reflections */}
          <Environment preset="studio" />

          {/* Avatar with Suspense for loading */}
          <Suspense fallback={<Loader />}>
            <AvatarModel
              avatarKey={selectedAvatar}
              blendshapes={blendshapes}
              headRotation={headRotation}
              poseData={poseData}
              settings={settings}
            />
          </Suspense>
        </Canvas>

        {/* Debug Controls Panel */}
        {debugMode && (
          <div className="absolute top-2 right-2 bg-black/80 p-3 rounded-lg text-xs font-mono w-64 max-h-[90%] overflow-y-auto">
            <div className="text-yellow-400 font-bold mb-2">🎛️ Debug Controls</div>
            
            <div className="space-y-2">
              <div className="text-gray-400 border-b border-gray-700 pb-1">Model Position</div>
              
              <label className="flex items-center justify-between">
                <span className="text-red-400">X:</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.01"
                  value={settings.positionX}
                  onChange={(e) => onSettingsChange({ ...settings, positionX: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-white w-12 text-right">{settings.positionX.toFixed(2)}</span>
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-green-400">Y:</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.01"
                  value={settings.positionY}
                  onChange={(e) => onSettingsChange({ ...settings, positionY: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-white w-12 text-right">{settings.positionY.toFixed(2)}</span>
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-blue-400">Z:</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.01"
                  value={settings.positionZ}
                  onChange={(e) => onSettingsChange({ ...settings, positionZ: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-white w-12 text-right">{settings.positionZ.toFixed(2)}</span>
              </label>
              
              <div className="text-gray-400 border-b border-gray-700 pb-1 pt-2">Model Scale</div>
              
              <label className="flex items-center justify-between">
                <span className="text-purple-400">Scale:</span>
                <input
                  type="range"
                  min="0.1"
                  max="20"
                  step="0.1"
                  value={settings.scale}
                  onChange={(e) => onSettingsChange({ ...settings, scale: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-white w-12 text-right">{settings.scale.toFixed(1)}</span>
              </label>
              
              <div className="text-gray-400 border-b border-gray-700 pb-1 pt-2">Camera</div>
              
              <label className="flex items-center justify-between">
                <span className="text-cyan-400">Zoom:</span>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="1"
                  value={settings.cameraZoom}
                  onChange={(e) => onSettingsChange({ ...settings, cameraZoom: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-white w-12 text-right">{settings.cameraZoom.toFixed(0)}</span>
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-orange-400">Cam Y:</span>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.01"
                  value={settings.cameraY}
                  onChange={(e) => onSettingsChange({ ...settings, cameraY: parseFloat(e.target.value) })}
                  className="w-32"
                />
                <span className="text-white w-12 text-right">{settings.cameraY.toFixed(2)}</span>
              </label>
              
              <div className="text-gray-400 border-t border-gray-700 pt-2 mt-2">
                <div className="text-yellow-300 text-[10px] break-all">
                  Copy these values:<br/>
                  position: [{settings.positionX.toFixed(2)}, {settings.positionY.toFixed(2)}, {settings.positionZ.toFixed(2)}]<br/>
                  scale: {settings.scale.toFixed(1)}<br/>
                  cameraZoom: {settings.cameraZoom.toFixed(0)}<br/>
                  cameraY: {settings.cameraY.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Axis labels */}
        <div className="absolute bottom-4 left-4 text-xs font-mono">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-500">X</span>
            <span className="text-gray-500">→ Right</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500">Y</span>
            <span className="text-gray-500">→ Up</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500">Z</span>
            <span className="text-gray-500">→ Forward</span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="w-full px-4 py-2 bg-gray-800/50 flex items-center justify-between">
        <span className="text-sm text-gray-400">3D Avatar</span>
        <span className="text-sm text-purple-400">● Orthographic View</span>
      </div>
    </div>
  )
}

// Only preload the small avatar - large one loads on demand
useGLTF.preload(AVATARS['avatar'].path)
