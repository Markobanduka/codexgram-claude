# Codexgram — v1 Build Plan

> Living implementation document. Work through it phase by phase.
> Every decision here was chosen explicitly during the requirements interview — none inferred.

---

## 1. Context

Codexgram is a mobile-first, Instagram-style social app built from a clean slate on **Expo SDK 57**.

The v1 goal is one complete, genuinely usable social loop on iOS and Android: sign in → claim a handle → post a photo or video → find people → follow → like and comment → message privately.

The governing constraint is **exactly two vendors**: **Clerk** (identity) and **Convex** (database, functions, file storage, realtime, search). No Mux, Cloudinary, Algolia, S3, or push provider. That keeps the cost model to two line items and the operational surface small enough for one person to hold in their head.

---

## 2. Scope

### In scope for v1
- Google + Apple sign-in
- Forced username onboarding
- Single-media posts (one image **or** one video ≤60s) with caption
- Chronological following-feed (Home)
- Global recent grid + user search (Explore)
- Follow / unfollow (instant, no approval)
- Likes
- Flat comments
- Hard-delete of own posts and comments
- 1:1 realtime DMs with read receipts and typing indicators
- In-app Activity feed
- Profile view + edit

### Explicitly OUT of scope for v1
Push notifications · stories/reels · group chats · DM media attachments · private accounts & follow requests · carousel posts · comment likes · threaded replies · hashtags · saves/bookmarks · blocking & reporting · dark mode · web support · monetization · i18n · analytics · automated test suite

---

## 3. Confirmed Decisions

| Area | Decision |
|---|---|
| Media storage | **Convex file storage only.** No transcoding service. Compress on-device before upload. |
| DMs | 1:1, **text only**, realtime, with read receipts + typing indicators |
| Home feed | Posts from people you follow, reverse-chronological |
| Explore | Global recent grid + user search |
| Platforms | iOS **and** Android, EAS dev builds. Expo Go is out from day one. Web unsupported. |
| Usernames | Forced onboarding screen, user-picked, unique, live availability check |
| Privacy | **All accounts public**, follows instant — removes read-permission checks almost everywhere |
| Post shape | One image or one video + caption. Media required. |
| Deletes | **Hard delete, full cascade** (comments, likes, activity, stored file, counters) |
| Styling | NativeWind `5.0.0-rc.0`, **light mode only**, all colors via semantic tokens in one file |
| Cold start | Designed empty state → button to Explore + suggested accounts row |
| Comments | Flat, chronological, no comment likes |
| Push | **None in v1.** In-app Activity + unread badges only. |
| Activity entry | Heart icon in Home header with unread dot → Activity screen (keeps exactly 4 tabs) |
| Counts | **Denormalized** onto documents, updated in the same transactional mutation |
| Media pipeline | `expo-image-picker` (library + camera), `videoMaxDuration: 60`, images resized via `expo-image-manipulator` |
| Quality bar | `tsc --noEmit` clean + `expo lint` clean + manual QA checklist on both platforms |

---

## 4. Tech Stack — verified versions

Baseline already in the repo (do not change):

```
expo                        ~57.0.24
react                        19.2.3
react-native                 0.86.3
expo-router                 ~57.0.22
react-native-reanimated      4.5.1
react-native-worklets        0.10.1
typescript                  ~6.0.3
```

### Already installed (Phase 0, done)
```
expo-image-picker
expo-image-manipulator
expo-video
expo-secure-store
```
Config plugins `expo-video` and `expo-secure-store` were auto-added to `app.json`.

### Still to install

**Auth — IMPORTANT CORRECTION**

`@clerk/clerk-expo` is **deprecated**. npm states: *"Migrate to `@clerk/expo` by following the Core 3 upgrade guide."*

Use **`@clerk/expo`** (4.6.8). Verified peer range `expo: >=54 <58` — SDK 57 is supported.
All of its peer deps are **optional**; install only what we use:

```
@clerk/expo
expo-auth-session
expo-crypto
expo-apple-authentication
@clerk/expo-google-signin   # native Google sign-in — evaluate vs web-browser flow
```

