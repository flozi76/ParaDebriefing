import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { styles } from '../styles/styles';
import { generateMapHtml } from '../utils/locationUtils';
import type { GpsCoords } from '../types';

interface LocationPickerModalProps {
  visible: boolean;
  initialCoords: GpsCoords;
  hasStoredLocation: boolean;
  onConfirm: (coords: GpsCoords) => void;
  onCancel: () => void;
}

export function LocationPickerModal({
  visible,
  initialCoords,
  hasStoredLocation,
  onConfirm,
  onCancel,
}: LocationPickerModalProps) {
  const [pickerCoords, setPickerCoords] = useState<GpsCoords>(initialCoords);
  const [mapHtml, setMapHtml] = useState('');
  const prevVisibleRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (visible && !wasVisible) {
      setPickerCoords(initialCoords);
      setMapHtml(generateMapHtml(initialCoords.lat, initialCoords.lon, hasStoredLocation));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCoords.lat, initialCoords.lon, hasStoredLocation]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as
          | GpsCoords
          | { action: string };
        if ('action' in data && data.action === 'requestCurrentLocation') {
          const fetchAndPan = async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') return;
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const { latitude: lat, longitude: lon } = pos.coords;
              webViewRef.current?.injectJavaScript(
                `map.setView([${lat}, ${lon}], map.getZoom()); true;`,
              );
            } catch {}
          };
          void fetchAndPan();
        } else if ('lat' in data && 'lon' in data &&
            typeof data.lat === 'number' && typeof data.lon === 'number') {
          setPickerCoords({ lat: data.lat, lon: data.lon });
        }
      } catch {}
    },
    [],
  );

  const footerStyle = [
    styles.locationPickerFooter,
    Platform.OS === 'android' && styles.locationPickerFooterAndroid,
  ];

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.locationPickerHeader}>
          <Text style={styles.sectionTitle}>Flugort auswählen</Text>
          <Pressable
            accessibilityLabel="Karte schließen"
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            javaScriptEnabled
            onMessage={handleMessage}
            source={{ html: mapHtml }}
            style={styles.flex}
          />
          <View pointerEvents="none" style={styles.crosshairOverlay}>
            <View style={styles.crosshairVertical} />
            <View style={styles.crosshairHorizontal} />
          </View>
        </View>

        <View style={footerStyle}>
          <Text style={styles.coordsText}>
            {pickerCoords.lat.toFixed(5)}°, {pickerCoords.lon.toFixed(5)}°
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onConfirm(pickerCoords)}
            style={({ pressed }) => [
              styles.button,
              styles.dialogPrimaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Bestätigen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
