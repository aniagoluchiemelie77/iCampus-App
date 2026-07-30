import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketConnectionProps {
  baseUrl: string;
  userId?: string | number | null;
}

export const useSocketConnection = ({ baseUrl, userId }: UseSocketConnectionProps) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!baseUrl || !userId) return;

    const socket = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: String(userId) },
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [baseUrl, userId]);

  return socketRef;
};