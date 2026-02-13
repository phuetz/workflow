# Workflow Automation - Mobile App

> **Industry-First**: The first open-source workflow automation platform with native mobile applications for iOS and Android.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Features

- ✅ Native iOS & Android apps
- ✅ Offline mode with automatic sync
- ✅ Biometric authentication (Face ID, Touch ID, Fingerprint)
- ✅ Push notifications for execution status
- ✅ Real-time execution monitoring
- ✅ Dark mode support
- ✅ Share workflows
- ✅ Background sync
- ✅ Optimistic UI updates
- ✅ Full TypeScript support

## Requirements

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS: macOS with Xcode 14+
- Android: Android Studio with SDK 33+

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry with navigation
├── screens/                # Screen components
├── components/             # Reusable UI components
├── services/               # Business logic & API
├── store/                  # State management (Zustand)
├── types/                  # TypeScript definitions
└── __tests__/              # Unit tests
```

## Development

### Run on Device (Recommended)

1. Install **Expo Go** from App Store or Play Store
2. Run `npm start`
3. Scan QR code with your device

### Run on Simulator/Emulator

**iOS Simulator:**
```bash
npm run ios
```

**Android Emulator:**
```bash
npm run android
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

## Building for Production

### Using EAS (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS
npm run build:ios

# Build for Android
npm run build:android
```

### Submit to Stores

```bash
# iOS App Store
npm run submit:ios

# Google Play Store
npm run submit:android
```

## Key Technologies

- **React Native 0.72.7** - Mobile framework
- **Expo SDK 49** - Development tools
- **TypeScript 5.5** - Type safety
- **React Navigation 6** - Navigation
- **Zustand** - State management
- **AsyncStorage** - Local persistence
- **Axios** - HTTP client
- **Expo Notifications** - Push notifications
- **Expo Local Authentication** - Biometric auth

## API Integration

Connects to backend at:
- Development: `http://localhost:3001/api`
- Production: `https://api.workflow-automation.app`

## Offline Support

The app works fully offline with:
- Local caching of workflows and executions
- Operation queue that syncs when online
- Background sync every 15 minutes
- Automatic retry for failed operations

## Security

- JWT token authentication
- Automatic token refresh
- Biometric authentication support
- Secure storage for sensitive data
- Input validation and sanitization

## Performance

- App launch: < 2 seconds
- Touch response: 60fps
- Bundle size: ~40MB (iOS), ~35MB (Android)
- Minimum OS: iOS 14+, Android 8+

## Documentation

See [MOBILE_APP_GUIDE.md](../MOBILE_APP_GUIDE.md) for comprehensive documentation.

## Troubleshooting

### Metro Bundler Issues

```bash
expo start -c
```

### iOS Build Issues

```bash
cd ios && pod install && cd ..
```

### Android Build Issues

```bash
cd android && ./gradlew clean && cd ..
```

### Cannot Connect to Backend

- iOS Simulator: Use `http://localhost:3001`
- Android Emulator: Use `http://10.0.2.2:3001`
- Physical Device: Use your computer's IP address

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - See LICENSE file for details

## Support

- Documentation: [MOBILE_APP_GUIDE.md](../MOBILE_APP_GUIDE.md)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Email: support@workflow-automation.app