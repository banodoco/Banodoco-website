import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type VoiceRecordingState = 'idle' | 'recording' | 'processing'

interface UseVoiceRecordingOptions {
  onResult?: (result: { transcription: string; prompt?: string }) => void
  onError?: (error: string) => void
  task?: 'transcribe_only' | 'transcribe_and_write'
  context?: string
  example?: string
  existingValue?: string
}

const MAX_RECORDING_SECONDS = 60

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const { onResult, onError, task = 'transcribe_and_write', context = '', example = '', existingValue = '' } = options

  const [state, setState] = useState<VoiceRecordingState>('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(MAX_RECORDING_SECONDS)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanupAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
    setRemainingSeconds(MAX_RECORDING_SECONDS)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up audio analysis for visual feedback
      try {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        audioContextRef.current = audioContext
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray)
            const sum = dataArray.reduce((acc, freq) => acc + freq, 0)
            const avg = sum / dataArray.length
            const normalized = Math.min(1, (avg / 128) * 1.5)
            setAudioLevel(normalized)
            animationFrameRef.current = requestAnimationFrame(updateLevel)
          }
        }
        updateLevel()
      } catch {
        // Continue without audio level monitoring
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/wav'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        cleanupAudioAnalysis()

        setState('processing')

        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType })

          const extension = mimeType.includes('webm') ? 'webm'
            : mimeType.includes('mp4') ? 'm4a'
              : 'wav'

          const formData = new FormData()
          formData.append('audio', audioBlob, `recording.${extension}`)
          formData.append('task', task)
          if (context) formData.append('context', context)
          if (example) formData.append('example', example)
          if (existingValue) formData.append('existingValue', existingValue)

          if (!supabase) {
            onError?.('Supabase is not configured')
            setState('idle')
            return
          }
          const { data, error } = await supabase.functions.invoke('ai-voice-prompt', {
            body: formData,
          })

          if (error) {
            onError?.(error.message || 'Failed to process voice')
            setState('idle')
            return
          }

          if (data?.error) {
            onError?.(data.error)
            setState('idle')
            return
          }

          onResult?.({
            transcription: data.transcription,
            prompt: data.prompt,
          })
          setState('idle')
        } catch (err: unknown) {
          onError?.(err instanceof Error ? err.message : 'Failed to process recording')
          setState('idle')
        }
      }

      mediaRecorder.onerror = (event: Event) => {
        const mediaError = (event as Event & { error?: Error }).error
        onError?.(mediaError?.message || 'Recording error')
        setState('idle')
      }

      mediaRecorder.start()
      setState('recording')
      setRemainingSeconds(MAX_RECORDING_SECONDS)

      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = prev - 1
          return next >= 0 ? next : 0
        })
      }, 1000)

      autoStopTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, MAX_RECORDING_SECONDS * 1000)
    } catch (err: unknown) {
      const errName = err instanceof Error ? err.name : ''
      if (errName === 'NotAllowedError') {
        onError?.('Microphone access denied. Please allow microphone access.')
      } else if (errName === 'NotFoundError') {
        onError?.('No microphone found. Please connect a microphone.')
      } else {
        onError?.(err instanceof Error ? err.message : 'Failed to start recording')
      }
      setState('idle')
    }
  }, [task, context, example, existingValue, onResult, onError, cleanupAudioAnalysis])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        cleanupAudioAnalysis()
      }

      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }

      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop())
    }

    cleanupAudioAnalysis()
    chunksRef.current = []
    setState('idle')
  }, [cleanupAudioAnalysis])

  const toggleRecording = useCallback(() => {
    if (state === 'recording') {
      stopRecording()
    } else if (state === 'idle') {
      void startRecording()
    }
  }, [state, startRecording, stopRecording])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current = null
      }
      chunksRef.current = []
      cleanupAudioAnalysis()
    }
  }, [cleanupAudioAnalysis])

  return {
    state,
    audioLevel,
    remainingSeconds,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    isActive: state !== 'idle',
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
  }
}
