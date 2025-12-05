/**
 * Blendshape Mapping Utility
 * 
 * Maps MediaPipe's 52 ARKit-compatible blendshapes to avatar morph targets.
 * Handles different naming conventions and provides fallback mappings.
 */

// MediaPipe outputs these 52 ARKit-compatible blendshape names
export const MEDIAPIPE_BLENDSHAPES = [
  '_neutral',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
] as const

export type MediaPipeBlendshapeName = typeof MEDIAPIPE_BLENDSHAPES[number]

export interface BlendshapeData {
  [key: string]: number
}

// Common naming convention mappings
// Key: MediaPipe name, Value: array of possible avatar morph target names
const BLENDSHAPE_ALIASES: Record<string, string[]> = {
  // Eye blinks - extensive aliases for various avatar formats
  eyeBlinkLeft: [
    'eyeBlinkLeft', 'eyeBlink_L', 'EyeBlink_L', 'eye_blink_left', 'leftEyeBlink',
    'EyesClosed_L', 'eyesClosed_L', 'eyes_closed_l', 'Blink_Left', 'blink_l',
    'EyeBlinkL', 'eyeBlinkL', 'LeftEyeBlink', 'left_eye_blink',
    'EyesWink_L', 'eyesWink_L', 'Wink_L', 'wink_l'
  ],
  eyeBlinkRight: [
    'eyeBlinkRight', 'eyeBlink_R', 'EyeBlink_R', 'eye_blink_right', 'rightEyeBlink',
    'EyesClosed_R', 'eyesClosed_R', 'eyes_closed_r', 'Blink_Right', 'blink_r',
    'EyeBlinkR', 'eyeBlinkR', 'RightEyeBlink', 'right_eye_blink',
    'EyesWink_R', 'eyesWink_R', 'Wink_R', 'wink_r'
  ],
  
  // Eye look
  eyeLookDownLeft: ['eyeLookDown_L', 'EyeLookDown_L', 'eye_look_down_left', 'eyeLookDownLeft'],
  eyeLookDownRight: ['eyeLookDown_R', 'EyeLookDown_R', 'eye_look_down_right', 'eyeLookDownRight'],
  eyeLookInLeft: ['eyeLookIn_L', 'EyeLookIn_L', 'eye_look_in_left', 'eyeLookInLeft'],
  eyeLookInRight: ['eyeLookIn_R', 'EyeLookIn_R', 'eye_look_in_right', 'eyeLookInRight'],
  eyeLookOutLeft: ['eyeLookOut_L', 'EyeLookOut_L', 'eye_look_out_left', 'eyeLookOutLeft'],
  eyeLookOutRight: ['eyeLookOut_R', 'EyeLookOut_R', 'eye_look_out_right', 'eyeLookOutRight'],
  eyeLookUpLeft: ['eyeLookUp_L', 'EyeLookUp_L', 'eye_look_up_left', 'eyeLookUpLeft'],
  eyeLookUpRight: ['eyeLookUp_R', 'EyeLookUp_R', 'eye_look_up_right', 'eyeLookUpRight'],
  
  // Eye squint/wide
  eyeSquintLeft: ['eyeSquint_L', 'EyeSquint_L', 'eye_squint_left', 'eyeSquintLeft'],
  eyeSquintRight: ['eyeSquint_R', 'EyeSquint_R', 'eye_squint_right', 'eyeSquintRight'],
  eyeWideLeft: ['eyeWide_L', 'EyeWide_L', 'eye_wide_left', 'eyeWideLeft'],
  eyeWideRight: ['eyeWide_R', 'EyeWide_R', 'eye_wide_right', 'eyeWideRight'],
  
  // Brows
  browDownLeft: ['browDown_L', 'BrowDown_L', 'brow_down_left', 'browDownLeft'],
  browDownRight: ['browDown_R', 'BrowDown_R', 'brow_down_right', 'browDownRight'],
  browInnerUp: ['browInnerUp', 'BrowInnerUp', 'brow_inner_up', 'browInnerUp'],
  browOuterUpLeft: ['browOuterUp_L', 'BrowOuterUp_L', 'brow_outer_up_left', 'browOuterUpLeft'],
  browOuterUpRight: ['browOuterUp_R', 'BrowOuterUp_R', 'brow_outer_up_right', 'browOuterUpRight'],
  
  // Jaw
  jawOpen: ['jawOpen', 'JawOpen', 'jaw_open', 'mouthOpen', 'jawOpen'],
  jawForward: ['jawForward', 'JawForward', 'jaw_forward', 'jawForward'],
  jawLeft: ['jawLeft', 'JawLeft', 'jaw_left', 'jawLeft'],
  jawRight: ['jawRight', 'JawRight', 'jaw_right', 'jawRight'],
  
  // Mouth smile
  mouthSmileLeft: ['mouthSmile_L', 'MouthSmile_L', 'mouth_smile_left', 'smileLeft', 'mouthSmileLeft'],
  mouthSmileRight: ['mouthSmile_R', 'MouthSmile_R', 'mouth_smile_right', 'smileRight', 'mouthSmileRight'],
  
  // Mouth frown
  mouthFrownLeft: ['mouthFrown_L', 'MouthFrown_L', 'mouth_frown_left', 'mouthFrownLeft'],
  mouthFrownRight: ['mouthFrown_R', 'MouthFrown_R', 'mouth_frown_right', 'mouthFrownRight'],
  
  // Mouth other
  mouthClose: ['mouthClose', 'MouthClose', 'mouth_close', 'mouthClose'],
  mouthFunnel: ['mouthFunnel', 'MouthFunnel', 'mouth_funnel', 'mouthFunnel'],
  mouthPucker: ['mouthPucker', 'MouthPucker', 'mouth_pucker', 'mouthPucker'],
  mouthLeft: ['mouthLeft', 'MouthLeft', 'mouth_left', 'mouthLeft'],
  mouthRight: ['mouthRight', 'MouthRight', 'mouth_right', 'mouthRight'],
  mouthDimpleLeft: ['mouthDimple_L', 'MouthDimple_L', 'mouth_dimple_left', 'mouthDimpleLeft'],
  mouthDimpleRight: ['mouthDimple_R', 'MouthDimple_R', 'mouth_dimple_right', 'mouthDimpleRight'],
  mouthStretchLeft: ['mouthStretch_L', 'MouthStretch_L', 'mouth_stretch_left', 'mouthStretchLeft'],
  mouthStretchRight: ['mouthStretch_R', 'MouthStretch_R', 'mouth_stretch_right', 'mouthStretchRight'],
  mouthRollLower: ['mouthRollLower', 'MouthRollLower', 'mouth_roll_lower', 'mouthRollLower'],
  mouthRollUpper: ['mouthRollUpper', 'MouthRollUpper', 'mouth_roll_upper', 'mouthRollUpper'],
  mouthShrugLower: ['mouthShrugLower', 'MouthShrugLower', 'mouth_shrug_lower', 'mouthShrugLower'],
  mouthShrugUpper: ['mouthShrugUpper', 'MouthShrugUpper', 'mouth_shrug_upper', 'mouthShrugUpper'],
  mouthPressLeft: ['mouthPress_L', 'MouthPress_L', 'mouth_press_left', 'mouthPressLeft'],
  mouthPressRight: ['mouthPress_R', 'MouthPress_R', 'mouth_press_right', 'mouthPressRight'],
  mouthLowerDownLeft: ['mouthLowerDown_L', 'MouthLowerDown_L', 'mouth_lower_down_left', 'mouthLowerDownLeft'],
  mouthLowerDownRight: ['mouthLowerDown_R', 'MouthLowerDown_R', 'mouth_lower_down_right', 'mouthLowerDownRight'],
  mouthUpperUpLeft: ['mouthUpperUp_L', 'MouthUpperUp_L', 'mouth_upper_up_left', 'mouthUpperUpLeft'],
  mouthUpperUpRight: ['mouthUpperUp_R', 'MouthUpperUp_R', 'mouth_upper_up_right', 'mouthUpperUpRight'],
  
  // Cheeks
  cheekPuff: ['cheekPuff', 'CheekPuff', 'cheek_puff', 'cheekPuff'],
  cheekSquintLeft: ['cheekSquint_L', 'CheekSquint_L', 'cheek_squint_left', 'cheekSquintLeft'],
  cheekSquintRight: ['cheekSquint_R', 'CheekSquint_R', 'cheek_squint_right', 'cheekSquintRight'],
  
  // Nose
  noseSneerLeft: ['noseSneer_L', 'NoseSneer_L', 'nose_sneer_left', 'noseSneerLeft'],
  noseSneerRight: ['noseSneer_R', 'NoseSneer_R', 'nose_sneer_right', 'noseSneerRight'],
}

