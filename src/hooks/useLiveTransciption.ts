import { useRef, useEffect, useCallback } from 'react';
import {getDeepgramTemporalToken} from '../api/localGetApis';

interface DeepgramTranscriptResponse {
  channel: {
    alternatives: Array<{
      transcript: string;
    }>;
  };
}

interface UseLiveTranscriptionProps {
  lectureId: string;
  isHost: boolean;
  currentUserFirstName: string;
  isMicActive: boolean;
  onTranscriptChunk: (speakerLabel: string, text: string) => void;
}

// react-native-live-audio-stream emits raw 16-bit PCM at 16 kHz mono, so
// Deepgram must be told the encoding explicitly (there is no container header).
const DEEPGRAM_WS_URL =
  'wss://api.deepgram.com/v1/listen?model=nova-2-general&language=en' +
  '&smart_format=true&interim_results=false' +
  '&encoding=linear16&sample_rate=16000&channels=1';

export const useLiveTranscription = ({
  lectureId,
  isHost,
  currentUserFirstName,
  isMicActive,
  onTranscriptChunk,
}: UseLiveTranscriptionProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const speakerLabel = isHost ? 'Host:' : `${currentUserFirstName}:`;
  // Callers pass inline callbacks; keeping the latest one in a ref stops the
  // socket from reconnecting (and minting a new token) on every render.
  const onChunkRef = useRef(onTranscriptChunk);
  onChunkRef.current = onTranscriptChunk;

  useEffect(() => {
    if (!isMicActive) return;
    let cancelled = false;

    const initializeDeepgramFrontend = async () => {
      try {
        const token = await getDeepgramTemporalToken(lectureId);
        if (cancelled) return;
        if (!token) {
          console.warn('[DEEPGRAM_INIT] Cancelled due to missing valid authorization token payload.');
          return;
        }
        // Short-lived grant tokens authenticate with the "bearer" subprotocol.
        const ws = new WebSocket(DEEPGRAM_WS_URL, ['bearer', token]);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[DEEPGRAM_WS] Real-time audio pipeline successfully secured.');
        };
        ws.onmessage = (event: any) => {
          try {
            if (!event || typeof event.data !== 'string') return;
            const data: DeepgramTranscriptResponse = JSON.parse(event.data);
            const transcriptText = data.channel?.alternatives?.[0]?.transcript;
            if (transcriptText && transcriptText.trim() !== '') {
              onChunkRef.current(speakerLabel, transcriptText.trim());
            }
          } catch (e) {
            // Keep-alive and metadata frames are not transcripts.
          }
        };
        ws.onerror = (error) => {
          console.error('[DEEPGRAM_WS_ERROR] Critical channel disruption:', error);
        };
        ws.onclose = () => {
          console.log('[DEEPGRAM_WS] Audio pipeline cleanly closed.');
        };
      } catch (err) {
        console.error('[TRANSCRIPTION_INIT_FAILED]', err);
      }
    };

    initializeDeepgramFrontend();

    return () => {
      cancelled = true;
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
    };
  }, [isMicActive, lectureId, speakerLabel]);

  const sendAudioChunkToDeepgram = useCallback(
    (rawAudioBuffer: ArrayBuffer | Blob) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(rawAudioBuffer);
      }
    },
    [],
  );

  return { sendAudioChunkToDeepgram };
};
