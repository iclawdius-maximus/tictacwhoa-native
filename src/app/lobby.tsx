import { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/tictacwhoa/Button';
import { useSocket } from '@/contexts/SocketContext';

export default function LobbyScreen() {
  const router = useRouter();
  const { socket, deviceId, connected, serverUrl, connectionError, transport } = useSocket();
  const [searching, setSearching] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [lobbyUsers, setLobbyUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);

  useEffect(() => {
    if (!socket) return;
    if (matchStarted) return;

    const onLobbyUpdate = (data: { users: { userData?: { deviceId?: string } }[] }) => {
      setLobbyUsers(data.users.map((u) => u.userData?.deviceId ?? 'unknown'));
    };

    const onGameStarted = (data: {
      roomId: string;
      playerSymbol: 'X' | 'O';
      opponent: { deviceId: string };
      isPlayerTurn: boolean;
    }) => {
      console.log('[lobby] game-started', data);
      setMatchStarted(true);
      setSearching(false);
      router.push({
        pathname: '/game/[id]',
        params: {
          id: data.roomId,
          playerSymbol: data.playerSymbol,
          opponentId: data.opponent.deviceId,
          isPlayerTurn: String(data.isPlayerTurn),
        },
      });
    };

    const onInviteCreated = (data: { roomCode: string }) => {
      console.log('[lobby] invite-created', data);
      setGeneratedCode(data.roomCode);
    };

    const onJoinError = (data: { message: string }) => {
      console.log('[lobby] join-error', data);
      setError(data.message);
      setSearching(false);
    };

    socket.on('lobby-update', onLobbyUpdate);
    socket.on('game-started', onGameStarted);
    socket.on('invite-created', onInviteCreated);
    socket.on('join-error', onJoinError);

    return () => {
      socket.off('lobby-update', onLobbyUpdate);
      socket.off('game-started', onGameStarted);
      socket.off('invite-created', onInviteCreated);
      socket.off('join-error', onJoinError);
    };
  }, [socket, router, matchStarted]);

  const handleRandomMatchmaking = () => {
    if (!socket || !deviceId) return;
    setError(null);
    setSearching(true);
    socket.emit('search-game');
  };

  const handleGenerateInvite = () => {
    if (!socket || !deviceId) return;
    setError(null);
    socket.emit('create-invite');
  };

  const handleJoinInvite = () => {
    if (!socket || !deviceId || !roomCode.trim()) return;
    setError(null);
    setSearching(true);
    socket.emit('join-invite', roomCode.trim().toUpperCase());
  };

  const canMatchmake = !!socket && connected;

  return (
    <ImageBackground
      source={require('@/assets/img/Background_lrg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="titleGlow" style={styles.title}>
            Matchmaking
          </ThemedText>

          <ThemedView style={styles.statusBox}>
            <ThemedText type="smallBold" style={styles.statusText}>
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </ThemedText>
            <ThemedText type="small" style={styles.statusDetail}>
              Server: {serverUrl || '—'}
            </ThemedText>
            {transport ? (
              <ThemedText type="small" style={styles.statusDetail}>
                Transport: {transport}
              </ThemedText>
            ) : null}
            {connectionError ? (
              <ThemedText type="small" style={styles.errorText}>
                Error: {connectionError}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.optionsContainer}>
            <Button
              title={searching ? 'Searching...' : 'Random Matchmaking'}
              onPress={handleRandomMatchmaking}
              disabled={searching || !canMatchmake}
            />

            <ThemedView style={styles.divider} />

            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Invite Friend
            </ThemedText>

            {generatedCode ? (
              <ThemedView style={styles.roomCodeContainer}>
                <ThemedText type="default" style={styles.roomCodeText}>
                  Room Code: {generatedCode}
                </ThemedText>
                <ThemedText type="small" style={styles.waitingText}>
                  Waiting for opponent to join...
                </ThemedText>
              </ThemedView>
            ) : (
              <Button title="Generate Room Code" onPress={handleGenerateInvite} disabled={!canMatchmake} />
            )}

            <ThemedView style={styles.divider} />

            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Join by Room Code
            </ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter room code"
                placeholderTextColor="#aaa"
                value={roomCode}
                onChangeText={setRoomCode}
                autoCapitalize="characters"
                maxLength={6}
              />
              <Button
                title="Join"
                onPress={handleJoinInvite}
                disabled={!roomCode.trim() || !canMatchmake}
              />
            </View>

            {error ? (
              <ThemedText type="small" style={styles.error} themeColor="text">
                {error}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.lobbyList}>
            <ThemedText type="smallBold" style={styles.lobbyTitle}>
              Players online: {lobbyUsers.length}
            </ThemedText>
            {lobbyUsers.slice(0, 8).map((id, idx) => (
              <ThemedText key={idx} type="small" style={styles.lobbyUser}>
                {id}
              </ThemedText>
            ))}
          </ThemedView>

          <Link href="/" asChild>
            <Button title="Back to Home" variant="secondary" style={styles.backButton} />
          </Link>
        </ThemedView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 500,
    width: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    marginTop: 16,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(51,51,51,0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  divider: {
    height: 1,
    width: '80%',
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  roomCodeContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    width: '100%',
  },
  roomCodeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  waitingText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  statusBox: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'rgba(51,51,51,0.85)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#fff',
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
  },
  statusDetail: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    width: '80%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    fontFamily: 'BungeeInline-Regular',
  },
  error: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  lobbyList: {
    width: '100%',
    backgroundColor: 'rgba(51,51,51,0.85)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#fff',
    maxHeight: 140,
  },
  lobbyTitle: {
    marginBottom: 8,
    color: '#fff',
  },
  lobbyUser: {
    color: '#fff',
  },
  backButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});