/**
 * Creates a mapping from MediaPipe blendshape names to avatar morph target indices
 */
export function createBlendshapeMapping(
  morphTargetDictionary: Record<string, number> | undefined
): Map<string, number> {
  const mapping = new Map<string, number>()

  if (!morphTargetDictionary) {
    return mapping
  }

  const availableTargets = Object.keys(morphTargetDictionary)
  const availableTargetsLower = availableTargets.map((t) => t.toLowerCase())

  for (const [mediaPipeName, aliases] of Object.entries(BLENDSHAPE_ALIASES)) {
    // Try exact match first
    if (morphTargetDictionary[mediaPipeName] !== undefined) {
      mapping.set(mediaPipeName, morphTargetDictionary[mediaPipeName])
      continue
    }

    // Try aliases
    for (const alias of aliases) {
      if (morphTargetDictionary[alias] !== undefined) {
        mapping.set(mediaPipeName, morphTargetDictionary[alias])
        break
      }

      // Try case-insensitive match
      const lowerAlias = alias.toLowerCase()
      const matchIndex = availableTargetsLower.indexOf(lowerAlias)
      if (matchIndex !== -1) {
        const actualName = availableTargets[matchIndex]
        mapping.set(mediaPipeName, morphTargetDictionary[actualName])
        break
      }
    }
  }

  return mapping
}

