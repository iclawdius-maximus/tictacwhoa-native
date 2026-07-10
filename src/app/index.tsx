import { ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/tictacwhoa/Button';
import { useSocket } from '@/contexts/SocketContext';

export default function HomeScreen() {
  const { connected, serverUrl, connectionError, transport, deviceId } = useSocket();

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
            {deviceId ? (
              <ThemedText type="small" style={styles.statusDetail}>
                Device: {deviceId}
              </ThemedText>
            ) : null}
            {connectionError ? (
              <ThemedText type="small" style={styles.errorText}>
                Error: {connectionError}
              </ThemedText>
            ) : null}
          </ThemedView>

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
