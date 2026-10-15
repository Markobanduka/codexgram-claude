import { Image, type ImageSource } from "expo-image";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

import { colors, fonts } from "@/theme/colors";

type Props = {
  label: string;
  /** Brand mark pinned to the left edge of the pill. */
  logo: ImageSource;
  logoWidth: number;
  logoHeight: number;
  /** Chevron/arrow pinned to the right edge of the pill. */
  arrow: ImageSource;
  variant: "light" | "dark";
  onPress: () => void;
  style?: ViewStyle;
};

export function SocialAuthButton({
  label,
  logo,
  logoWidth,
  logoHeight,
  arrow,
  variant,
  onPress,
  style,
}: Props) {
  const dark = variant === "dark";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        dark ? styles.pillDark : styles.pillLight,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Image
        source={logo}
        style={[styles.logo, { width: logoWidth, height: logoHeight }]}
        contentFit="contain"
      />
      <Text
        style={[styles.label, dark ? styles.labelDark : styles.labelLight]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Image source={arrow} style={styles.arrow} contentFit="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 55,
    borderRadius: 27.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pillLight: {
    backgroundColor: colors.surface,
    shadowColor: "#0B1B3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  pillDark: {
    backgroundColor: colors.appleSurface,
  },
  pressed: {
    opacity: 0.85,
  },
  logo: {
    position: "absolute",
    left: 26,
  },
  arrow: {
    position: "absolute",
    right: 26,
    width: 20.1,
    height: 18,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  labelLight: {
    color: colors.textPrimary,
  },
  labelDark: {
    color: colors.onAppleSurface,
  },
});