// Blendshapes that need faster response (less smoothing)
const FAST_RESPONSE_BLENDSHAPES = new Set([
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeWideLeft',
  'eyeWideRight',
  'eyeSquintLeft',
  'eyeSquintRight',
])

/**
 * Applies blendshape values to morph target influences with smoothing
 * Eye blinks use faster response for natural look
 */
export function applyBlendshapes(
  blendshapeData: BlendshapeData,
  morphTargetInfluences: number[],
  blendshapeMapping: Map<string, number>,
  smoothingFactor: number = 0.5
): void {
  for (const [mediaPipeName, targetIndex] of blendshapeMapping) {
    const value = blendshapeData[mediaPipeName] ?? 0
    const currentValue = morphTargetInfluences[targetIndex] ?? 0
    
    // Use faster smoothing for eye blinks (more responsive)
    const effectiveSmoothing = FAST_RESPONSE_BLENDSHAPES.has(mediaPipeName) 
      ? Math.min(smoothingFactor * 1.8, 0.9) // Faster for blinks
      : smoothingFactor
    
    // Apply exponential smoothing for natural movement
    morphTargetInfluences[targetIndex] =
      currentValue + (value - currentValue) * effectiveSmoothing
  }
}

/**
 * Extracts blendshape data from MediaPipe FaceLandmarkerResult
 */
export function extractBlendshapes(
  faceBlendshapes: { categories: { categoryName: string; score: number }[] }[] | undefined
): BlendshapeData {
  const data: BlendshapeData = {}

  if (!faceBlendshapes || faceBlendshapes.length === 0) {
    return data
  }

  for (const category of faceBlendshapes[0].categories) {
    data[category.categoryName] = category.score
  }

  return data
}

/**
 * Debug utility: logs available morph targets in a model
 */
export function logMorphTargets(
  morphTargetDictionary: Record<string, number> | undefined
): void {
  if (!morphTargetDictionary) {
    console.log('No morph targets found in this model')
    return
  }

  const targets = Object.entries(morphTargetDictionary)
    .sort(([, a], [, b]) => a - b)
    .map(([name, index]) => `${index}: ${name}`)

  console.log('Available morph targets:')
  console.log(targets.join('\n'))
}

/**
 * Debug utility: logs mapping coverage
 */
export function logMappingCoverage(
  blendshapeMapping: Map<string, number>,
  morphTargetDictionary: Record<string, number> | undefined
): void {
  const mappedCount = blendshapeMapping.size
  const totalMediaPipe = Object.keys(BLENDSHAPE_ALIASES).length
  const totalMorphTargets = morphTargetDictionary
    ? Object.keys(morphTargetDictionary).length
    : 0

  console.log(`Blendshape mapping coverage:`)
  console.log(`  MediaPipe blendshapes mapped: ${mappedCount}/${totalMediaPipe}`)
  console.log(`  Avatar morph targets available: ${totalMorphTargets}`)
  
  // Log unmapped blendshapes
  const unmapped = Object.keys(BLENDSHAPE_ALIASES).filter(
    (name) => !blendshapeMapping.has(name)
  )
  if (unmapped.length > 0) {
    console.log('  Unmapped MediaPipe blendshapes:', unmapped.join(', '))
  }
}
