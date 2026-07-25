import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FINGER_FIELDS } from '../constants';
import { styles } from '../styles/styles';
import { toOverviewDate } from '../utils/dateUtils';
import { HandIcon } from './HandIcon';
import type { DebriefForm, DebriefMetaForm } from '../types';

interface DebriefDialogProps {
  visible: boolean;
  isEditing: boolean;
  form: DebriefForm;
  metaForm: DebriefMetaForm;
  errorMessage: string;
  isLoadingLocation: boolean;
  showPicker: boolean;
  pickerStep: 'date' | 'time';
  pendingDate: Date;
  onClose: () => void;
  onSave: () => void;
  onUpdateField: (field: keyof DebriefForm, value: string) => void;
  onUpdateMetaField: (field: keyof DebriefMetaForm, value: string) => void;
  onOpenDateTimePicker: () => void;
  onOpenLocationPicker: () => void;
  onPickerChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  onPickerDone: () => void;
}

export function DebriefDialog({
  visible,
  isEditing,
  form,
  metaForm,
  errorMessage,
  isLoadingLocation,
  showPicker,
  pickerStep,
  pendingDate,
  onClose,
  onSave,
  onUpdateField,
  onUpdateMetaField,
  onOpenDateTimePicker,
  onOpenLocationPicker,
  onPickerChange,
  onPickerDone,
}: DebriefDialogProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalWrapper}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>
                {isEditing ? 'Debriefing bearbeiten' : 'Neues Debriefing'}
              </Text>
              <Pressable
                accessibilityLabel="Dialog schließen"
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.metaFieldsCard}>
                <Pressable
                  accessibilityLabel="Flugdatum und -uhrzeit"
                  accessibilityRole="button"
                  onPress={onOpenDateTimePicker}
                  style={({ pressed }) => [
                    styles.metaDateButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.metaDateButtonText}>
                    {toOverviewDate(metaForm.flightDate, metaForm.flightTime)}
                  </Text>
                </Pressable>
                {showPicker &&
                  (Platform.OS === 'ios' ? (
                    <View>
                      <DateTimePicker
                        value={pendingDate}
                        mode="datetime"
                        display="spinner"
                        onChange={onPickerChange}
                        locale="de-DE"
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={onPickerDone}
                        style={({ pressed }) => [
                          styles.pickerDoneButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.pickerDoneButtonText}>Fertig</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <DateTimePicker
                      value={pendingDate}
                      mode={pickerStep}
                      display="default"
                      onChange={onPickerChange}
                    />
                  ))}
                <Pressable
                  accessibilityLabel="Flugort auswählen"
                  accessibilityRole="button"
                  onPress={onOpenLocationPicker}
                  style={({ pressed }) => [
                    styles.metaInput,
                    styles.locationPickerButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.locationPickerText,
                      !metaForm.location && styles.locationPickerPlaceholder,
                    ]}
                  >
                    {isLoadingLocation
                      ? 'Standort wird ermittelt\u2026'
                      : (metaForm.location || 'Standort auswählen')}
                  </Text>
                  <Text style={styles.locationPickerIcon}>📍</Text>
                </Pressable>
                <TextInput
                  accessibilityLabel="Optionaler externer Link"
                  placeholder="Optionaler Link (z.B. XContest)"
                  placeholderTextColor="#7a8da3"
                  style={styles.metaInput}
                  value={metaForm.externalLink}
                  onChangeText={(value) => onUpdateMetaField('externalLink', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {FINGER_FIELDS.map((field) => (
                <View key={field.key} style={styles.fieldGroup}>
                  <View style={styles.fieldHeader}>
                    <HandIcon activeParts={field.activeParts} />
                    <View style={styles.fieldLabelGroup}>
                      <Text style={styles.fieldLabel}>{field.title}</Text>
                      <Text style={styles.fieldPrompt}>{field.prompt}</Text>
                    </View>
                  </View>
                  <TextInput
                    multiline
                    numberOfLines={4}
                    placeholder={field.placeholder}
                    placeholderTextColor="#7a8da3"
                    style={styles.input}
                    value={form[field.key]}
                    onChangeText={(value) => onUpdateField(field.key, value)}
                    textAlignVertical="top"
                  />
                </View>
              ))}

              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

              <View style={styles.dialogActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Abbrechen</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onSave}
                  style={({ pressed }) => [
                    styles.button,
                    styles.dialogPrimaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {isEditing ? 'Änderungen speichern' : 'Debriefing speichern'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
