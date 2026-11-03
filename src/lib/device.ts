/** Short vibrations for touch feedback. No-ops where the Vibration API is missing (iOS Safari). */
export const haptic = {
  tap: () => navigator.vibrate?.(8),
  success: () => navigator.vibrate?.([14, 70, 28]),
  error: () => navigator.vibrate?.([30, 50, 30]),
}
