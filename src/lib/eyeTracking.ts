/**
 * Eye Tracking Utility
 * 
 * Extracts eye gaze direction from MediaPipe blendshapes and applies to avatar eye bones.
 * Supports both blendshape-based and bone-based eye tracking.
 * Also handles eyelid blinking for bone-based eyelids.
 */

import * as THREE from 'three'
import { BlendshapeData } from './blendshapes'

export interface EyeGaze {
  leftEye: { x: number; y: number }  // pitch (up/down), yaw (left/right)
  rightEye: { x: number; y: number }
}

export interface EyelidState {
  left: number  // 0 = open, 1 = closed
  right: number
}

// Eye bone names commonly used in avatars
const EYE_BONE_NAMES = {
  leftEye: ['LeftEye', 'leftEye', 'Eye_L', 'eye_L', 'Eye.L', 'mixamorigLeftEye', 'LeftEyeBone'],
  rightEye: ['RightEye', 'rightEye', 'Eye_R', 'eye_R', 'Eye.R', 'mixamorigRightEye', 'RightEyeBone'],
}

// Eyelid bone names
const EYELID_BONE_NAMES = {
  leftUpper: ['LeftEyelidUpper', 'leftEyelidUpper', 'Eyelid_Upper_L', 'eyelid_upper_l', 'LeftUpperEyelid', 'EyelidUp_L'],
  leftLower: ['LeftEyelidLower', 'leftEyelidLower', 'Eyelid_Lower_L', 'eyelid_lower_l', 'LeftLowerEyelid', 'EyelidDown_L'],
  rightUpper: ['RightEyelidUpper', 'rightEyelidUpper', 'Eyelid_Upper_R', 'eyelid_upper_r', 'RightUpperEyelid', 'EyelidUp_R'],
  rightLower: ['RightEyelidLower', 'rightEyelidLower', 'Eyelid_Lower_R', 'eyelid_lower_r', 'RightLowerEyelid', 'EyelidDown_R'],
}

/**
 * Extract eye blink state from MediaPipe blendshapes
 */
export function extractEyelidState(blendshapes: BlendshapeData): EyelidState {
  return {
    left: blendshapes['eyeBlinkLeft'] ?? 0,
    right: blendshapes['eyeBlinkRight'] ?? 0,
  }
}

/**
 * Extract eye gaze direction from MediaPipe blendshapes
 * The blendshapes give us look direction as activation values
 */
export function extractEyeGaze(blendshapes: BlendshapeData): EyeGaze {
  // Get eye look blendshape values
  const lookUpL = blendshapes['eyeLookUpLeft'] ?? 0
  const lookDownL = blendshapes['eyeLookDownLeft'] ?? 0
  const lookInL = blendshapes['eyeLookInLeft'] ?? 0
  const lookOutL = blendshapes['eyeLookOutLeft'] ?? 0

  const lookUpR = blendshapes['eyeLookUpRight'] ?? 0
  const lookDownR = blendshapes['eyeLookDownRight'] ?? 0
  const lookInR = blendshapes['eyeLookInRight'] ?? 0
  const lookOutR = blendshapes['eyeLookOutRight'] ?? 0

  // Convert to rotation values
  // Positive X = looking down, Negative X = looking up
  // Positive Y = looking left (for left eye), looking right (for right eye)
  const maxAngle = 0.5 // Maximum eye rotation in radians (~28 degrees)

  // Left eye
  const leftPitch = (lookDownL - lookUpL) * maxAngle
  const leftYaw = (lookOutL - lookInL) * maxAngle // Out = looking left, In = looking right

  // Right eye
  const rightPitch = (lookDownR - lookUpR) * maxAngle
  const rightYaw = (lookInR - lookOutR) * maxAngle // In = looking left, Out = looking right

  return {
    leftEye: { x: leftPitch, y: leftYaw },
    rightEye: { x: rightPitch, y: rightYaw },
  }
}

export interface EyelidBones {
  leftUpper: THREE.Bone | null
  leftLower: THREE.Bone | null
  rightUpper: THREE.Bone | null
  rightLower: THREE.Bone | null
}

/**
 * Find eyelid bones in a Three.js scene
 */