**Backend**
```
convex                      1.46.0
```
Convex declares optional peers on `@clerk/react ^6.4.3` (Core 3) **and** legacy `@clerk/clerk-react` — so `ConvexProviderWithClerk` supports the Core 3 line.

**Styling — pin exactly, no carets**
```
nativewind            5.0.0-rc.0
react-native-css      3.1.0-rc.0
tailwindcss           4.1.12
@tailwindcss/postcss  4.1.12
postcss
lightningcss          1.30.1      # also pin in package.json "overrides"
```

---

## 5. Data Model (Convex)

Source of truth is **Convex** for all app data. Clerk owns identity only. `users.clerkId` is the join key.

| Table | Fields | Indexes |
|---|---|---|
| `users` | `clerkId`, `username`, `displayName`, `bio`, `avatarId?`, `followerCount`, `followingCount`, `postCount` | `by_clerkId`, `by_username`, search index on `username` + `displayName` |
| `posts` | `authorId`, `storageId`, `mediaType` (`"image"` \| `"video"`), `caption`, `likeCount`, `commentCount`, `createdAt` | `by_author`, `by_createdAt` |
| `follows` | `followerId`, `followingId`, `createdAt` | `by_follower`, `by_following`, `by_both` (uniqueness) |
| `likes` | `userId`, `postId`, `createdAt` | `by_post`, `by_user_post` (uniqueness) |
| `comments` | `postId`, `authorId`, `text`, `createdAt` | `by_post` |
| `conversations` | `participantIds` (sorted pair), `lastMessageAt`, `lastMessageText` | `by_participant`, `by_pair` |
| `messages` | `conversationId`, `senderId`, `text`, `readAt?`, `createdAt` | `by_conversation` |
| `typing` | `conversationId`, `userId`, `updatedAt` (ephemeral) | `by_conversation` |
| `activity` | `recipientId`, `actorId`, `type` (`"follow"` \| `"like"` \| `"comment"`), `postId?`, `read`, `createdAt` | `by_recipient` |

**Counter rule:** every like / follow / comment mutation updates the edge row **and** the denormalized counter in the same transaction. Convex mutations are transactional, so counts cannot drift.

**Cascade rule:** deleting a post removes the post doc, all its comments, all its likes, its activity rows, the file in Convex storage, and decrements `author.postCount` — all in one mutation.

---

## 6. Architecture

- **Navigation:** Expo Router, file-based in `src/app/`. Tabs via `expo-router/unstable-native-tabs`. Native stacks inside each tab.
- **Provider order (critical):** `ClerkProvider` → `ConvexProviderWithClerk` → app. Convex must be able to read Clerk context.
- **Token storage:** `expo-secure-store`.
- **Business logic:** lives entirely in `convex/`. Never on the client.
- **Realtime:** Convex reactive subscriptions. No polling, no custom websockets.
- **Non-route code** (components, hooks, utils) stays **outside** `src/app/`, per `AGENTS.md`.
- **Path alias:** `@/*` → `./src/*` (already configured in `tsconfig.json`).

### Proposed structure

```
convex/
  schema.ts  auth.config.ts
  users.ts  posts.ts  follows.ts  likes.ts  comments.ts
  conversations.ts  messages.ts  typing.ts  activity.ts
  files.ts  search.ts
src/
  app/
    _layout.tsx
    (auth)/sign-in.tsx
    (onboarding)/index.tsx
    (tabs)/_layout.tsx
      index.tsx          # Home
      messages/
      explore/
      profile/
    post/[id].tsx
    user/[username].tsx
    activity.tsx
  components/            # Avatar, Button, EmptyState, Screen, PostCard...
  hooks/
  lib/
  theme/                 # semantic color tokens — single swap point for design ref
```

---

## 7. Implementation Phases

Each phase is independently verifiable. Nothing depends on a later phase.
**Gate every phase on:** `npx tsc --noEmit` and `npx expo lint` clean.

