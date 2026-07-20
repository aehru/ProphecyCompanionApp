import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { parseJoinLink } from '@/lib/campaign-protocol';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Fired once per open, with the normalized code + server from the QR. */
  onScan: (join: { code: string; server: string }) => void;
};

/**
 * Full-screen QR scanner for joining a campaign. Exists because most OS camera
 * apps refuse to open custom-scheme deep links (`prophecyapp://…`), so the
 * GM's QR code needs a reader inside the app. Foreign QR codes are ignored
 * silently — the camera keeps looking until it sees a join link.
 */
export function QrScannerModal({ visible, onClose, onScan }: Props) {
  const theme = useProphecyTheme();
  const [permission, requestPermission] = useCameraPermissions();
  // onBarcodeScanned fires on every frame the code stays in view; deliver once.
  const handledRef = useRef(false);
  useEffect(() => {
    if (visible) handledRef.current = false;
  }, [visible]);

  const onScanned = ({ data }: { data: string }) => {
    if (handledRef.current) return;
    const join = parseJoinLink(data);
    if (!join) return;
    handledRef.current = true;
    onScan(join);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
        ) : (
          <View style={styles.permission}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              L'accès à la caméra est nécessaire pour scanner le QR code affiché par le MJ.
            </Text>
            {permission && !permission.canAskAgain ? (
              <Button mode="contained" onPress={() => Linking.openSettings()}>
                Ouvrir les réglages
              </Button>
            ) : (
              <Button mode="contained" onPress={requestPermission}>
                Autoriser la caméra
              </Button>
            )}
          </View>
        )}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Visez le QR code affiché sur l’écran du MJ.
          </Text>
          <Button mode="outlined" onPress={onClose}>
            Annuler
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  permission: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  footer: { padding: 16, gap: 12, alignItems: 'center' },
});
