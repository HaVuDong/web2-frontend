import { Stagehand } from '@browserbasehq/stagehand';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const stagehand = new Stagehand({
    env: "LOCAL"
  });

  await stagehand.init();
  const page = stagehand.context.pages()[0];

  console.log("Đang mở trang web...");
  await page.goto("http://localhost:8081");
  
  console.log("Đợi vài giây để React Native Web render giao diện...");
  await page.waitForTimeout(3000);
  
  console.log("Web Agent DOM (Stagehand) đang bắt đầu phân tích màn hình để điền form...");
  
  // Bạn chỉ cần viết hướng dẫn bằng ngôn ngữ tự nhiên, Stagehand sẽ tự dò DOM / Vision để thực thi
  console.log("=> Bước 1: Nhập Email");
  await stagehand.act('Nhập "owner@gmail.com" vào ô input có nhãn Email');
  
  console.log("=> Bước 2: Nhập Mật khẩu");
  await stagehand.act('Nhập "123456" vào ô input có nhãn Mật khẩu');
  
  console.log("=> Bước 3: Đăng nhập");
  await stagehand.act('Nhấn vào nút Đăng nhập');
  
  console.log("Xong bước đăng nhập. Chờ vài giây để thấy kết quả...");
  await page.waitForTimeout(5000);
  
  await stagehand.close();
}

main().catch(console.error);
