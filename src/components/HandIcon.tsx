import { View } from 'react-native';

import { HAND_PARTS } from '../constants';
import { styles } from '../styles/styles';

type HandPart = (typeof HAND_PARTS)[number];

interface HandIconProps {
  activeParts: readonly HandPart[];
}

export function HandIcon({ activeParts }: HandIconProps) {
  const isActive = (part: HandPart) => activeParts.includes(part);

  return (
    <View style={styles.handIcon} accessible={false}>
      <View style={styles.handFingers}>
        <View
          style={[
            styles.handFinger,
            styles.handLittleFinger,
            isActive('little') ? styles.handPartActive : styles.handPartInactive,
            !isActive('little') && styles.handFingerClosed,
          ]}
        />
        <View
          style={[
            styles.handFinger,
            styles.handRingFinger,
            isActive('ring') ? styles.handPartActive : styles.handPartInactive,
            !isActive('ring') && styles.handFingerClosed,
          ]}
        />
        <View
          style={[
            styles.handFinger,
            styles.handMiddleFinger,
            isActive('middle') ? styles.handPartActive : styles.handPartInactive,
            !isActive('middle') && styles.handFingerClosed,
          ]}
        />
        <View
          style={[
            styles.handFinger,
            styles.handIndexFinger,
            isActive('index') ? styles.handPartActive : styles.handPartInactive,
            !isActive('index') && styles.handFingerClosed,
          ]}
        />
      </View>
      <View style={styles.handBase}>
        <View style={[styles.handPalm, styles.handPartActive]} />
        <View
          style={[
            styles.handThumb,
            isActive('thumb') ? styles.handPartActive : styles.handPartInactive,
            !isActive('thumb') && styles.handThumbClosed,
          ]}
        />
      </View>
    </View>
  );
}
