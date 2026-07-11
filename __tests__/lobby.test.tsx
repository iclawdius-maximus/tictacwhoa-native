import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';

import LobbyScreen from '@/app/lobby';
import { useSocket } from '@/contexts/SocketContext';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}));

jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-linking', () => ({
  parse: jest.fn((url: string) => {
    const [scheme, rest] = url.split('://');
    const [path, query = ''] = rest.split('?');
    const params: Record<string, string> = {};
    query.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key) params[key] = decodeURIComponent(value ?? '');
    });
    return { scheme, path, queryParams: params };
  }),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

describe('LobbyScreen Send Game Invite', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: true,
  };
  const mockRouter = { push: jest.fn(), back: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ mode: 'loadout' });
    (useSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      deviceId: 'test-device',
      connected: true,
      serverUrl: 'https://example.com',
      connectionError: null,
      transport: 'websocket',
    });
  });

  it('renders the Send Game Invite button below Random Matchmaking', async () => {
    const result = await render(<LobbyScreen />);
    const buttons = result.getAllByRole('button');
    const labels = buttons.map((b) => b.props.accessibilityLabel);
    expect(labels).toContain('Random Matchmaking');
    expect(labels).toContain('Send Game Invite');
    const randomIndex = labels.indexOf('Random Matchmaking');
    const sendIndex = labels.indexOf('Send Game Invite');
    expect(sendIndex).toBeGreaterThan(randomIndex);
  });

  it('generates a room code and calls Sharing.shareAsync with the deep link when pressed', async () => {
    // Simulate invite-created response on create-invite emit
    mockSocket.emit.mockImplementation((event: string, payload?: unknown) => {
      if (event === 'create-invite') {
        setTimeout(() => {
          mockSocket.on.mock.calls
            .filter(([name]: [string, ...unknown[]]) => name === 'invite-created')
            .forEach(([, handler]: [string, (data: { roomCode: string }) => void]) => {
              handler({ roomCode: 'A1B2C3' });
            });
        }, 10);
      }
    });

    const shareSpy = Sharing.shareAsync as jest.Mock;
    shareSpy.mockResolvedValue(undefined);

    const result = await render(<LobbyScreen />);
    const sendButton = await result.findByRole('button', { name: 'Send Game Invite' });

    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('create-invite', { mode: 'loadout' });
    });

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
      const [url, options] = shareSpy.mock.calls[0];
      expect(url).toBe('tictacwhoa://lobby?joinInvite=A1B2C3&mode=loadout');
      expect(options.dialogTitle).toBe('Send Game Invite');
    });
  });

  it('reuses an existing room code for sharing when one is already shown', async () => {
    mockSocket.on.mockImplementation((event: string, handler: (data: { roomCode: string }) => void) => {
      if (event === 'invite-created') {
        // Simulate that the server already returned the code before render
        setTimeout(() => handler({ roomCode: 'X9Y9Z9' }), 0);
      }
    });

    const shareSpy = Sharing.shareAsync as jest.Mock;
    shareSpy.mockResolvedValue(undefined);

    const result = await render(<LobbyScreen />);

    await waitFor(() => {
      expect(result.getByText('Room Code: X9Y9Z9')).toBeTruthy();
    });

    const sendButton = await result.findByRole('button', { name: 'Send Game Invite' });
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
      const [url] = shareSpy.mock.calls[0];
      expect(url).toContain('joinInvite=X9Y9Z9');
      expect(url).toContain('mode=loadout');
    });

    // Should not generate a new invite when code already exists
    expect(mockSocket.emit).not.toHaveBeenCalledWith('create-invite', expect.anything());
  });

  it('auto-joins an invite when opened via deep link params', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      mode: 'free-for-all',
      joinInvite: 'Z1Z1Z1',
    });

    await render(<LobbyScreen />);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join-invite', 'Z1Z1Z1');
    });
  });

  it('auto-joins an invite when an incoming url event is received', async () => {
    let urlHandler: ((event: { url: string }) => void) | undefined;
    (Linking.addEventListener as jest.Mock).mockImplementation((event: string, handler: (e: { url: string }) => void) => {
      if (event === 'url') {
        urlHandler = handler;
      }
      return { remove: jest.fn() };
    });
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);

    await render(<LobbyScreen />);

    const url = 'tictacwhoa://lobby?joinInvite=B2B2B2&mode=loadout';
    urlHandler?.({ url });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join-invite', 'B2B2B2');
    });
  });
});
