import { type Href, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { log } from '@/lib/log';

/**
 * Render-error boundary: catches what the global handler cannot (an exception
 * thrown during React's render/commit is swallowed by React itself), logs it,
 * and offers the user a way out that isn't "force-quit the app".
 *
 * Mounted once around the whole Stack. `Réessayer` clears the captured error and
 * re-renders the subtree — enough to recover from a transient bad row; a real
 * bug simply throws again, and the Diagnostic screen now holds the stack.
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class LogErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // `componentStack` is a list of component display names — code identifiers,
    // never user content — so it survives the allow-list.
    log.error('error.render', error, { componentStack: info.componentStack ?? undefined });
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <RenderErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

/**
 * The fallback is a function component so it can use the theme and the router —
 * a class can reach neither without wiring a consumer for each.
 */
function RenderErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const theme = useProphecyTheme();
  const router = useRouter();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
        Une erreur est survenue
      </Text>
      <Text variant="bodyMedium" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        Vos données sont intactes : elles restent enregistrées sur cet appareil. Le détail
        technique a été ajouté au journal de diagnostic.
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {error.name}: {error.message}
      </Text>
      <View style={styles.actions}>
        <Button onPress={() => router.push('/diagnostics' as Href)} icon={dsIcon('journal')}>
          Voir le journal
        </Button>
        <Button mode="contained" onPress={onReset} icon={dsIcon('check')}>
          Réessayer
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  body: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
