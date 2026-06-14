import { useRef, useEffect } from 'react';
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

export const useLiveTranscription = ({
  lectureId,
  isHost,
  currentUserFirstName,
  isMicActive,
  onTranscriptChunk,
}: UseLiveTranscriptionProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const speakerLabel = isHost ? 'Host:' : `${currentUserFirstName}:`;

  useEffect(() => {
    if (!isMicActive) {
      safelyDisconnect();
      return;
    }

    const initializeDeepgramFrontend = async () => {
      try {
        const token = await getDeepgramTemporalToken(lectureId);

    if (!token) {
      console.warn('[DEEPGRAM_INIT] Cancelled due to missing valid authorization token payload.');
      return; 
    }
        const wsUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2-general&language=en&smart_format=true&interim_results=false';
        wsRef.current = new WebSocket(wsUrl, ['token', token]);

        wsRef.current.onopen = () => {
          console.log('[DEEPGRAM_WS] Real-time audio pipeline successfully secured.');
        };
wsRef.current.onmessage = (event: any) => {
  try {
    if (!event || typeof event.data !== 'string') return;
    const data: DeepgramTranscriptResponse = JSON.parse(event.data);
    const transcriptText = data.channel?.alternatives?.[0]?.transcript;

    if (transcriptText && transcriptText.trim() !== '') {
      onTranscriptChunk(speakerLabel, transcriptText.trim());
    }
  } catch (e) {
    // Gracefully handle internal JSON parsing edge cases or keep-alive metadata chunks
  }
};

        wsRef.current.onerror = (error) => {
          console.error('[DEEPGRAM_WS_ERROR] Critical channel disruption:', error);
        };

        wsRef.current.onclose = () => {
          console.log('[DEEPGRAM_WS] Audio pipeline cleanly closed.');
        };

      } catch (err) {
        console.error('[TRANSCRIPTION_INIT_FAILED]', err);
      }
    };

    initializeDeepgramFrontend();

    return () => safelyDisconnect();
  }, [isMicActive, lectureId, onTranscriptChunk, speakerLabel]);

  const safelyDisconnect = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  };
  const sendAudioChunkToDeepgram = (rawAudioBuffer: ArrayBuffer | Blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(rawAudioBuffer);
    }
  };

  return { sendAudioChunkToDeepgram };
};