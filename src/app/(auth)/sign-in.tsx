import { useSSO } from "@clerk/expo";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { colors, fonts } from "@/theme/colors";

const TERMS_URL = "https://codexgram.app/terms";
const PRIVACY_URL = "https://codexgram.app/privacy";

type SocialStrategy = "oauth_google" | "oauth_apple";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState(false);

  const openLink = (url: string) => {
    void WebBrowser.openBrowserAsync(url);
  };

  // Handles both sign-in and sign-up: Clerk transfers new users to sign-up automatically.
  const continueWith = async (strategy: SocialStrategy) => {
    if (pending) return;
    setPending(true);
    try {
      const { createdSessionId, setActive, signUp } = await startSSOFlow({
        strategy,
      });

      // Once the session is active, the (auth) layout redirects to home.
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else if (signUp?.status === "missing_requirements") {
        Alert.alert(
          "Couldn't finish sign-up",
          "Your account needs more details than this provider shares.",
        );
      }
      // No session and no missing requirements means the user cancelled.
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Sign-in failed", "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={[styles.menuButton, { top: insets.top }]}
        onPress={() => {}}
      >
        <View style={styles.menuDot} />
        <View style={styles.menuDot} />
        <View style={styles.menuDot} />
      </Pressable>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Image
          source={require("@/assets/images/auth/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.wordmark}>Codexgram</Text>

        <View style={styles.headlineBlock}>
          <Text style={styles.headline}>
            Real people.{"\n"}Real content.{"\n"}
            <Text style={styles.headlineAccent}>A brighter tomorrow.</Text>
          </Text>
        </View>

        <Text style={styles.subtitle}>A social app for trusted testers.</Text>
      </View>

      <Image
        source={require("@/assets/images/auth/hero.png")}
        style={styles.hero}
        contentFit="contain"
      />

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <SocialAuthButton
          label="Continue with Google"
          logo={require("@/assets/images/auth/google-g.png")}
          logoWidth={30.1}
          logoHeight={30.1}
          arrow={require("@/assets/images/auth/arrow-dark.png")}
          variant="light"
          onPress={() => void continueWith("oauth_google")}
        />
        <SocialAuthButton
          label="Continue with Apple"
          logo={require("@/assets/images/auth/apple-logo.png")}
          logoWidth={25.9}
          logoHeight={29.6}
          arrow={require("@/assets/images/auth/arrow-light.png")}
          variant="dark"
          onPress={() => void continueWith("oauth_apple")}
          style={styles.appleButton}
        />
      </View>

      <Text style={[styles.terms, { marginBottom: insets.bottom + 27 }]}>
        By continuing, you agree to our{" "}
        <Text style={styles.termsLink} onPress={() => openLink(TERMS_URL)}>
          Terms
        </Text>{" "}
        and acknowledge our{" "}
        <Text style={styles.termsLink} onPress={() => openLink(PRIVACY_URL)}>
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const PAGE_PADDING = 28;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  menuButton: {
    position: "absolute",
    right: 26,
    zIndex: 1,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ghostSurface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4.5,
  },
  menuDot: {
    width: 3.7,
    height: 3.7,
    borderRadius: 1.85,
    backgroundColor: colors.ghostIcon,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: PAGE_PADDING,
  },
  logo: {
    width: 84.6,
    height: 84.6,
  },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: 29,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: "#000000",
  },
  headlineBlock: {
    marginTop: 23,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 30.5,
    letterSpacing: -0.6,
    color: colors.textPrimary,
  },
  headlineAccent: {
    color: colors.accent,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.textSecondary,
  },
  hero: {
    width: "100%",
    aspectRatio: 743 / 541,
    marginTop: 2,
  },
  spacer: {
    flex: 1,
    minHeight: 2,
  },
  actions: {
    paddingHorizontal: PAGE_PADDING,
  },
  appleButton: {
    marginTop: 11,
  },
  terms: {
    marginTop: 26,
    paddingHorizontal: PAGE_PADDING,
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 14,
    color: colors.textMuted,
  },
  termsLink: {
    fontFamily: fonts.semibold,
    color: colors.accent,
  },
});
