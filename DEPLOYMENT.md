# Deployment Guide

## Vercel Deployment

### Environment Variables Required

Before deploying to Vercel, make sure to set the following environment variables in your Vercel project settings:

1. `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

You can find these values in your Supabase project dashboard under Settings → API.

### Deployment Process

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel project settings
3. Deploy automatically on push to the main branch

## Android APK Generation

### Prerequisites

1. Make sure you have Android Studio or Android SDK installed
2. Install Java Development Kit (JDK)

### Build Process

1. **Build for Capacitor:**
   ```bash
   npm run build:capacitor
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Generate APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

4. **Find your APK:**
   The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Key Differences

- **Vercel builds**: Use regular `npm run build` (server-side rendering)
- **APK builds**: Use `npm run build:capacitor` (static export for mobile)

## Features Included

- ✅ User authentication with Supabase
- ✅ Real-time inventory management
- ✅ Request cancellation functionality
- ✅ Beautiful loading indicators (ldrs)
- ✅ Staff dashboard with real-time updates
- ✅ PWA capabilities
- ✅ Responsive design for mobile and desktop