# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Package manager
Do not use npm. Uses bun.

# Drizzle
Never hand-write migrations or edit _journal.json. Always bunx drizzle-kit generate.
Commit the whole drizzle/ dir every time, meta/ included.