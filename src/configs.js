/**
 * default useWhisper configuration
 */

/**
 * default timeout for recorder
 */
const defaultTimeout = {
  stop: 5_000, // Default stop timeout, update as needed
}

/**
 * default transcript object
 */
const defaultTranscript = {
  blob: null, // Default value
  text: '', // Default value
}

export const defaultStopTimeout = 5_000

export const ffmpegCoreUrl =
  'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js'

export const silenceRemoveCommand =
  'silenceremove=start_periods=1:stop_periods=-1:start_threshold=-30dB:stop_threshold=-30dB:start_silence=2:stop_silence=2'

export const whisperApiEndpoint = 'https://api.openai.com/v1/audio/'
export const defaultConfig = {
  apiKey: null, // Default value
  autoStart: false, // Assuming default is false, update as needed
  autoTranscribe: false, // Assuming default is false, update as needed
  mode: 'defaultMode', // Replace with actual default mode
  nonStop: false, // Assuming default is false, update as needed
  removeSilence: false, // Assuming default is false, update as needed
  stopTimeout: defaultStopTimeout, // Default value from configs
  streaming: false, // Assuming default is false, update as needed
  timeSlice: 1000, // Default timeslice, update as needed
  onDataAvailable: null, // Default value
  onTranscribe: null, // Default value
}
