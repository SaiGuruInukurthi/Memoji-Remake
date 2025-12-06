/**
 * Body/Pose Tracking Utility
 * 
 * Maps MediaPipe Pose Landmarker results to avatar skeleton bones.
 * Supports upper body tracking: shoulders, elbows, wrists.
 */

import * as THREE from 'three'
import { PoseLandmarkerResult } from '@mediapipe/tasks-vision'

// MediaPipe Pose Landmark indices
// https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export interface BodyBones {
  // Spine/Core
  hips: THREE.Bone | null
  spine: THREE.Bone | null
  spine1: THREE.Bone | null
  spine2: THREE.Bone | null
  neck: THREE.Bone | null
  head: THREE.Bone | null
  
  // Left arm
  leftShoulder: THREE.Bone | null
  leftArm: THREE.Bone | null  // Upper arm
  leftForeArm: THREE.Bone | null  // Lower arm (elbow to wrist)
  leftHand: THREE.Bone | null
  
  // Right arm
  rightShoulder: THREE.Bone | null
  rightArm: THREE.Bone | null
  rightForeArm: THREE.Bone | null
  rightHand: THREE.Bone | null
}

export interface PoseData {
  // Landmark positions (normalized 0-1)
  leftShoulder: THREE.Vector3 | null
  rightShoulder: THREE.Vector3 | null
  leftElbow: THREE.Vector3 | null
  rightElbow: THREE.Vector3 | null
  leftWrist: THREE.Vector3 | null
  rightWrist: THREE.Vector3 | null
  leftHip: THREE.Vector3 | null
  rightHip: THREE.Vector3 | null
}

// Bone name patterns for different rig types
const BONE_PATTERNS: Record<keyof BodyBones, string[]> = {
  hips: ['Hips', 'hips', 'mixamorigHips', 'pelvis', 'Pelvis'],
  spine: ['Spine', 'spine', 'mixamorigSpine'],
  spine1: ['Spine1', 'spine1', 'mixamorigSpine1'],
  spine2: ['Spine2', 'spine2', 'mixamorigSpine2', 'Chest', 'chest'],
  neck: ['Neck', 'neck', 'mixamorigNeck'],
  head: ['Head', 'head', 'mixamorigHead'],
  
  leftShoulder: ['LeftShoulder', 'leftShoulder', 'mixamorigLeftShoulder', 'shoulder_L', 'Shoulder_L'],
  leftArm: ['LeftArm', 'leftArm', 'mixamorigLeftArm', 'arm_L', 'Arm_L', 'UpperArm_L'],
  leftForeArm: ['LeftForeArm', 'leftForeArm', 'mixamorigLeftForeArm', 'forearm_L', 'ForeArm_L', 'LowerArm_L'],
  leftHand: ['LeftHand', 'leftHand', 'mixamorigLeftHand', 'hand_L', 'Hand_L'],
  
  rightShoulder: ['RightShoulder', 'rightShoulder', 'mixamorigRightShoulder', 'shoulder_R', 'Shoulder_R'],
  rightArm: ['RightArm', 'rightArm', 'mixamorigRightArm', 'arm_R', 'Arm_R', 'UpperArm_R'],
  rightForeArm: ['RightForeArm', 'rightForeArm', 'mixamorigRightForeArm', 'forearm_R', 'ForeArm_R', 'LowerArm_R'],
  rightHand: ['RightHand', 'rightHand', 'mixamorigRightHand', 'hand_R', 'Hand_R'],
}

/**
 * Find body bones in a Three.js scene
 */
export function findBodyBones(scene: THREE.Object3D): BodyBones {
  const result: BodyBones = {
    hips: null,
    spine: null,
    spine1: null,
    spine2: null,
    neck: null,
    head: null,
    leftShoulder: null,
    leftArm: null,
    leftForeArm: null,
    leftHand: null,
    rightShoulder: null,
    rightArm: null,
    rightForeArm: null,
    rightHand: null,
  }

  const allBones: THREE.Bone[] = []
  scene.traverse((child) => {
    if (child instanceof THREE.Bone) {
      allBones.push(child)
    }
  })

  // Match bones using patterns
  for (const [boneKey, patterns] of Object.entries(BONE_PATTERNS)) {
    for (const bone of allBones) {
      const boneName = bone.name.toLowerCase()
      for (const pattern of patterns) {
        if (boneName.includes(pattern.toLowerCase())) {
          result[boneKey as keyof BodyBones] = bone
          break
        }
      }
      if (result[boneKey as keyof BodyBones]) break
    }
  }

  return result
}

/**
 * Extract pose data from MediaPipe result
 */
export function extractPoseData(result: PoseLandmarkerResult): PoseData | null {
  if (!result.landmarks || result.landmarks.length === 0) {
    return null
  }

  const landmarks = result.landmarks[0]
  
  const getVector = (index: number): THREE.Vector3 | null => {
    const lm = landmarks[index]
    if (!lm) return null
    // Mirror X for avatar (camera view is mirrored)
    // Y stays as-is (0 = top, 1 = bottom in normalized coords)
    return new THREE.Vector3(1 - lm.x, lm.y, lm.z)
  }

  // Swap left/right because camera is mirrored
  // User's left arm appears on right side of screen -> detected as "right" by MediaPipe
  // But we want it to control the avatar's left arm (which appears on user's left in mirror)
  return {
    leftShoulder: getVector(POSE_LANDMARKS.LEFT_SHOULDER),
    rightShoulder: getVector(POSE_LANDMARKS.RIGHT_SHOULDER),
    leftElbow: getVector(POSE_LANDMARKS.LEFT_ELBOW),
    rightElbow: getVector(POSE_LANDMARKS.RIGHT_ELBOW),
    leftWrist: getVector(POSE_LANDMARKS.LEFT_WRIST),
    rightWrist: getVector(POSE_LANDMARKS.RIGHT_WRIST),
    leftHip: getVector(POSE_LANDMARKS.LEFT_HIP),
    rightHip: getVector(POSE_LANDMARKS.RIGHT_HIP),
  }
}

