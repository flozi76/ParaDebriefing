import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { DebriefDialog } from './src/components/DebriefDialog';
import { EntryCard } from './src/components/EntryCard';
import { LocationPickerModal } from './src/components/LocationPickerModal';
import { useDebriefing } from './src/hooks/useDebriefing';
import { styles } from './src/styles/styles';

export default function App() {
  const {
    form,
    metaForm,
    entries,
    errorMessage,
    storageMessage,
    isDialogVisible,
    isEditing,
    isLocationPickerVisible,
    locationPickerCoords,
    isLoadingLocation,
    showPicker,
    pickerStep,
    pendingDate,
    updateField,
    updateMetaField,
    closeDialog,
    openCreateDialog,
    openEditDialog,
    openDateTimePicker,
    openLocationPicker,
    closeLocationPicker,
    handleLocationPickerConfirm,
    onPickerChange,
    onPickerDone,
    openExternalLink,
    saveDebrief,
  } = useDebriefing();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.title}>ParaDebriefing</Text>
                <Text style={styles.subtitle}>
                  Fünf-Finger-Debriefing nach dem Flug direkt auf Android und iPhone.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Neues Debriefing"
                accessibilityRole="button"
                onPress={openCreateDialog}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.iconButtonText}>+</Text>
              </Pressable>
            </View>
            {storageMessage ? (
              <Text style={styles.storageMessage}>{storageMessage}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Gespeicherte Debriefings</Text>
              <Text style={styles.badge}>{entries.length}</Text>
            </View>

            {entries.length === 0 ? (
              <View style={styles.emptyStateGroup}>
                <Text style={styles.emptyState}>
                  Noch kein Debriefing gespeichert. Tippe auf Plus, um nach deinem nächsten Flug alle fünf Finger zu erfassen.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={openCreateDialog}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Debriefing anlegen</Text>
                </Pressable>
              </View>
            ) : (
              entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={openEditDialog}
                  onOpenLink={(url) => {
                    void openExternalLink(url);
                  }}
                />
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DebriefDialog
        visible={isDialogVisible}
        isEditing={isEditing}
        form={form}
        metaForm={metaForm}
        errorMessage={errorMessage}
        isLoadingLocation={isLoadingLocation}
        showPicker={showPicker}
        pickerStep={pickerStep}
        pendingDate={pendingDate}
        onClose={closeDialog}
        onSave={saveDebrief}
        onUpdateField={updateField}
        onUpdateMetaField={updateMetaField}
        onOpenDateTimePicker={openDateTimePicker}
        onOpenLocationPicker={openLocationPicker}
        onPickerChange={onPickerChange}
        onPickerDone={onPickerDone}
      />

      <LocationPickerModal
        initialCoords={locationPickerCoords}
        onCancel={closeLocationPicker}
        onConfirm={handleLocationPickerConfirm}
        visible={isLocationPickerVisible}
      />
    </SafeAreaView>
  );
}
