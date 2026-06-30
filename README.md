# QL Tro Manager

Expo React Native frontend cho backend `QL_Tro`. App chay tren Expo Web, Android va iOS.

## Chay Local

```bash
npm install
npm run web
```

Backend mac dinh:

```text
http://localhost:8080
```

De doi API URL, tao file `.env` tu `.env.example`:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Khi chay tren dien thoai that, thay `localhost` bang IP LAN cua may dang chay backend, vi du:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080
```

## Realtime PayOS

- App tu suy ra WebSocket URL tu `EXPO_PUBLIC_API_BASE_URL`: `http` thanh `ws`, `https` thanh `wss`.
- Sau khi dang nhap, app gui JWT de xac thuc tai `/ws/realtime`.
- PayOS webhook cap nhat backend; backend phat `PAYMENT_UPDATED` de hoa don doi trang thai ngay.
- App tu ket noi lai theo backoff 1-30 giay va dong bo invoice/dashboard khi reconnect hoac quay lai foreground.
- Khi deploy, backend phai co URL cong khai cho PayOS webhook va origin frontend phai nam trong `CORS_ALLOWED_ORIGINS`.

## Man Hinh

1. Dang nhap
2. Dashboard
3. Nha tro va phong
4. Khach thue
5. Hop dong
6. Dich vu va dien nuoc
7. Hoa don, PayOS va bao tri

## Kiem Tra

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform web
```
