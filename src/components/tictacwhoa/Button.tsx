import { Pressable, StyleSheet, ViewStyle, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, variant = 'primary', style, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      role="button"
      accessible={true}
      accessibilityLabel={title}
      style={({ pressed }) => {
        const base: ViewStyle[] = [styles.button, variant === 'primary' ? styles.primary : styles.secondary];
        if (pressed) base.push(styles.pressed);
        if (Array.isArray(style)) {
          base.push(...style.filter(Boolean) as ViewStyle[]);
        } else if (style) {
          base.push(style as ViewStyle);
        }
        return base;
      }}
      {...rest}
    >
      <ThemedText type="default" style={variant === 'primary' ? styles.primaryText : styles.secondaryText}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    borderWidth: 2,
    borderColor: '#fff',
  },
  primary: {
    backgroundColor: '#333',
  },
  secondary: {
    backgroundColor: 'rgba(51,51,51,0.75)',
    borderColor: '#fff',
  },
  pressed: {
    opacity: 0.8,
  },
  primaryText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'BungeeInline-Regular',
  },
  secondaryText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'BungeeInline-Regular',
  },
});