### Phase 0 — Foundation *(partially done)*
- [x] Install `expo-image-picker`, `expo-image-manipulator`, `expo-video`, `expo-secure-store`
- [ ] Install Clerk (`@clerk/expo` + auth peers), `convex`, NativeWind RC stack
- [ ] Pin RC versions exactly; add `lightningcss` to `package.json` → `overrides`
- [ ] `tailwind.config.js` with **semantic tokens only** (`background`, `surface`, `text-primary`, `text-muted`, `border`, `accent`) — the one file swapped when the design ref lands
- [ ] `global.css`, `postcss.config.mjs`, `metro.config.js` via `withNativewind`, `nativewind-env.d.ts`
- [ ] Import `global.css` in the root layout
- **GATE:** a screen styled with `className` renders correctly in a real dev build. **Do not build any real screens until this passes.** (Risk 1)

### Phase 1 — Auth + onboarding
- [ ] `convex/schema.ts` (full schema above), `convex/auth.config.ts` (`applicationID: "convex"`)
- [ ] Clerk dashboard: enable Google + Apple, create JWT template named `convex`
- [ ] Root `_layout.tsx`: `ClerkProvider` → `ConvexProviderWithClerk`, secure-store token cache
- [ ] Route groups: `(auth)` signed-out, `(onboarding)`, `(tabs)` signed-in; redirect logic
- [ ] `convex/users.ts`: `getCurrentUser`, `isUsernameAvailable`, `completeOnboarding`, `updateProfile`
- [ ] Onboarding screen: username field with debounced live availability check
- **GATE:** a fresh **sign-up** (not just sign-in) reaches Home with a Convex user row. (Risk 3)

### Phase 2 — Tabs shell
- [ ] `src/app/(tabs)/_layout.tsx` with `NativeTabs` — Home, Messages, Explore, Profile
- [ ] Reuse existing `assets/images/tabIcons/` for home + explore; add messages + profile icons
- [ ] Placeholder screens + shared primitives (`Screen`, `Avatar`, `Button`, `EmptyState`)

### Phase 3 — Posts & media
- [ ] `convex/files.ts`: `generateUploadUrl`; resolve `storageId` → URL via `ctx.storage.getUrl` in post queries
- [ ] `convex/posts.ts`: `create`, `deletePost` (full cascade), `getFeed` (paginated), `getExplore`, `getByAuthor`, `getById`
- [ ] Create flow: picker (`videoMaxDuration: 60`, medium quality) → `expo-image-manipulator` resize → upload → mutation
- [ ] `PostCard` using `expo-image` and `expo-video`
- **GATE:** upload a real 60s video from a **physical device**. (Risk 4)

### Phase 4 — Social graph
- [ ] `convex/follows.ts`: `follow` / `unfollow` — transactional counter updates + activity row
- [ ] `convex/likes.ts`, `convex/comments.ts` — same transactional pattern
- [ ] Profile screens (own vs other), follower / following lists
- [ ] Comments sheet
- [ ] Home empty state + suggested accounts row

### Phase 5 — Explore & search
- [ ] Convex search index on `users`; `convex/search.ts`
- [ ] Explore grid + debounced search field

### Phase 6 — Messages
- [ ] `convex/conversations.ts`, `convex/messages.ts`, `convex/typing.ts`
- [ ] Lazy conversation creation on first message sent (no ghost threads)
- [ ] Thread screen: realtime messages, read receipts, typing indicator
- [ ] Conversation list with unread badges; new-message picker; Message button on profiles

### Phase 7 — Activity
- [ ] `convex/activity.ts`
- [ ] Heart icon + unread dot in Home header → Activity screen

### Phase 8 — Polish & QA
- [ ] Empty states, loading skeletons, error boundaries, offline banner
- [ ] Apply the design reference to `src/theme/` tokens
- [ ] Full manual QA checklist on both platforms

---

## 8. Assumptions

Chosen where no firm answer was given. Cheap to change now, expensive later.

