import { useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Board } from '@/components/tictacwhoa/Board';
import { Button } from '@/components/tictacwhoa/Button';
import { PowerMoveButton, PowerMoveType } from '@/components/tictacwhoa/PowerMoveButton';
import { useSocket } from '@/contexts/SocketContext';

type CellValue = string | null;
type Grid = CellValue[][];

const EMPTY_GRID: Grid = Array(3)
  .fill(null)
  .map(() => Array(3).fill(null));

const OPPOSITE: Record<string, string> = { X: 'O', O: 'X' };

export default function GameScreen() {
  const router = useRouter();
  const { socket } = useSocket();
  const { id, playerSymbol, opponentId, isPlayerTurn } = useLocalSearchParams();

  const roomId = String(id);
  const mySymbol = (playerSymbol as string) || 'X';
  const opponent = (opponentId as string) || 'opponent';

  const [grid, setGrid] = useState<Grid>(EMPTY_GRID.map((row) => [...row]));
  const [currentTurn, setCurrentTurn] = useState<string>(isPlayerTurn === 'true' ? mySymbol : OPPOSITE[mySymbol]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState(
    opponent !== 'waiting' ? (isPlayerTurn === 'true' ? 'Your turn' : "Opponent's turn") : 'Waiting for opponent...'
  );
  const [usedMoves, setUsedMoves] = useState<Record<PowerMoveType, boolean>>({
    flip: false,
    swap: false,
    mojo: false,
    trap: false,
    shield: false,
    cloak: false,
  });
  const [selectedPower, setSelectedPower] = useState<PowerMoveType | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ row: number; col: number } | null>(null);
  const [mojoFirst, setMojoFirst] = useState<{ row: number; col: number } | null>(null);

  const isMyTurn = useMemo(() => currentTurn === mySymbol && !gameOver, [currentTurn, mySymbol, gameOver]);

  useEffect(() => {
    if (!socket) return;

    const onGameUpdate = (data: {
      grid: Grid;
      currentTurn: string;
      usedPowerMoves: { X: Record<PowerMoveType, boolean>; O: Record<PowerMoveType, boolean> };
      gameOver: boolean;
      winner: string | null;
    }) => {
      setGrid(data.grid.map((row) => [...row]));
      setCurrentTurn(data.currentTurn);
      setUsedMoves(data.usedPowerMoves[mySymbol as 'X' | 'O']);
      setGameOver(data.gameOver);
      setMessage(
        data.gameOver
          ? data.winner
            ? `${data.winner} wins!`
            : "It's a tie!"
          : data.currentTurn === mySymbol
            ? 'Your turn'
            : "Opponent's turn"
      );
      setSelectedPower(null);
      setSwapFirst(null);
      setMojoFirst(null);
    };

    const onOpponentDisconnected = (data: { message: string }) => {
      setMessage(data.message);
      setGameOver(true);
      Alert.alert('Opponent left', data.message, [{ text: 'OK', onPress: () => router.replace('/') }]);
    };

    const onMoveError = (data: { message: string }) => {
      setMessage(data.message);
    };

    socket.on('game-update', onGameUpdate);
    socket.on('opponent-disconnected', onOpponentDisconnected);
    socket.on('move-error', onMoveError);

    return () => {
      socket.off('game-update', onGameUpdate);
      socket.off('opponent-disconnected', onOpponentDisconnected);
      socket.off('move-error', onMoveError);
    };
  }, [socket, mySymbol, router]);

  const handleTilePress = (row: number, col: number) => {
    if (!socket || gameOver || !isMyTurn) return;

    if (selectedPower === 'swap') {
      if (!swapFirst) {
        setSwapFirst({ row, col });
        setMessage('Select second adjacent tile to swap');
        return;
      }
      socket.emit('make-move', {
        roomId,
        moveType: 'swap',
        playerSymbol: mySymbol,
        row1: swapFirst.row,
        col1: swapFirst.col,
        row2: row,
        col2: col,
      });
      setSwapFirst(null);
      setSelectedPower(null);
      return;
    }

    if (selectedPower === 'mojo') {
      if (!mojoFirst) {
        setMojoFirst({ row, col });
        setMessage('Select second tile for double move');
        return;
      }
      socket.emit('make-move', {
        roomId,
        moveType: 'mojo',
        playerSymbol: mySymbol,
        moves: [
          { row: mojoFirst.row, col: mojoFirst.col },
          { row, col },
        ],
      });
      setMojoFirst(null);
      setSelectedPower(null);
      return;
    }

    if (selectedPower) {
      socket.emit('make-move', {
        roomId,
        moveType: selectedPower,
        playerSymbol: mySymbol,
        row,
        col,
      });
      setSelectedPower(null);
      return;
    }

    socket.emit('make-move', {
      roomId,
      moveType: 'place',
      playerSymbol: mySymbol,
      row,
      col,
    });
  };

  const handlePowerSelect = (type: PowerMoveType) => {
    if (usedMoves[type] || gameOver) return;
    if (selectedPower === type) {
      setSelectedPower(null);
      setSwapFirst(null);
      setMojoFirst(null);
      setMessage(isMyTurn ? 'Your turn' : "Opponent's turn");
      return;
    }

    if (!isMyTurn) {
      setMessage('Wait your turn, buddy.');
      return;
    }

    setSelectedPower(type);
    setSwapFirst(null);
    setMojoFirst(null);

    switch (type) {
      case 'flip':
        setMessage('Flip engaged! Tap an opponent tile.');
        break;
      case 'swap':
        setMessage('Swap engaged! Tap first tile.');
        break;
      case 'mojo':
        setMessage('Mojo engaged! Tap first move.');
        break;
      case 'trap':
        setMessage('Trap engaged! Tap an empty tile.');
        break;
      case 'shield':
        setMessage('Shield engaged! Tap one of your tiles.');
        break;
      case 'cloak':
        setMessage('Cloak engaged! Tap an empty tile.');
        break;
    }
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit('leave-game', { roomId });
    }
    router.replace('/');
  };

  return (
    <ImageBackground
      source={require('@/assets/img/Background_lrg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="titleGlow" style={styles.title}>
            Room: {roomId}
          </ThemedText>

          <ThemedView style={styles.gameInfo}>
            <ThemedText type="default" style={styles.playerInfo}>
              You: {mySymbol}
            </ThemedText>
            <ThemedText type="default" style={styles.playerInfo}>
              Opponent: {opponent.slice(0, 12)}
            </ThemedText>
          </ThemedView>

          <ThemedText type="subtitle" style={styles.gameStatus}>
            {message}
          </ThemedText>

          <Board grid={grid} onTilePress={handleTilePress} disabled={!isMyTurn} />

          <ThemedView style={styles.powerMovesContainer}>
            <ThemedView style={styles.powerMovesRow}>
              <PowerMoveButton type="flip" used={usedMoves.flip} selected={selectedPower === 'flip'} onPress={() => handlePowerSelect('flip')} />
              <PowerMoveButton type="swap" used={usedMoves.swap} selected={selectedPower === 'swap'} onPress={() => handlePowerSelect('swap')} />
              <PowerMoveButton type="mojo" used={usedMoves.mojo} selected={selectedPower === 'mojo'} onPress={() => handlePowerSelect('mojo')} />
            </ThemedView>

            <ThemedView style={styles.powerMovesRow}>
              <PowerMoveButton type="trap" used={usedMoves.trap} selected={selectedPower === 'trap'} onPress={() => handlePowerSelect('trap')} />
              <PowerMoveButton type="shield" used={usedMoves.shield} selected={selectedPower === 'shield'} onPress={() => handlePowerSelect('shield')} />
              <PowerMoveButton type="cloak" used={usedMoves.cloak} selected={selectedPower === 'cloak'} onPress={() => handlePowerSelect('cloak')} />
            </ThemedView>
          </ThemedView>

          <Button title="Leave Game" variant="secondary" onPress={handleLeave} style={styles.leaveButton} />
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
    fontSize: 28,
    lineHeight: 36,
    marginTop: 8,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
  },
  playerInfo: {
    fontSize: 16,
    color: '#fff',
  },
  gameStatus: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    color: '#fff',
    minHeight: 28,
  },
  powerMovesContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(51,51,51,0.85)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  powerMovesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  leaveButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});
