import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';

import { getOrCreateDeviceId } from '@/utils/deviceId';

const DEFAULT_SERVER_URL = 'http://localhost:3000';
// Beta builds tunnel to a locally running WebSocket server via ngrok.
// Set EXPO_PUBLIC_SOCKET_SERVER_URL to the active tunnel URL.
const SOCKET_SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_SERVER_URL || DEFAULT_SERVER_URL;

export type SocketContextValue = {
  socket: Socket | null;
  deviceId: string | null;
  connected: boolean;
  serverUrl: string;
  connectionError: string | null;
  transport: string | null;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  deviceId: null,
  connected: false,
  serverUrl: '',
  connectionError: null,
  transport: null,
});

export function useSocket() {
  return useContext(SocketContext);
}

export type SocketProviderProps = {
  children: React.ReactNode;
  serverUrl?: string;
};

export function SocketProvider({
  children,
  serverUrl = process.env.EXPO_PUBLIC_SOCKET_SERVER_URL || DEFAULT_SERVER_URL,
}: SocketProviderProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [transport, setTransport] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getOrCreateDeviceId().then((id) => {
      if (!isMounted) return;
      setDeviceId(id);

      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        timeout: 20000,
      });

      setSocketState(socket);

      const joinLobby = () => {
        setConnected(true);
        setConnectionError(null);
        setTransport(socket.io.engine?.transport?.name ?? null);
        socket.emit('join-lobby', { deviceId: id });
      };

      socket.on('connect', () => {
        if (!isMounted) return;
        joinLobby();
      });

      socket.on('disconnect', (reason) => {
        if (!isMounted) return;
        setConnected(false);
        setTransport(null);
        if (reason === 'io server disconnect') {
          setConnectionError('Disconnected by server');
        }
      });

      socket.on('connect_error', (err) => {
        if (!isMounted) return;
        setConnected(false);
        setConnectionError(err.message);
        console.warn('Socket connect error:', err.message);
      });

      socket.on('reconnect', () => {
        if (!isMounted) return;
        joinLobby();
      });

      // Handle race where socket connects before listener is attached
      if (socket.connected) {
        joinLobby();
      }
    }).catch((err) => {
      if (!isMounted) return;
      console.error('Failed to initialize socket:', err);
      setConnectionError(err?.message ?? 'Failed to initialize socket');
    });

    return () => {
      isMounted = false;
      setSocketState((current) => {
        current?.disconnect();
        return null;
      });
    };
  }, [serverUrl]);

  const value: SocketContextValue = {
    socket: socketState,
    deviceId,
    connected,
    serverUrl,
    connectionError,
    transport,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