1. Video cap **60s**, `videoQuality` medium
2. Images resized to **~1080px** max dimension, JPEG ~0.8 quality
3. Feed page size **15**, infinite scroll via Convex `paginate`
4. Username rules: **3–30 chars**, `[a-z0-9_.]`, lowercased, **immutable after onboarding** in v1
5. Bio ≤150 chars; caption ≤2,200
6. Typing indicator TTL **~5s**, stale rows filtered on read (no cron cleanup in v1)
7. Read receipts are per-message `readAt`, set when the thread is on-screen and focused
8. Activity feed keeps the most recent **100** rows per user; no pruning job in v1
9. "Suggested accounts" = **most-followed accounts you don't already follow**. No real recommendation logic.
10. Self-follow and self-DM are blocked
11. **One Convex deployment** for dev and prod initially; split at first real release
12. Secrets in `.env.local` (already gitignored): `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. `CLERK_JWT_ISSUER_DOMAIN` set in the Convex dashboard.
13. No analytics or crash reporting in v1
14. Light palette is a **neutral placeholder** until the design reference arrives
15. Clerk JWT template must be named `convex`

---

## 9. Open Risks

1. **NativeWind `5.0.0-rc.0` is a release candidate.** It is the only version tested against our exact matrix (Expo 57.0.22 / RN 0.86.3 / Reanimated 4.5.1 / Worklets 0.10.1); v4 stable has no official SDK 57 support ([PR #1864](https://github.com/nativewind/nativewind/pull/1864)). *Mitigation:* pin everything exactly, no carets. Prove rendering in Phase 0 before building screens.

2. **Clerk Core 3 migration.** `@clerk/clerk-expo` is deprecated in favor of `@clerk/expo`. Import paths and some APIs differ from most tutorials and from model training data. *Mitigation:* follow the [Core 3 upgrade guide](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3); do not copy older `@clerk/clerk-expo` examples.

3. **Known Convex + Clerk Expo bug** ([convex-js#176](https://github.com/get-convex/convex-js/issues/176)): `ConvexProviderWithClerk` can stay unauthenticated after a Clerk Expo **sign-up** activates a new session. This hits the very first action a new user takes. *Mitigation:* test sign-up before sign-in; force a client auth refresh on session change if it reproduces.

4. **React Native `fetch` cannot POST a `file://` URI directly** to the Convex upload URL — needs blob conversion, with real memory concerns on a 60s video. **Riskiest single code path in the app.** *Mitigation:* prototype on a physical device in Phase 3.

5. **Native tabs are `unstable`** (`expo-router/unstable-native-tabs`) and can change in a minor release. *Mitigation:* pin `expo-router`; keep tab config in one file.

6. **No video transcoding.** We serve whatever the device produced — slow feed loads on poor networks, growing storage bill. *Mitigation:* measure real file sizes early. Mux is the escape hatch.

7. **Feed fan-out on read** degrades once a user follows many hundreds of accounts. Fine at v1 scale; not a permanent design.

8. **Apple Sign In is mandatory for App Store review** when Google sign-in is present. Requires a paid Apple Developer account and correct Clerk + EAS credential setup.

9. **No moderation, blocking, or reporting.** A fully public app with DMs and no abuse tooling is real exposure if it opens to strangers.

10. **Hard deletes are irreversible** by design.

11. **Design reference pending.** Palette is placeholder; visual polish cannot be judged until it lands.

---

## 10. Verification

**Per phase:** `npx tsc --noEmit` and `npx expo lint` clean. `npx expo-doctor` after any dependency change.

**Dev builds** (required — Expo Go cannot run Clerk OAuth or native tabs):

```bash
npx expo run:ios
npx expo run:android
```

**End-to-end manual checklist — walk on both platforms:**

1. Sign up with Google → onboarding → unique username enforced (try a taken one) → Home empty state
2. Sign up with Apple on iOS → same path
3. Kill and relaunch → session persists, lands on Home
4. Post an image; post a 60s video. Both render in feed and profile grid.
5. From a second account: follow account 1 → follower count increments, activity row appears
6. Account 1's Home now shows account 2's posts, reverse-chronological
7. Like and unlike → count correct, does not drift after refetch
8. Comment, then delete it → count correct
9. Delete a post → gone from feed, grid, Explore; comments and likes gone; `postCount` decremented
10. Explore: search a username → open profile → tap Message
11. DM both directions **with both devices open** — live messages, read receipts flip, typing indicator shows and clears
12. Unread badge on Messages tab clears when the thread opens
13. Unfollow → Home empties again, follower count decrements
14. Airplane mode → no crash, degraded state legible
15. Edit profile (display name, bio, avatar) → reflected everywhere
