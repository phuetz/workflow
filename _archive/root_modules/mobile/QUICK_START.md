# Mobile App - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 2: Start Development Server

```bash
npm start
```

### Step 3: Run on Your Device

**Option A: Physical Device (Recommended)**
1. Install "Expo Go" app from App Store or Play Store
2. Scan the QR code shown in terminal
3. App loads on your device!

**Option B: Simulator/Emulator**
```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android
```

## 📱 Main Features

- ✅ View all workflows
- ✅ Execute workflows
- ✅ Monitor executions in real-time
- ✅ Works offline (auto-sync when online)
- ✅ Biometric authentication
- ✅ Push notifications
- ✅ Dark mode

## 🔧 Common Commands

```bash
# Development
npm start              # Start Expo server
npm run ios           # Run iOS simulator
npm run android       # Run Android emulator

# Testing
npm test              # Run tests
npm run test:coverage # Coverage report
npm run lint          # Check code quality

# Building
npm run build:ios     # Build for iOS
npm run build:android # Build for Android
```

## 🐛 Troubleshooting

### Cannot connect to backend?
- iOS Simulator: Use `http://localhost:3001`
- Android Emulator: Use `http://10.0.2.2:3001`
- Physical Device: Use your computer's IP address

### Metro bundler won't start?
```bash
expo start -c  # Clear cache
```

### Build issues?
```bash
# iOS
cd ios && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..
```

## 📚 Documentation

- **Full Guide**: See [MOBILE_APP_GUIDE.md](../MOBILE_APP_GUIDE.md)
- **README**: See [README.md](./README.md)
- **API Docs**: Backend API at http://localhost:3001/api

## 🎯 First Time Usage

1. **Login**: Use your workflow platform credentials
2. **View Dashboard**: See stats and recent activity
3. **Explore Workflows**: Browse and search workflows
4. **Execute**: Run workflows with one tap
5. **Monitor**: Track execution status in real-time
6. **Settings**: Configure biometric auth and notifications

## 🔐 Security Features

- **Biometric Auth**: Face ID, Touch ID, Fingerprint
- **Secure Storage**: Encrypted credentials
- **Auto Token Refresh**: Seamless authentication

## 🌐 Offline Mode

The app works completely offline:
- View cached workflows
- Create/edit workflows (queued)
- Changes sync automatically when online
- Background sync every 15 minutes

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Email: support@workflow-automation.app
- Docs: [MOBILE_APP_GUIDE.md](../MOBILE_APP_GUIDE.md)

---

**Ready to build workflows on the go! 🎉**
