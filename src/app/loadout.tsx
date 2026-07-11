import { useEffect, useState } from 'react';
import { ImageBackground, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/tictacwhoa/Button';
import { PowerMoveButton } from '@/components/tictacwhoa/PowerMoveButton';
import { useSocket } from '@/contexts/SocketContext';

type PowerMoveType = 'flip' | 'swap' | 'mojo' | 'trap' | 'shield' | 'cloak';

const powerMoves: PowerMoveType[] = ['flip', 'swap', 'mojo', 'trap', 'shield', 'cloak'];

export default function LoadoutScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const { roomId, playerSymbol, opponentId, mode } = useLocalSearchParams();

  const [selectedMoves, setSelectedMoves] = useState<PowerMoveType[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMove, setInfoMove] = useState<PowerMoveType | null>(null);

  const roomIdStr = String(roomId);
  const playerSymbolStr = String(playerSymbol);
  const opponentIdStr = String(opponentId);
  const modeStr = String(mode);

  useEffect(() => {
    if (!socket) return;

    const onLoadoutSubmitted = () => {
      setHasSubmitted(true);
    };

    const onOpponentSubmitted = () => {
      setOpponentSubmitted(true);
    };

    const onMoveError = (data: { message: string }) => {
      setError(data.message);
    };

    const onGameStarted = (data: {
      roomId: string;
      playerSymbol: 'X' | 'O';
      opponent: { deviceId: string };
      isPlayerTurn: boolean;
      mode: string;
      loadout?: PowerMoveType[];
    }) => {
      console.log('[loadout] game-started', data);
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
    };

    socket.on('loadout-submitted', onLoadoutSubmitted);
    socket.on('opponent-submitted-loadout', onOpponentSubmitted);
    socket.on('move-error', onMoveError);
    socket.on('game-started', onGameStarted);

    return () => {
      socket.off('loadout-submitted', onLoadoutSubmitted);
      socket.off('opponent-submitted-loadout', onOpponentSubmitted);
      socket.off('move-error', onMoveError);
      socket.off('game-started', onGameStarted);
    };
  }, [socket, router]);

const POWER_MOVE_INFO: Record<PowerMoveType, { name: string; description: string }> = {
    flip: { name: 'Flip', description: 'Tap an opponent tile to flip it to your symbol.' },
    swap: { name: 'Swap', description: 'Tap two adjacent tiles to swap their positions.' },
    mojo: { name: 'Mojo', description: 'Reveal all hidden tiles, then make one normal move.' },
    trap: { name: 'Trap', description: 'Hide a trap on an empty tile. When your opponent places there, it flips to your tile and they lose their turn.' },
    shield: { name: 'Shield', description: 'Place a tile or shield an existing tile so it cannot be flipped or swapped by your opponent.' },
    cloak: { name: 'Cloak', description: 'Hide a tile on an empty space. When your opponent lands on it, it is revealed and they lose their turn.' },
  };

  const handlePowerMovePress = (move: PowerMoveType) => {
    setInfoMove(move);
  };

  const handleConfirmMove = () => {
    if (!infoMove) return;
    if (selectedMoves.includes(infoMove)) {
      setSelectedMoves(selectedMoves.filter(m => m !== infoMove));
    } else if (selectedMoves.length < 3) {
      setSelectedMoves([...selectedMoves, infoMove]);
    }
    setInfoMove(null);
  };

  const handleCancelInfo = () => {
    setInfoMove(null);
  };

  const handleSubmitLoadout = () => {
    if (selectedMoves.length !== 3) {
      setError('Please select exactly 3 power moves');
      return;
    }

    if (!socket) return;

    socket.emit('submit-loadout', {
      roomId: roomIdStr,
      playerSymbol: playerSymbolStr,
      loadout: selectedMoves
    });
    setHasSubmitted(true);
    setError(null);
  };

  const powerMoves: PowerMoveType[] = ['flip', 'swap', 'mojo', 'trap', 'shield', 'cloak'];

  return (
    <ImageBackground
      source={require('@/assets/img/Background_lrg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="titleGlow" style={styles.title}>
            Loadout Selection
          </ThemedText>

          <ThemedText type="subtitle" style={styles.modeText}>
            Game Mode: {modeStr}
          </ThemedText>

          <ThemedText type="default" style={styles.selectionText}>
            Selected {selectedMoves.length} / 3
          </ThemedText>

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          {hasSubmitted && !opponentSubmitted && (
            <ThemedText type="default" style={styles.statusText}>
              Waiting for opponent to submit their loadout...
            </ThemedText>
          )}

          {opponentSubmitted && (
            <ThemedText type="default" style={styles.statusText}>
              Opponent has submitted their loadout...
            </ThemedText>
          )}

          <ThemedView style={styles.powerMovesContainer}>
            {powerMoves.map((move) => (
              <PowerMoveButton
                key={move}
                type={move}
                used={false}
                selected={selectedMoves.includes(move)}
                onPress={() => handlePowerMovePress(move)}
                disabled={selectedMoves.length >= 3 && !selectedMoves.includes(move)}
              />
            ))}
          </ThemedView>

          <Button
            title="Submit Loadout"
            onPress={handleSubmitLoadout}
            disabled={selectedMoves.length !== 3 || hasSubmitted}
            style={styles.submitButton}
          />
        </ThemedView>
      </SafeAreaView>

      {/* Power Move Info / Confirm Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={infoMove !== null}
        onRequestClose={handleCancelInfo}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            {infoMove && (
              <>
                <ThemedText type="title" style={styles.modalTitle}>
                  {POWER_MOVE_INFO[infoMove].name}
                </ThemedText>
                <ThemedText type="default" style={styles.modalDescription}>
                  {POWER_MOVE_INFO[infoMove].description}
                </ThemedText>
                <ThemedText type="default" style={styles.modalSelected}>
                  {selectedMoves.includes(infoMove)
                    ? 'This power move is currently selected.'
                    : selectedMoves.length >= 3
                      ? 'You have already selected 3 power moves.'
                      : 'Tap Confirm to add this to your loadout.'}
                </ThemedText>
                <Button
                  title={selectedMoves.includes(infoMove) ? 'Remove' : 'Confirm'}
                  onPress={handleConfirmMove}
                  disabled={!selectedMoves.includes(infoMove) && selectedMoves.length >= 3}
                  style={styles.modalButton}
                />
                <Button
                  title="Close"
                  variant="secondary"
                  onPress={handleCancelInfo}
                  style={styles.modalButton}
                />
              </>
            )}
          </ThemedView>
        </View>
      </Modal>
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
    gap: 24,
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    marginTop: 16,
  },
  modeText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  selectionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
  powerMovesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  submitButton: {
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: 'rgba(51,51,51,0.95)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    gap: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
  },
  modalDescription: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalSelected: {
    color: '#80B9FF',
    fontSize: 14,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
  },
});