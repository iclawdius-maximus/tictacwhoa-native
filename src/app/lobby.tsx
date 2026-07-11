import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/tictacwhoa/Button';
import { useSocket } from '@/contexts/SocketContext';

export default function LobbyScreen() {
  const router = useRouter();
  const { mode, createInvite, joinInvite } = useLocalSearchParams();
  const { socket, deviceId, connected, serverUrl } = useSocket();
  const [searching, setSearching] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [lobbyUsers, setLobbyUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [autoInviteCreated, setAutoInviteCreated] = useState(false);

  const selectedMode = mode ? String(mode) : 'free-for-all';

  // Share a ready invite (generate one first if needed)
  const handleSendGameInvite = async () => {
    if (!socket || !deviceId) return;
    setError(null);

    let roomCodeToShare = generatedCode;
    if (!roomCodeToShare) {
      socket.emit('create-invite', { mode: selectedMode });
      roomCodeToShare = await new Promise<string>((resolve) => {
        const onCreated = (data: { roomCode: string }) => {
          setGeneratedCode(data.roomCode);
          socket.off('invite-created', onCreated);
          resolve(data.roomCode);
        };
        socket.on('invite-created', onCreated);
      });
    }

    const url = `tictacwhoa://lobby?joinInvite=${encodeURIComponent(roomCodeToShare)}&mode=${encodeURIComponent(selectedMode)}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const shareMessage = `🔥 You're invited to Tic Tac WHOA! Join my game with code ${roomCodeToShare}: ${url}`;

    try {
      await Sharing.shareAsync(url, {
        dialogTitle: 'Send Game Invite',
      });
    } catch (err) {
      console.log('[lobby] share cancelled or failed', err);
    }
  };

  // Handle incoming invite deep links
  useEffect(() => {
    let isMounted = true;

    const handleUrl = (url: string | null) => {
      if (!url || !isMounted) return;
      const parsed = Linking.parse(url);
      const inviteCode = parsed.queryParams?.joinInvite ?? parsed.queryParams?.['joinInvite'];
      const inviteMode = parsed.queryParams?.mode ?? parsed.queryParams?.['mode'];
      if (typeof inviteCode === 'string' && inviteCode.trim()) {
        const code = inviteCode.trim().toUpperCase();
        setRoomCode(code);
        if (socket && deviceId) {
          setError(null);
          setSearching(true);
          socket.emit('join-invite', code);
        }
      }
      if (typeof inviteMode === 'string' && inviteMode.trim()) {
        // Mode is included in the deep link; router params are already reflected
        // by expo-router when it parses the URL, so no extra work is needed here.
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [socket, deviceId]);

  // Handle deep-link navigation params when the app is launched via a link
  // handled by expo-router routing directly to this screen.
  useEffect(() => {
    if (joinInvite && socket && deviceId) {
      const code = String(joinInvite).trim().toUpperCase();
      setRoomCode(code);
      setError(null);
      setSearching(true);
      socket.emit('join-invite', code);
    }
  }, [joinInvite, socket, deviceId]);

  useEffect(() => {
    if (!socket || autoInviteCreated) return;
    if (createInvite === 'true') {
      setAutoInviteCreated(true);
      socket.emit('create-invite', { mode: selectedMode });
    }
  }, [socket, createInvite, selectedMode, autoInviteCreated]);

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
      mode?: string;
      loadout?: string[];
    }) => {
      console.log('[lobby] game-started', data);
      setMatchStarted(true);
      setSearching(false);
      
      // If it's a loadout game, navigate to loadout screen first
      if (data.mode === 'loadout') {
        router.push({
          pathname: '/loadout' as any,
          params: {
            roomId: data.roomId,
            playerSymbol: data.playerSymbol,
            opponentId: data.opponent.deviceId,
            isPlayerTurn: String(data.isPlayerTurn),
            mode: data.mode,
          },
        });
      } else {
        router.push({
          pathname: '/game/[id]',
          params: {
            id: data.roomId,
            playerSymbol: data.playerSymbol,
            opponentId: data.opponent.deviceId,
            isPlayerTurn: String(data.isPlayerTurn),
            mode: data.mode,
            loadout: data.loadout ? JSON.stringify(data.loadout) : undefined,
          },
        });
      }
    };

    const onLoadoutStarted = (data: {
      roomId: string;
      playerSymbol: 'X' | 'O';
      opponent: { deviceId: string };
      isPlayerTurn: boolean;
      mode: string;
    }) => {
      console.log('[lobby] loadout-started', data);
      setMatchStarted(true);
      setSearching(false);
      
      // Navigate to loadout screen
      router.push({
        pathname: '/loadout' as any,
        params: {
          roomId: data.roomId,
          playerSymbol: data.playerSymbol,
          opponentId: data.opponent.deviceId,
          isPlayerTurn: String(data.isPlayerTurn),
          mode: data.mode,
        },
      });
    };

    const onGameRejoined = (data: {
      roomId: string;
      playerSymbol: string;
      opponent: { deviceId: string };
      isPlayerTurn: boolean;
      gameState: {
        grid: (string | null)[][];
        currentTurn: string;
        usedPowerMoves: { 
          X: { flip: boolean; swap: boolean; mojo: boolean; trap: boolean; shield: boolean; cloak: boolean };
          O: { flip: boolean; swap: boolean; mojo: boolean; trap: boolean; shield: boolean; cloak: boolean } 
        };
        gameOver: boolean;
        winner: string | null;
        shieldPositions?: { row: number; col: number }[];
        trapPositions?: { row: number; col: number }[];
        cloakPositions?: { row: number; col: number }[];
      }
    }) => {
      console.log('[lobby] game-rejoined', data);
      setMatchStarted(true);
      setSearching(false);
      router.push({
        pathname: '/game/[id]',
        params: {
          id: data.roomId,
          playerSymbol: data.playerSymbol,
          opponentId: data.opponent.deviceId,
          isPlayerTurn: String(data.isPlayerTurn),
          // Pass the game state as well
          gameState: JSON.stringify(data.gameState),
        },
      });
    };

    const onInviteCreated = (data: { roomCode: string; mode?: string }) => {
      console.log('[lobby] invite-created', data);
      setGeneratedCode(data.roomCode);
      
      // If mode is loadout, we might need to handle differently
      if (data.mode === 'loadout') {
        // Could show special UI for loadout invites if needed
      }
    };

    const onJoinError = (data: { message: string }) => {
      console.log('[lobby] join-error', data);
      setError(data.message);
      setSearching(false);
    };

    socket.on('lobby-update', onLobbyUpdate);
    socket.on('game-started', onGameStarted);
    socket.on('loadout-started', onLoadoutStarted);
    socket.on('game-rejoined', onGameRejoined);
    socket.on('invite-created', onInviteCreated);
    socket.on('join-error', onJoinError);

    return () => {
      socket.off('lobby-update', onLobbyUpdate);
      socket.off('game-started', onGameStarted);
      socket.off('loadout-started', onLoadoutStarted);
      socket.off('game-rejoined', onGameRejoined);
      socket.off('invite-created', onInviteCreated);
      socket.off('join-error', onJoinError);
    };
  }, [socket, router, matchStarted]);

  const handleRandomMatchmaking = () => {
    if (!socket || !deviceId) return;
    setError(null);
    setSearching(true);
    socket.emit('search-game', { mode: selectedMode });
  };

  const handleGenerateInvite = () => {
    if (!socket || !deviceId) return;
    setError(null);
    socket.emit('create-invite', { mode: selectedMode });
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerBackVisible: false,
          headerLeft: (props) =>
            props.canGoBack ? (
              <Pressable onPress={() => router.back()} style={{ marginLeft: 8, padding: 8 }}>
                <ThemedText style={{ color: '#fff', fontSize: 34, lineHeight: 34 }}>‹</ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={{ alignItems: 'center', gap: 16 }} style={styles.contentScroll}>
          <ThemedView style={styles.content}>
            <ThemedText type="titleGlow" style={styles.title}>
              Matchmaking
            </ThemedText>

            {selectedMode && selectedMode !== 'free-for-all' && (
              <ThemedView style={styles.modeBox}>
                <ThemedText type="smallBold" style={styles.modeText}>
                  Mode: {selectedMode}
                </ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.statusBox}>
              <ThemedText type="smallBold" style={styles.statusText}>
                {connected ? '🟢 Connected' : '🔴 Disconnected'}
              </ThemedText>
              <ThemedText type="small" style={styles.statusDetail}>
                Server: {serverUrl || '—'}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.optionsContainer}>
              <Button
                title={searching ? 'Searching...' : 'Random Matchmaking'}
                onPress={handleRandomMatchmaking}
                disabled={searching || !canMatchmake}
              />

              <Button
                title="Send Game Invite"
                onPress={handleSendGameInvite}
                disabled={!canMatchmake}
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
          </ThemedView>
        </ScrollView>
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
    maxWidth: 500,
    width: '100%',
    backgroundColor: 'transparent',
  },
  contentScroll: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    marginTop: 16,
  },
  modeBox: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#fff',
    gap: 4,
  },
  modeText: {
    color: '#fff',
    fontSize: 16,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    color: '#fff',
  },
  roomCodeContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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