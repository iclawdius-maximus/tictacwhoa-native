import { ImageBackground, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/tictacwhoa/Button';

export default function HowToPlayScreen() {
  return (
    <ImageBackground
      source={require('@/assets/img/Background_lrg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="titleGlow" style={styles.title}>
            How To Play
          </ThemedText>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Classic Tic-Tac-Toe
              </ThemedText>
              <ThemedText type="default" style={styles.body}>
                Get three of your markers in a row — horizontally, vertically, or diagonally — to win.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Offensive Power Moves
              </ThemedText>
              <ThemedText type="default" style={styles.body}>
                • Flip — turn one opponent tile into yours.{'\n'}
                • Swap — swap two adjacent opposing tiles.{'\n'}
                • Mojo — take two basic moves in one turn.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Defensive Power Moves
              </ThemedText>
              <ThemedText type="default" style={styles.body}>
                • Trap — hide a tile. When your opponent tries to place there, they lose their turn and the tile is revealed.{'\n'}
                • Shield — protect a tile from all offensive power moves.{'\n'}
                • Cloak — hide a tile. When your opponent tries to place on it, they cannot and lose their turn; the tile becomes visible.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText type="default" style={styles.body}>
                Each power move can only be used once per game. Use them wisely to break ties and turn the game around!
              </ThemedText>
            </ThemedView>
          </ScrollView>

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
    maxWidth: 600,
    width: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    marginTop: 16,
  },
  scroll: {
    width: '100%',
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  section: {
    backgroundColor: 'rgba(51,51,51,0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 8,
  },
  body: {
    lineHeight: 26,
    color: '#fff',
  },
  backButton: {
    marginBottom: 16,
  },
});
