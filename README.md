# Vision20 Desktop

Ứng dụng desktop của Vision20 (macOS, Windows): họp trực tuyến, nhắn tin và gọi điện.
Electron + React + TypeScript, video qua Agora (`agora-electron-sdk`).

## Cài đặt

```bash
npm install
```

`agora-electron-sdk` là native module, được cài trong `release/app`.

## Chạy khi phát triển

```bash
npm start
```

Mặc định app dùng API production (`https://api.vision20.us/v1`). Muốn trỏ sang backend khác:

```bash
VISION_API_URL=http://localhost:50002/v1 npm start
```

## Đóng gói

```bash
npm run package
```

Bộ cài nằm trong `release/build` (`Vision20-Setup-<version>-<arch>.exe`, `.dmg`).
