import { ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/tictacwhoa/Button';
import { useSocket } from '@/contexts/SocketContext';

export default function HomeScreen() {
  const { connected, serverUrl } = useSocket();

  return (
    <ImageBackground
      source={require('@/assets/img/Background_lrg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="titleGlow" style={styles.title} themeColor="text">
            Tic Tac
          </ThemedText>
          <ThemedText type="titleGlow" style={styles.title} themeColor="text">
            WHOA
          </ThemedText>

          <ThemedView style={styles.buttonContainer}>
            <Link href="/lobby" asChild>
              <Button title="Enter Matchmaking" />
            </Link>

            <Link href="/how-to-play" asChild>
              <Button title="How To Play" variant="secondary" style={styles.secondaryButton} />
            </Link>
          </ThemedView>
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
    gap: 32,
    maxWidth: 500,
    width: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 72,
    lineHeight: 80,
  },
  buttonContainer: {
    gap: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 32,
  },
  secondaryButton: {
    marginTop: 8,
  },
});
