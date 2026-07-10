import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { getOrCreateDeviceId } from '@/utils/deviceId';

const DEFAULT_SERVER_URL = 'http://localhost:3000';

export type SocketContextValue = {
  socket: Socket | null;
  deviceId: string | null;
  connected: boolean;
  serverUrl: string;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  deviceId: null,
  connected: false,
  serverUrl: '',
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
  serverUrl = process.env.SOCKET_SERVER_URL || DEFAULT_SERVER_URL,
}: SocketProviderProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketState, setSocketState] = useState<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    getOrCreateDeviceId().then((id) => {
      if (!isMounted) return;
      setDeviceId(id);

      const socket = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
      });

      setSocketState(socket);

      socket.on('connect', () => {
        if (!isMounted) return;
        setConnected(true);
        socket.emit('join-lobby', { deviceId: id });
      });

      socket.on('disconnect', () => {
        if (!isMounted) return;
        setConnected(false);
      });

      socket.on('connect_error', (err) => {
        if (!isMounted) return;
        console.warn('Socket connect error:', err.message);
      });
    }).catch((err) => {
      if (!isMounted) return;
      console.error('Failed to initialize socket:', err);
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
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
