# Quản Lý Trọ (QL_Tro_App)

Đây là ứng dụng Frontend xây dựng bằng Expo React Native dành cho backend `QL_Tro`. Ứng dụng có thể chạy trên trình duyệt (Expo Web), Android và iOS.

## Chạy Ứng Dụng (Local)

Cài đặt các gói phụ thuộc và khởi chạy ứng dụng web:
```bash
npm install
npm run web
```

Mặc định, ứng dụng sẽ gọi API tới backend tại địa chỉ:
```text
http://localhost:8080
```

Để thay đổi URL của API, hãy tạo file `.env` từ file mẫu `.env.example`:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

**Lưu ý:** Khi chạy thử nghiệm trên điện thoại thật thông qua ứng dụng Expo Go, bạn cần thay thế `localhost` bằng địa chỉ IP LAN của máy tính đang chạy backend (đảm bảo cả hai dùng chung mạng Wi-Fi). Ví dụ:
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080
```

## Tính năng Real-time & Thanh toán PayOS

- Ứng dụng tự động suy ra địa chỉ WebSocket (URL) từ `EXPO_PUBLIC_API_BASE_URL`: giao thức `http` sẽ được đổi thành `ws`, `https` sẽ thành `wss`.
- Ngay sau khi đăng nhập thành công, ứng dụng sẽ gửi chuỗi xác thực (JWT) để kết nối với kênh `/ws/realtime`.
- Khi có thay đổi (chẳng hạn như thanh toán qua PayOS), Webhook sẽ cập nhật dữ liệu trên backend; ngay lập tức backend sẽ phát đi sự kiện `GLOBAL_UPDATE` để giao diện tự động làm mới theo thời gian thực.
- Ứng dụng có cơ chế tự động kết nối lại (reconnect) với độ trễ tăng dần (backoff từ 1-30 giây) và tự động đồng bộ lại dữ liệu (hóa đơn, dashboard...) khi kết nối lại thành công hoặc khi người dùng quay lại ứng dụng (foreground).
- **Khi đưa lên môi trường thực tế (Deploy):** Backend bắt buộc phải có một địa chỉ URL công khai để nhận Webhook từ PayOS, đồng thời tên miền của frontend phải được khai báo trong danh sách `CORS_ALLOWED_ORIGINS` của backend.

## Các Màn Hình Chức Năng

1. Đăng nhập
2. Dashboard (Bảng tổng quan thống kê)
3. Quản lý Nhà trọ và Phòng
4. Quản lý Khách thuê
5. Quản lý Hợp đồng
6. Cài đặt Dịch vụ và Ghi số điện nước
7. Quản lý Hóa đơn, Thanh toán (PayOS) và Yêu cầu bảo trì

## Kiểm Tra & Triển Khai

Để kiểm tra lỗi kiểu dữ liệu (TypeScript) và tình trạng của dự án:
```bash
npm run typecheck
npx expo-doctor
```

Xuất bản ứng dụng web để đưa lên hosting (Vercel, Netlify...):
```bash
npx expo export --platform web
```
