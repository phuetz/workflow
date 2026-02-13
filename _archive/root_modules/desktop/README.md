# Desktop Applications - Workflow Automation Platform

This directory contains native desktop applications for Windows, macOS, and Linux, built with different technologies for optimal performance and native integration.

## 🖥️ Applications

### Electron (Cross-platform)
- **Location**: `./electron/`
- **Tech Stack**: Electron, Node.js, JavaScript/TypeScript
- **Features**:
  - Cross-platform support (Windows, macOS, Linux)
  - Auto-updates via electron-updater
  - System tray integration
  - Native file system access
  - Deep linking support
  - Hardware acceleration

### Tauri (Rust + WebView)
- **Location**: `./tauri/`
- **Tech Stack**: Rust, Tauri, WebView2/WebKit
- **Features**:
  - Smaller binary size (~10MB vs ~50MB Electron)
  - Better performance and memory usage
  - Native OS integration
  - Secure by default
  - Built-in updater
  - System tray support

### Native Windows (WPF)
- **Location**: `./native/windows/`
- **Tech Stack**: C#, .NET 6+, WPF, XAML
- **Features**:
  - True native Windows experience
  - Windows Hello integration
  - Jump lists and taskbar features
  - Toast notifications
  - DirectX acceleration
  - Windows-specific optimizations

### Native macOS (SwiftUI)
- **Location**: `./native/macos/`
- **Tech Stack**: Swift, SwiftUI, Combine
- **Features**:
  - Native macOS experience
  - Touch Bar support
  - Handoff and Continuity
  - iCloud sync
  - macOS shortcuts
  - Metal acceleration

### Native Linux (GTK)
- **Location**: `./native/linux/`
- **Tech Stack**: Rust/C++, GTK4, libadwaita
- **Features**:
  - Native Linux desktop integration
  - Wayland and X11 support
  - System theme integration
  - D-Bus integration
  - Package manager support

## 🚀 Getting Started

### Electron App

```bash
cd electron
npm install
npm start

# Build for production
npm run build:win
npm run build:mac
npm run build:linux
```

### Tauri App

```bash
cd tauri
npm install
cargo install tauri-cli
cargo tauri dev

# Build for production
cargo tauri build
```

### Windows Native (WPF)

1. Open `native/windows/WorkflowApp.sln` in Visual Studio 2022
2. Restore NuGet packages
3. Build and run (F5)

### macOS Native

1. Open `native/macos/WorkflowApp.xcodeproj` in Xcode
2. Select your development team
3. Build and run (Cmd+R)

### Linux Native

```bash
cd native/linux
cargo build --release
./target/release/workflow-app
```

## 🔑 Key Features

### Window Management
- Multi-window support for workflow editing
- Persistent window state
- Full screen mode
- Always-on-top option
- Window snapping

### System Integration
- System tray/menu bar icon
- Global keyboard shortcuts
- Native file associations
- Protocol handler (workflow://)
- Auto-start on login

### Performance
- Hardware acceleration
- Lazy loading of heavy components
- Virtual scrolling for large lists
- Background task processing
- Memory optimization

### Security
- Code signing for all platforms
- Secure credential storage
- Sandboxed execution
- Certificate pinning
- Encrypted local storage

### Updates
- Auto-update mechanism
- Delta updates support
- Rollback capability
- Update notifications
- Silent updates option

## 📦 Distribution

### Windows
- **Installer**: NSIS installer with uninstaller
- **Portable**: ZIP archive
- **Store**: Microsoft Store package (MSIX)
- **Chocolatey**: Package manager support

### macOS
- **DMG**: Drag-and-drop installer
- **PKG**: macOS installer package
- **App Store**: Mac App Store distribution
- **Homebrew**: Cask formula

### Linux
- **AppImage**: Universal package
- **DEB**: Debian/Ubuntu package
- **RPM**: Fedora/RHEL package
- **Snap**: Snap Store package
- **Flatpak**: Flathub distribution
- **AUR**: Arch User Repository

## 🎨 UI/UX Guidelines

### Design Principles
- Native look and feel for each platform
- Consistent with OS design guidelines
- Accessible (WCAG 2.1 AA)
- High DPI support
- Dark/light theme support

### Platform-Specific Features

#### Windows
- Fluent Design System
- Acrylic materials
- Reveal effects
- Connected animations

#### macOS
- SF Symbols
- Vibrancy effects
- macOS Big Sur design
- Gesture support

#### Linux
- GNOME HIG compliance
- Elementary OS guidelines
- KDE integration
- Theme-aware

## 🧪 Testing

### Unit Tests
```bash
# Electron
npm test

# Tauri
cargo test

# Windows Native
dotnet test

# macOS Native
xcodebuild test

# Linux Native
cargo test
```

### Integration Tests
- Spectron for Electron
- WebDriver for Tauri
- UI Automation for native apps

## 📊 Performance Benchmarks

| Metric | Electron | Tauri | Native |
|--------|----------|-------|---------|
| Startup Time | ~2s | ~0.5s | ~0.3s |
| Memory Usage | ~150MB | ~50MB | ~30MB |
| Binary Size | ~70MB | ~15MB | ~10MB |
| CPU Idle | ~2% | ~0.5% | ~0.1% |

## 🔒 Security Features

- **Code Signing**: All binaries are signed
- **Notarization**: macOS apps are notarized
- **Sandbox**: Apps run in sandboxed environment
- **Updates**: Signed update packages
- **Encryption**: Local data encryption
- **Auth**: Biometric authentication support

## 🌐 Localization

Supported languages:
- English (en-US)
- Spanish (es-ES)
- French (fr-FR)
- German (de-DE)
- Italian (it-IT)
- Portuguese (pt-BR)
- Russian (ru-RU)
- Chinese Simplified (zh-CN)
- Japanese (ja-JP)
- Korean (ko-KR)

## 📱 Companion Features

- Mobile app sync
- Cloud backup
- Cross-device workflows
- Remote execution
- Push notifications