#!/usr/bin/env python3
"""
PhotoFrame Studio CLI
Batch process photos to add camera watermark frames automatically from EXIF data.
"""

import sys
import os
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Tự động gắn Frame Watermark từ thông số EXIF của ảnh.")
    parser.add_argument("-i", "--input", required=True, help="Đường dẫn đến file ảnh hoặc thư mục chứa ảnh")
    parser.add_argument("-o", "--output", default="output", help="Thư mục lưu ảnh kết quả (mặc định: ./output)")
    parser.add_argument("-s", "--style", choices=["iphone", "studio", "leica_dark", "leica_white", "blur"], default="iphone", help="Kiểu frame: iphone, studio, leica_dark, leica_white hoặc blur")
    parser.add_argument("-z", "--zip", action="store_true", help="Nén toàn bộ kết quả vào một file .zip duy nhất")
    parser.add_argument("-w", "--web", action="store_true", help="Mở giao diện Web App trực quan")

    args = parser.parse_args()

    if args.web:
        import server
        server.main()
        return

    try:
        from PIL import Image, ImageDraw, ImageFont, ImageFilter, ExifTags
    except ImportError:
        print("\n❌ Chưa tìm thấy thư viện Pillow.")
        print("💡 Để dùng qua dòng lệnh (CLI), hãy cài đặt: pip3 install pillow piexif")
        print("🚀 Hoặc chạy giao diện Web App trực quan ngay mà KHÔNG CẦN CÀI GÌ: ./start.command hoặc python3 server.py\n")
        sys.exit(1)

    import zipfile
    from datetime import datetime

    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if input_path.is_file():
        files = [input_path]
    elif input_path.is_dir():
        files = [f for f in input_path.iterdir() if f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']]
    else:
        print(f"❌ Đường dẫn không hợp lệ: {input_path}")
        sys.exit(1)

    print(f"📸 Tìm thấy {len(files)} ảnh cần xử lý...")
    saved_files = []

    for idx, f in enumerate(files, 1):
        print(f"[{idx}/{len(files)}] Đang xử lý: {f.name}...")
        try:
            # Process image and save
            with Image.open(f) as img:
                exif = img.getexif()
                # Simple extraction
                model = exif.get(0x0110, "CAMERA")
                make = exif.get(0x010F, "")
                lens = exif.get(0xA434, "")
                date_time = exif.get(0x0132, "")

                w, h = img.size
                banner_h = int(h * 0.12)
                new_img = Image.new("RGB", (w, h + banner_h), "white")
                new_img.paste(img, (0, 0))

                draw = ImageDraw.Draw(new_img)
                # Left text
                draw.text((int(w * 0.05), h + int(banner_h * 0.25)), f"{make} {model}".strip(), fill="black")
                if lens:
                    draw.text((int(w * 0.05), h + int(banner_h * 0.55)), str(lens), fill="#555555")

                out_file = output_dir / f"{f.stem}_framed.jpg"
                new_img.save(out_file, quality=95)
                saved_files.append(out_file)
                print(f"   ✓ Đã lưu: {out_file}")
        except Exception as e:
            print(f"   ⚠️ Lỗi khi xử lý {f.name}: {e}")

    if args.zip and saved_files:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_path = output_dir / f"PhotoFrame_Export_{timestamp}.zip"
        print(f"\n📦 Đang nén {len(saved_files)} ảnh vào {zip_path.name}...")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for sf in saved_files:
                zipf.write(sf, arcname=sf.name)
        print(f"🎉 Đã nén thành công file ZIP: {zip_path.resolve()}")
    else:
        print(f"\n🎉 Hoàn tất! Ảnh đã được lưu vào: {output_dir.resolve()}")

if __name__ == '__main__':
    main()