/**
 * Calculate angle between three points (returns angle at middle point)
 */
function calculateAngle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  const ba = new THREE.Vector3().subVectors(a, b)
  const bc = new THREE.Vector3().subVectors(c, b)
  return ba.angleTo(bc)
}

// Store initial bone quaternions for reference
const initialRotations = new Map<string, THREE.Quaternion>()

/**
 * Apply pose data to avatar body bones
 * 
 * Simple approach: Only apply arm raise/lower rotation.
 * The avatar is in T-pose, so arms are horizontal.
 * We calculate how much the arm deviates from horizontal and apply that rotation.
 */
export function applyPoseToBones(
  poseData: PoseData,
  bodyBones: BodyBones,
  smoothingFactor: number = 0.4
): void {
  if (!poseData.leftShoulder || !poseData.rightShoulder) {
    return
  }

  // LEFT ARM - X rotation (raise/lower) only
  if (poseData.leftElbow && poseData.leftShoulder && bodyBones.leftArm) {
    // Vector from shoulder to elbow
    const armVec = new THREE.Vector3().subVectors(poseData.leftElbow, poseData.leftShoulder)
    
    // Calculate vertical angle (up/down) - abduction/adduction
    const verticalAngle = Math.atan2(armVec.y, Math.abs(armVec.x))
    
    const targetX = verticalAngle * 1.1
    
    bodyBones.leftArm.rotation.x = THREE.MathUtils.lerp(
      bodyBones.leftArm.rotation.x,
      targetX,
      smoothingFactor
    )
    
    // Keep Y and Z at 0
    bodyBones.leftArm.rotation.y = THREE.MathUtils.lerp(
      bodyBones.leftArm.rotation.y,
      0,
      smoothingFactor
    )
    
    bodyBones.leftArm.rotation.z = THREE.MathUtils.lerp(
      bodyBones.leftArm.rotation.z,
      0,
      smoothingFactor
    )
  }

  // RIGHT ARM - X rotation (raise/lower) only
  if (poseData.rightElbow && poseData.rightShoulder && bodyBones.rightArm) {
    const armVec = new THREE.Vector3().subVectors(poseData.rightElbow, poseData.rightShoulder)
    const verticalAngle = Math.atan2(armVec.y, Math.abs(armVec.x))
    
    const targetX = verticalAngle * 1.1
    
    bodyBones.rightArm.rotation.x = THREE.MathUtils.lerp(
      bodyBones.rightArm.rotation.x,
      targetX,
      smoothingFactor
    )
    
    bodyBones.rightArm.rotation.y = THREE.MathUtils.lerp(
      bodyBones.rightArm.rotation.y,
      0,
      smoothingFactor
    )
    
    bodyBones.rightArm.rotation.z = THREE.MathUtils.lerp(
      bodyBones.rightArm.rotation.z,
      0,
      smoothingFactor
    )
  }

  // LEFT FOREARM - elbow bend (Y rotation)
  if (poseData.leftShoulder && poseData.leftElbow && poseData.leftWrist && bodyBones.leftForeArm) {
    const elbowAngle = calculateAngle(poseData.leftShoulder, poseData.leftElbow, poseData.leftWrist)
    // Straight arm = PI, fully bent = small angle
    // We want to rotate forearm inward when bent
    const bendAmount = Math.max(0, (Math.PI - elbowAngle) * 0.7)
    
    bodyBones.leftForeArm.rotation.y = THREE.MathUtils.lerp(
      bodyBones.leftForeArm.rotation.y,
      bendAmount,
      smoothingFactor
    )
  }

  // RIGHT FOREARM - elbow bend (Y rotation, opposite direction)
  if (poseData.rightShoulder && poseData.rightElbow && poseData.rightWrist && bodyBones.rightForeArm) {
    const elbowAngle = calculateAngle(poseData.rightShoulder, poseData.rightElbow, poseData.rightWrist)
    const bendAmount = Math.max(0, (Math.PI - elbowAngle) * 0.7)
    
    bodyBones.rightForeArm.rotation.y = THREE.MathUtils.lerp(
      bodyBones.rightForeArm.rotation.y,
      -bendAmount, // Opposite direction for right arm
      smoothingFactor
    )
  }
}

/**
 * Log found body bones for debugging
 */
export function logBodyBones(bodyBones: BodyBones): void {
  const found: string[] = []
  const missing: string[] = []
  
  for (const [key, bone] of Object.entries(bodyBones)) {
    if (bone) {
      found.push(`${key}: ${bone.name}`)
    } else {
      missing.push(key)
    }
  }
  
  console.log('🦴 Body bones found:', found.join(', '))
  if (missing.length > 0) {
    console.log('⚠️ Missing body bones:', missing.join(', '))
  }
}
