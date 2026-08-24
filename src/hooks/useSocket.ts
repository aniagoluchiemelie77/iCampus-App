import React, { createContext, useContext, ReactNode, useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType | null>(null);

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
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};