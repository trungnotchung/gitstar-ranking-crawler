# 2 Kiến trúc hệ thống

## 2.1 Sơ đồ Kiến trúc

Hệ thống được thiết kế theo kiến trúc phân tán và mở rộng với các thành phần chính:

- **Job Queue (Bull)**: Quản lý danh sách công việc cần crawl dữ liệu từ GitHub.
- **Redis**: Lưu trữ hàng đợi, cache kết quả xử lý và hỗ trợ retry job.
- **Worker**: Tiến trình xử lý song song, lấy job từ hàng đợi và thực hiện crawl.
- **Proxy & Token Rotation**: Dùng nhiều token và proxy để tránh bị giới hạn API.
- **PostgreSQL + Prisma**: Lưu trữ dữ liệu release và commit.
- **Benchmark Service**: Theo dõi hiệu suất và log hệ thống.

![Sơ đồ kiến trúc](./github_crawler_architecture_diagram.png)

## 2.2 Quy trình Xử lý

1. **Thu thập repository**

   - Dùng GitHub API để lấy danh sách 5000 repo phổ biến nhất.
   - Hệ thống hỗ trợ lặp lại hàng ngày qua cron.

2. **Đưa vào hàng đợi**

   - Mỗi repo được thêm vào hàng đợi Bull dưới dạng một job riêng.

3. **Crawl song song**

   - Các worker nhận job và thực hiện crawl release/commit tương ứng.
   - Luân phiên token và proxy để tránh bị giới hạn.
   - Hỗ trợ retry, backoff, và log lỗi chi tiết.

4. **Lưu cache (Redis)**

   - Cache trạng thái repo (release cuối cùng) để tránh crawl lặp.
   - Đảm bảo phục hồi nhanh nếu hệ thống restart.

5. **Ghi vào cơ sở dữ liệu (PostgreSQL)**
   - Dữ liệu được lưu vào các bảng `repositories`, `releases`, `commits`.
   - Prisma ORM đảm bảo mapping và migrate schema linh hoạt.
