
  apiKey?
  autoStart?
  autoTranscribe?
  mode? | 'translations'
  nonStop?
  removeSilence?
  stopTimeout?
  streaming?
  timeSlice?
  whisperConfig?
  onDataAvailable? => void
  onTranscribe? => Promise
}


  stop?
}


  blob?
  text?
}


  recording
  speaking
  transcribing
  transcript
  pauseRecording => Promise
  startRecording => Promise
  stopRecording => Promise
}




  model? | string
  prompt?
  response_format? | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?
  language?
}
