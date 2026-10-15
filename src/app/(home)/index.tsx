import { useClerk, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "@/theme/colors";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();

  const email = user?.primaryEmailAddress?.emailAddress;
  const name =
    user?.firstName ?? user?.fullName ?? email?.split("@")[0] ?? "there";
  const initial = name.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 27 },
      ]}
    >
      <Text style={styles.wordmark}>Codexgram</Text>

      <View style={styles.profile}>
        {user?.hasImage ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}

        <Text style={styles.greeting}>Welcome, {name}.</Text>

        {email ? <Text style={styles.email}>{email}</Text> : null}

        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>You&apos;re signed in</Text>
        </View>

        <Text style={styles.tagline}>
          Real people. Real content.{"\n"}A brighter tomorrow.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const PAGE_PADDING = 28;
const AVATAR_SIZE = 84;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: PAGE_PADDING,
    backgroundColor: colors.surface,
  },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  profile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.ghostSurface,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.avatar,
  },
  avatarInitial: {
    fontFamily: fonts.medium,
    fontSize: 40,
    color: colors.onAccent,
  },
  greeting: {
    marginTop: 20,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.textPrimary,
    textAlign: "center",
  },
  email: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  badge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.successSurface,
  },
  badgeLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.success,
  },
  tagline: {
    marginTop: 20,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  signOut: {
    height: 55,
    borderRadius: 27.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.appleSurface,
  },
  pressed: {
    opacity: 0.85,
  },
  signOutLabel: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.onAppleSurface,
  },
});
