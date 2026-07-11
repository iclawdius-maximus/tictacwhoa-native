import { Image, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';

export type PowerMoveType = 'flip' | 'swap' | 'mojo' | 'trap' | 'shield' | 'cloak';

export type PowerMoveButtonProps = {
  type: PowerMoveType;
  used: boolean;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

const enabledIcons: Record<PowerMoveType, any> = {
  flip: require('@/assets/img/Flip_enabled.png'),
  swap: require('@/assets/img/Swap_enabled.png'),
  mojo: require('@/assets/img/Mojo_enabled.png'),
  trap: require('@/assets/img/Trap_enabled.png'),
  shield: require('@/assets/img/Shield_enabled.png'),
  cloak: require('@/assets/img/Cloak_enabled.png'),
};

const disabledIcons: Record<PowerMoveType, any> = {
  flip: require('@/assets/img/Flip_disabled.png'),
  swap: require('@/assets/img/Swap_disabled.png'),
  mojo: require('@/assets/img/Mojo_disabled.png'),
  trap: require('@/assets/img/Trap_disabled.png'),
  shield: require('@/assets/img/Shield_disabled.png'),
  cloak: require('@/assets/img/Cloak_disabled.png'),
};

export function PowerMoveButton({ type, used, selected, onPress, disabled }: PowerMoveButtonProps) {
  const icon = used ? disabledIcons[type] : enabledIcons[type];

  return (
    <Pressable
      onPress={used || disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => {
        const base: ViewStyle[] = [styles.button];
        if (selected) base.push(styles.selected);
        if (pressed && !used && !disabled) base.push(styles.pressed);
        if (disabled) base.push(styles.disabled);
        return base;
      }}
    >
      <ThemedView style={[styles.inner, used && styles.used]}>
        <Image source={icon} style={styles.icon} resizeMode="contain" />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    backgroundColor: 'rgba(51,51,51,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: {
    borderColor: '#80B9FF',
    borderWidth: 3,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  used: {
    opacity: 0.5,
  },
  icon: {
    width: 50,
    height: 50,
  },
});
