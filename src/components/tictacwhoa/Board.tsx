import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';

export type BoardProps = {
  grid: (string | null)[][];
  onTilePress: (row: number, col: number) => void;
  disabled?: boolean;
};

export function Board({ grid, onTilePress, disabled = false }: BoardProps) {
  return (
    <ThemedView style={styles.board}>
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <Tile
            key={`${rowIndex}-${colIndex}`}
            value={cell}
            onPress={() => !disabled && onTilePress(rowIndex, colIndex)}
            disabled={disabled}
          />
        ))
      )}
    </ThemedView>
  );
}

type TileProps = {
  value: string | null;
  onPress: () => void;
  disabled?: boolean;
};

function Tile({ value, onPress, disabled = false }: TileProps) {
  let label = '';
  if (value === 'X' || value === 'O') {
    label = value;
  } else if (value === 'hidden') {
    label = '';
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => {
        const base: ViewStyle[] = [styles.tile];
        if (pressed) base.push(styles.pressedTile);
        return base;
      }}
    >
      <Text style={styles.marker}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    height: 300,
    backgroundColor: 'rgba(51,51,51,0.75)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  tile: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(51,51,51,0.75)',
  },
  pressedTile: {
    backgroundColor: 'rgba(128,185,255,0.4)',
  },
  marker: {
    fontFamily: Fonts.display,
    fontSize: 64,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 70,
  },
});
