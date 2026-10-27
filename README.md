# 📸 PhotoFrame Studio (macOS)
### Công cụ tự động trích xuất EXIF & Đóng khung Watermark máy ảnh

Một công cụ chuyên nghiệp, tốc độ cao chạy trực tiếp trên máy Mac của bạn. Bạn chỉ cần kéo thả ảnh hoặc chọn cả thư mục ảnh, công cụ sẽ **tự động đọc thông số EXIF** và gắn các mẫu khung Watermark máy ảnh chuẩn chỉnh như trong hình mẫu.

---

## ✨ Tính năng nổi bật

1. **Tự động trích xuất 100% dữ liệu EXIF từ ảnh:**
   - **Tên máy ảnh (Camera Body):** Ví dụ `FUJIFILM X-T2`, `SONY ILCE-7M4`, `Canon EOS R6`, `NIKON Z6_2`, `LEICA M10`...
   - **Tên ống kính (Lens):** Ví dụ `XF18-55mmF2.8-4 R LM OIS`, `FE 24-70mm F2.8 GM II`...
   - **Thời gian chụp:** Định dạng chuẩn `YYYY.MM.DD HH:mm:ss`.
   - **Thông số phơi sáng:** Tiêu cự (`55mm`), Khẩu độ (`f/4`), Tốc độ màn trập (`1/250s`), Độ nhạy sáng (`ISO800`).

2. **Các Mẫu Template Khung Ảnh Chuẩn Chỉnh:**
   - 🌑 **Leica In-Photo (Hình 1):** Watermark nằm trực tiếp trong khung hình của ảnh (không thêm viền đen ngoài, giữ 100% tỷ lệ gốc của ảnh). Logo Leica đỏ cùng thông số phơi sáng, model máy, GPS và ngày giờ được phủ mềm ở đáy ảnh với gradient tinh tế.
   - ⚪ **Leica White Mat (Hình 2):** Phong cách Gallery trắng thanh lịch. Logo đỏ và cụm thông số căn giữa toàn bộ (`xiaomi 17 Ultra by Leica`, `16mm f2.8 1/100s ISO200`).
   - 🖼️ **Studio Mat (Apple Card):** Khung viền trắng gallery bao quanh ảnh. Cụm thông số 3 dòng (Tiêu cự `16mm`, F/S/ISO nhãn xám, GPS/Lens) bên trái và Tên máy bên phải.
   - 📱 **iPhone Style:** Khung viền đáy trắng tối giản, thanh lịch. Cột trái Tên máy + Lens, ở giữa là Logo hãng, cột phải là thông số phơi sáng.
   - 🎬 **Cinematic Blur:** Nền mờ Gaussian Blur từ bức ảnh, bo tròn góc + đổ bóng mờ nghệ thuật.
   - 🎞️ **Camera Live View:** HUD kính ngắm máy ảnh chuyên nghiệp.

3. **Tự động nhận diện Logo các hãng máy ảnh:**
   - Tự động nhận diện dựa trên tên máy trong EXIF: **FUJIFILM, SONY, CANON, NIKON, LEICA, HASSELBLAD, APPLE, LUMIX, RICOH, OLYMPUS...**
   - Hỗ trợ chọn logo thủ công hoặc tải lên logo cá nhân (PNG tách nền/SVG).

4. **Tùy biến linh hoạt & Xuất hàng loạt:**
   - Điều chỉnh trực quan qua thanh trượt: Cỡ chữ, Độ dày viền khung, Cỡ logo, Độ mờ nền, Độ sáng nền.
   - Nút **"Nén & Tải về tất cả (.zip)"**: Tự động render full độ phân giải gốc của ảnh và đóng gói nén gọn gàng vào 1 file `.zip` duy nhất tải về trong 1 click.
   - **100% Offline & Bảo mật:** Hoạt động hoàn toàn trên máy Mac, không gửi ảnh lên bất kỳ server nào.

---

## 🚀 Cách sử dụng nhanh nhất trên Mac

### Cách 1: Click đúp để mở (Tiện lợi nhất)
1. Mở thư mục dự án trong **Finder**.
2. **Click đúp** vào file `start.command`.
3. Ứng dụng sẽ tự động mở ngay trên trình duyệt mặc định của máy Mac (Safari, Chrome, Arc...) tại địa chỉ `http://localhost:8080`.

### Cách 2: Chạy từ Terminal
Mở Terminal trong thư mục này và gõ:
```bash
./start.command
# hoặc
python3 server.py
```

### Cách 3: Chế độ dòng lệnh (CLI Batch Processing)
Nếu bạn muốn xử lý nhanh cả thư mục ảnh qua Terminal mà không cần mở trình duyệt:
```bash
python3 photoframe.py -i /duong-dan-toi-folder-anh -o ./output -s iphone --zip
# hoặc style blur:
python3 photoframe.py -i /duong-dan-toi-folder-anh -o ./output -s blur --zip
```
*(Yêu cầu cài thêm Pillow nếu dùng CLI: `pip3 install pillow`)*.

---

## 📂 Cấu trúc mã nguồn
```
jolly-hopper/
├── index.html         # Giao diện chính ứng dụng Web Local
├── style.css          # Giao diện phong cách Apple Dark Mode
├── start.command      # File nhấp đúp để chạy ngay trên macOS
├── server.py          # Local server Python nhẹ, không phụ thuộc thư viện
├── photoframe.py      # Script chạy trực tiếp trong Terminal
├── src/
│   ├── app.js         # Quản lý hàng đợi ảnh, kéo thả, xuất file
│   ├── exif.js        # Parser đọc nhị phân EXIF gốc (Make, Model, Lens, Shutter, ISO...)
│   ├── renderer.js    # Engine vẽ khung ảnh độ phân giải cao bằng Canvas 2D
│   └── logos.js       # Bộ logo vector các hãng máy ảnh (Fujifilm, Sony, Canon...)
└── README.md
```
