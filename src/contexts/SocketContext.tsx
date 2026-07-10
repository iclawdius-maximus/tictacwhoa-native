import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { getOrCreateDeviceId } from '@/utils/deviceId';

export type ServerConfig = {
  host: string;
  port: number;
};

const DEFAULT_SERVER: ServerConfig = {
  host: process.env.SOCKET_SERVER_URL ? new URL(process.env.SOCKET_SERVER_URL).hostname : 'localhost',
  port: process.env.SOCKET_SERVER_URL ? Number(new URL(process.env.SOCKET_SERVER_URL).port) || 443 : 3000,
};

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
  serverConfig?: ServerConfig;
};

export function SocketProvider({ children, serverConfig = DEFAULT_SERVER }: SocketProviderProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketState, setSocketState] = useState<Socket | null>(null);

  const serverUrl = `http://${serverConfig.host}:${serverConfig.port}`;

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