export function findEyelidBones(scene: THREE.Object3D): EyelidBones {
  const result: EyelidBones = {
    leftUpper: null,
    leftLower: null,
    rightUpper: null,
    rightLower: null,
  }

  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      const name = child.name
      const nameLower = name.toLowerCase()

      // Check for each eyelid type
      for (const [key, aliases] of Object.entries(EYELID_BONE_NAMES)) {
        if (!result[key as keyof EyelidBones]) {
          if (aliases.some((alias) => name.includes(alias) || nameLower === alias.toLowerCase())) {
            result[key as keyof EyelidBones] = child
          }
        }
      }
    }
  })

  return result
}

/**
 * Apply eyelid blink to eyelid bones
 */
export function applyEyelidBlink(
  eyelidState: EyelidState,
  eyelidBones: EyelidBones,
  smoothingFactor: number = 0.6
): void {
  const blinkAngle = 0.4 // Maximum rotation for closed eyelid in radians (~23 degrees)

  if (eyelidBones.leftUpper) {
    const targetRotation = eyelidState.left * blinkAngle
    eyelidBones.leftUpper.rotation.x = THREE.MathUtils.lerp(
      eyelidBones.leftUpper.rotation.x,
      targetRotation,
      smoothingFactor
    )
  }

  if (eyelidBones.leftLower) {
    const targetRotation = -eyelidState.left * blinkAngle * 0.3 // Lower lid moves less
    eyelidBones.leftLower.rotation.x = THREE.MathUtils.lerp(
      eyelidBones.leftLower.rotation.x,
      targetRotation,
      smoothingFactor
    )
  }

  if (eyelidBones.rightUpper) {
    const targetRotation = eyelidState.right * blinkAngle
    eyelidBones.rightUpper.rotation.x = THREE.MathUtils.lerp(
      eyelidBones.rightUpper.rotation.x,
      targetRotation,
      smoothingFactor
    )
  }

  if (eyelidBones.rightLower) {
    const targetRotation = -eyelidState.right * blinkAngle * 0.3
    eyelidBones.rightLower.rotation.x = THREE.MathUtils.lerp(
      eyelidBones.rightLower.rotation.x,
      targetRotation,
      smoothingFactor
    )
  }
}

/**
 * Find eye bones in a Three.js scene
 */
export function findEyeBones(scene: THREE.Object3D): {
  leftEye: THREE.Bone | null
  rightEye: THREE.Bone | null
} {
  let leftEye: THREE.Bone | null = null
  let rightEye: THREE.Bone | null = null

  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      const name = child.name

      // Check for left eye
      if (!leftEye && EYE_BONE_NAMES.leftEye.some((n) => name.includes(n) || name.toLowerCase() === n.toLowerCase())) {
        leftEye = child
      }

      // Check for right eye
      if (!rightEye && EYE_BONE_NAMES.rightEye.some((n) => name.includes(n) || name.toLowerCase() === n.toLowerCase())) {
        rightEye = child
      }
    }
  })

  return { leftEye, rightEye }
}

/**
 * Apply eye gaze to eye bones with smoothing
 */
export function applyEyeGazeToBones(
  eyeGaze: EyeGaze,
  leftEyeBone: THREE.Bone | null,
  rightEyeBone: THREE.Bone | null,
  smoothingFactor: number = 0.3
): void {
  if (leftEyeBone) {
    leftEyeBone.rotation.x = THREE.MathUtils.lerp(
      leftEyeBone.rotation.x,
      eyeGaze.leftEye.x,
      smoothingFactor
    )
    leftEyeBone.rotation.y = THREE.MathUtils.lerp(
      leftEyeBone.rotation.y,
      eyeGaze.leftEye.y,
      smoothingFactor
    )
  }

  if (rightEyeBone) {
    rightEyeBone.rotation.x = THREE.MathUtils.lerp(
      rightEyeBone.rotation.x,
      eyeGaze.rightEye.x,
      smoothingFactor
    )
    rightEyeBone.rotation.y = THREE.MathUtils.lerp(
      rightEyeBone.rotation.y,
      eyeGaze.rightEye.y,
      smoothingFactor
    )
  }
}

/**
 * Debug: Log all bones found in the scene
 */
export function logAllBones(scene: THREE.Object3D): void {
  const bones: string[] = []
  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      bones.push(child.name)
    }
  })
  console.log('All bones in scene:', bones)
}
