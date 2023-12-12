import { useEffectAsync, useMemoAsync } from '@ginixsan/react-hooks-async'

import { useEffect, useRef, useState } from 'react'

import {
  defaultStopTimeout,
  ffmpegCoreUrl,
  silenceRemoveCommand,
  whisperApiEndpoint,
} from './configs.js' // Correct relative path to configs.js

const defaultConfig = {
  apiKey: null,
  autoStart: false,
  autoTranscribe: false,
  mode: 'defaultMode',
  nonStop: false,
  removeSilence: false,
  stopTimeout: defaultStopTimeout,
  streaming: false,
  timeSlice: 1000,
  onDataAvailable: null,
  onTranscribe: null,
}

/**
 * default timeout for recorder
 */
const defaultTimeout = {
  stop: 5000, // Assuming 5000 milliseconds as default, update as needed
}

/**
 * default transcript object
 */
const defaultTranscript = {
  blob: null, // Assuming null as the default value
  text: '', // Assuming an empty string as the default value
}

/**
 * React Hook for OpenAI Whisper
 */
export const useWhisper = (config) => {
  const {
    apiKey,
    autoStart,
    autoTranscribe,
    mode,
    nonStop,
    removeSilence,
    stopTimeout,
    streaming,
    timeSlice,
    whisperConfig,
    onDataAvailable,
    onTranscribe,
  } = {
    ...defaultConfig,
    ...config,
  }

  if (!apiKey && !onTranscribeCallback) {
    throw new Error('apiKey is required if onTranscribe is not provided')
  }

  const chunks = useRef([])
  const encoder = useRef()
  const listener = useRef()
  const recorder = useRef()
  const stream = useRef()
  const timeout = useRef(defaultTimeout)

  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcript, setTranscript] = useState(defaultTranscript)

  /**
   * cleanup on component unmounted
   * - flush out and cleanup lamejs encoder instance
   * - destroy recordrtc instance and clear it from ref
   * - clear setTimout for onStopRecording
   * - clean up hark speaking detection listeners and clear it from ref
   * - stop all user's media steaming track and remove it from ref
   */
  useEffect(() => {
    return () => {
      if (chunks.current) {
        chunks.current = []
      }
      if (encoder.current) {
        encoder.current.flush()
        encoder.current = undefined
      }
      if (recorder.current) {
        recorder.current.destroy()
        recorder.current = undefined
      }
      onStopTimeout('stop')
      if (listener.current) {
        // @ts-ignore
        listener.current.off('speaking', onStartSpeaking)
        // @ts-ignore
        listener.current.off('stopped_speaking', onStopSpeaking)
      }
      if (stream.current) {
        stream.current.getTracks().forEach((track) => track.stop())
        stream.current = undefined
      }
    }
  }, [])

  /**
   * if config.autoStart is true
   * start speech recording immediately upon component mounted
   */
  useEffectAsync(async () => {
    if (autoStart) {
      await onStartRecording()
    }
  }, [autoStart])

  /**
   * start speech recording and start listen for speaking event
   */
  const startRecording = async () => {
    await onStartRecording()
  }

  /**
   * pause speech recording also stop media stream
   */
  const pauseRecording = async () => {
    await onPauseRecording()
  }

  /**
   * stop speech recording and start the transcription
   */
  const stopRecording = async () => {
    await onStopRecording()
  }

  /**
   * start speech recording event
   * - first ask user for media stream
   * - create recordrtc instance and pass media stream to it
   * - create lamejs encoder instance
   * - check recorder state and start or resume recorder accordingly
   * - start timeout for stop timeout config
   * - update recording state to true
   */
  const onStartRecording = async () => {
    try {
      if (!stream.current) {
        await onStartStreaming()
      }
      if (stream.current) {
        if (!recorder.current) {
          const { RecordRTCPromisesHandler, StereoAudioRecorder } =
            await import('recordrtc')
          const recorderConfig = {
            mimeType: 'audio/webm', // Assuming a mimeType, update as needed
            numberOfAudioChannels: 1, // Assuming mono, update as needed
            recorderType: StereoAudioRecorder, // Assuming recorderType, update as needed
            sampleRate: 44100, // Assuming sampleRate = 44.1khz
            timeSlice: timeSlice || 1000, // Assuming a default timeSlice, update as needed
            type: 'audio', // Assuming type, update as needed
            ondataavailable: streaming ? onDataAvailable : undefined,
          }
          recorder.current = new RecordRTCPromisesHandler(
            stream.current,
            recorderConfig,
          )
        }
        if (!encoder.current) {
          const { Mp3Encoder } = await import('lamejs')
          encoder.current = new Mp3Encoder(1, 44100, 96) // mono, 44.1khz, 96kbps
        }
        const recordState = await recorder.current.getState()
        if (recordState === 'inactive' || recordState === 'stopped') {
          await recorder.current.startRecording()
        }
        if (recordState === 'paused') {
          await recorder.current.resumeRecording()
        }
        if (nonStop) {
          onStartTimeout('stop')
        }
        setRecording(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * get user media stream event
   * - try to stop all previous media streams
   * - ask user for media stream with a system popup
   * - register hark speaking detection listeners
   */
  const onStartStreaming = async () => {
    try {
      // Stop any existing tracks
      if (stream.current) {
        stream.current.getTracks().forEach((track) => track.stop())
      }

      // Request access to the user's microphone
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true, // Assuming 'audio' is a boolean or valid audio configuration object
      })

      // Initialize hark listener
      if (!listener.current) {
        const hark = await import('hark').then((m) => m.default) // Correcting the dynamic import of hark
        listener.current = hark(stream.current, {
          interval, // Ensure 'interval' is defined
          play, // Ensure 'play' is defined
        })
        listener.current.on('speaking', onStartSpeaking) // Ensure 'onStartSpeaking' is defined
        listener.current.on('stopped_speaking', onStopSpeaking) // Ensure 'onStopSpeaking' is defined
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * start stop timeout event
   */
  const onStartTimeout = (UseWhisperTimeout) => {
    if (!timeout.current[type]) {
      timeout.current[type] = setTimeout(onStopRecording, stopTimeout)
    }
  }

  /**
   * user start speaking event
   * - set speaking state to true
   * - clear stop timeout
   */
  const onStartSpeaking = () => {
    console.log('start speaking')
    setSpeaking(true)
    onStopTimeout('stop')
  }

  /**
   * user stop speaking event
   * - set speaking state to false
   * - start stop timeout back
   */
  const onStopSpeaking = () => {
    console.log('stop speaking')
    setSpeaking(false)
    if (nonStop) {
      onStartTimeout('stop')
    }
  }

  /**
   * pause speech recording event
   * - if recorder state is recording, pause the recorder
   * - clear stop timeout
   * - set recoriding state to false
   */
  const onPauseRecording = async () => {
    try {
      if (recorder.current) {
        const recordState = await recorder.current.getState()
        if (recordState === 'recording') {
          await recorder.current.pauseRecording()
        }
        onStopTimeout('stop')
        setRecording(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * stop speech recording event
   * - flush out lamejs encoder and set it to undefined
   * - if recorder state is recording or paused, stop the recorder
   * - stop user media stream
   * - clear stop timeout
   * - set recording state to false
   * - start Whisper transcription event
   * - destroy recordrtc instance and clear it from ref
   */
  const onStopRecording = async () => {
    try {
      if (recorder.current) {
        const recordState = await recorder.current.getState()
        if (recordState === 'recording' || recordState === 'paused') {
          await recorder.current.stopRecording()
        }
        onStopStreaming()
        onStopTimeout('stop')
        setRecording(false)
        if (autoTranscribe) {
          await onTranscribing()
        } else {
          const blob = await recorder.current.getBlob()
          setTranscript({
            blob,
          })
        }
        await recorder.current.destroy()
        chunks.current = []
        if (encoder.current) {
          encoder.current.flush()
          encoder.current = undefined
        }
        recorder.current = undefined
      }
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * stop media stream event
   * - remove hark speaking detection listeners
   * - stop all media stream tracks
   * - clear media stream from ref
   */
  const onStopStreaming = () => {
    if (listener.current) {
      // @ts-ignore
      listener.current.off('speaking', onStartSpeaking)
      // @ts-ignore
      listener.current.off('stopped_speaking', onStopSpeaking)
      listener.current = undefined
    }
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop())
      stream.current = undefined
    }
  }

  /**
   * stop timeout event
   * - clear stop timeout and remove it from ref
   */
  const onStopTimeout = (UseWhisperTimeout) => {
    if (timeout.current[type]) {
      clearTimeout(timeout.current[type])
      timeout.current[type] = undefined
    }
  }

  /**
   * start Whisper transcrition event
   * - make sure recorder state is stopped
   * - set transcribing state to true
   * - get audio blob from recordrtc
   * - if config.removeSilence is true, load ffmpeg-wasp and try to remove silence from speec
   * - if config.customServer is true, send audio data to custom server in base64 string
   * - if config.customServer is false, send audio data to Whisper api in multipart/form-data
   * - set transcript object with audio blob and transcription result from Whisper
   * - set transcribing state to false
   */
  const onTranscribing = async () => {
    console.log('transcribing speech')
    try {
      if (encoder.current && recorder.current) {
        const recordState = await recorder.current.getState()
        if (recordState === 'stopped') {
          setTranscribing(true)
          let blob = await recorder.current.getBlob()
          if (removeSilence) {
            const { createFFmpeg } = await import('@ffmpeg/ffmpeg')
            const ffmpeg = createFFmpeg({
              mainName: 'main',
              corePath: ffmpegCoreUrl,
              log: true,
            })
            if (!ffmpeg.isLoaded()) {
              await ffmpeg.load()
            }
            const buffer = await blob.arrayBuffer()
            console.log({ in: buffer.byteLength })
            ffmpeg.FS('writeFile', 'in.wav', new Uint8Array(buffer))
            await ffmpeg.run(
              '-i',
              'in.wav',
              '-acodec',
              'libmp3lame',
              '-b:a',
              '96k',
              '-ar',
              '44100',
              '-af',
              silenceRemoveCommand,
              'out.mp3',
            )
            const out = ffmpeg.FS('readFile', 'out.mp3')
            console.log({ out: out.buffer.byteLength })
            if (out.length <= 225) {
              ffmpeg.exit()
              setTranscript({ blob })
              setTranscribing(false)
              return
            }
            blob = new Blob([out.buffer], { type: 'audio/mpeg' })
            ffmpeg.exit()
          } else {
            const buffer = await blob.arrayBuffer()
            console.log({ wav: buffer.byteLength })
            const mp3 = encoder.current.encodeBuffer(new Int16Array(buffer))
            blob = new Blob([mp3], { type: 'audio/mpeg' })
            console.log({ blob, mp3: mp3.byteLength })
          }
          if (typeof onTranscribeCallback === 'function') {
            const transcribed = await onTranscribeCallback(blob)
            console.log('onTranscribe', transcribed)
            setTranscript(transcribed)
          } else {
            const file = new File([blob], 'speech.mp3', { type: 'audio/mpeg' })
            const text = await onWhispered(file)
            console.log('onTranscribing', { text })
            setTranscript({ blob, text })
          }
          setTranscribing(false)
        }
      }
    } catch (err) {
      console.info(err)
      setTranscribing(false)
    }
  }

  /**
   * Send audio file to Whisper to be transcribed
   * - create formdata and append file, model, and language
   * - append more Whisper config if whisperConfig is provided
   * - add OpenAPI Token to header Authorization Bearer
   * - post with axios to OpenAI Whisper transcript endpoint
   * - return transcribed text result
   */
  const onWhispered = useMemoAsync(
    async (file) => {
      // Whisper only accepts multipart/form-data currently
      const body = new FormData()
      body.append('file', file)
      body.append('model', 'whisper-1')
      if (mode === 'transcriptions') {
        body.append('language', whisperConfig?.language ?? 'en')
      }
      if (whisperConfig?.prompt) {
        body.append('prompt', whisperConfig.prompt)
      }
      if (whisperConfig?.response_format) {
        body.append('response_format', whisperConfig.response_format)
      }
      if (whisperConfig?.temperature) {
        body.append('temperature', `${whisperConfig.temperature}`)
      }
      const headers = {}
      headers['Content-Type'] = 'multipart/form-data'
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      const axios = await import('axios').then((m) => m.default) // Correcting the dynamic import of axios
      const response = await axios.post(whisperApiEndpoint + mode, body, {
        headers,
      })
      return response.data.text
    },
    [apiKey, mode, whisperConfig],
  )

  return {
    recording,
    speaking,
    transcribing,
    transcript,
    pauseRecording,
    startRecording,
    stopRecording,
  }
}
