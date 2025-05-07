# GitHub Repository Crawler
## Thông tin thành viên nhóm:
1. Phạm Xuân Trung - 22021127
2. Trần Anh Đức - 22021165
3. Nguyễn Hùng Dũng - 22021133

## 1. Giới thiệu Dự án

Dự án này là một công cụ thu thập dữ liệu từ GitHub, nhằm hỗ trợ việc phân tích thông tin về các repository phổ biến. Hệ thống được thiết kế để tự động lấy dữ liệu về repository, các bản phát hành (release) và commit, sau đó lưu vào cơ sở dữ liệu có cấu trúc để phục vụ mục đích nghiên cứu hoặc tổng hợp.

### Các tính năng chính

- Thu thập dữ liệu hàng ngày từ các repository được xếp hạng cao trên GitHub
- Xử lý công việc song song để tăng hiệu quả thu thập
- Hỗ trợ luân phiên token và giới hạn tốc độ (rate limit) của GitHub API
- Ghi nhận thông tin đầy đủ: repository, release, commit
- Có cơ chế xử lý lỗi và retry để cải thiện độ ổn định
- Hỗ trợ theo dõi hiệu suất thông qua module benchmark

## 2. Cài đặt

Trước khi khởi chạy hệ thống, bạn cần chuẩn bị:

- [Docker](https://www.docker.com/) và Docker Compose
- [Node.js](https://nodejs.org/) phiên bản 18 hoặc mới hơn
- [PNPM](https://pnpm.io/) để quản lý các gói phụ thuộc
- [Git](https://git-scm.com/) để sao chép mã nguồn

### Bước 1: Sao chép mã nguồn

```bash
git clone https://github.com/your-username/github-repo-crawler.git
cd github-repo-crawler
```

### Bước 2: Tạo tệp `.env` cấu hình môi trường

Tạo một file `.env` ở thư mục gốc và khai báo các biến theo hướng dẫn của file `example.env`.

### Bước 3: Chạy chương trình

```bash
docker compose up --build
```

Lệnh trên sẽ thực hiện:

- Khởi động cơ sở dữ liệu PostgreSQL và Redis

- Tự động migrate cơ sở dữ liệu

- Bắt đầu các tiến trình worker để xử lý job

- Lên lịch crawl định kỳ

## 2. Kiến trúc hệ thống

### 2.1. Sơ đồ Kiến trúc

Hệ thống được thiết kế theo kiến trúc phân tán và mở rộng với các thành phần chính:

- **Job Queue (Bull)**: Quản lý danh sách công việc cần crawl dữ liệu từ GitHub.
- **Redis**: Lưu trữ hàng đợi, cache kết quả xử lý và hỗ trợ retry job.
- **Worker**: Tiến trình xử lý song song, lấy job từ hàng đợi và thực hiện crawl.
- **Proxy & Token Rotation**: Dùng nhiều token và proxy để tránh bị giới hạn API.
- **PostgreSQL + Prisma**: Lưu trữ dữ liệu release và commit.
- **Benchmark Service**: Theo dõi hiệu suất và log hệ thống.

![Sơ đồ kiến trúc](./docs/assests/images/architecture.png)

### 2.2. Quy trình Xử lý

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

   - Cache trạng thái repo (release cuối cùng) để tránh crawl lặp. (Pending)
   - Đảm bảo phục hồi nhanh nếu hệ thống restart.

5. **Ghi vào cơ sở dữ liệu (PostgreSQL)**
   - Dữ liệu được lưu vào các bảng `repositories`, `releases`, `commits`.
   - Prisma ORM đảm bảo mapping và migrate schema linh hoạt.

## 3. Công nghệ sử dụng & Cấu trúc Module

### 3.1. Công nghệ sử dụng

| Thành phần      | Công nghệ                                             |
| --------------- | ----------------------------------------------------- |
| Ngôn ngữ chính  | TypeScript + Node.js                                  |
| Hàng đợi xử lý  | [BullJS](https://github.com/OptimalBits/bull) + Redis |
| Giao tiếp HTTP  | [Axios](https://axios-http.com/) với token rotation   |
| Bộ nhớ đệm      | Redis (caching release/tags đã xử lý)                 |
| Cơ sở dữ liệu   | PostgreSQL (ORM: [Prisma](https://www.prisma.io/))    |
| Triển khai      | Docker + Docker Compose                               |
| Proxy HTTP      | https-proxy-agent (luân phiên proxy)                  |
| Xác thực GitHub | GitHub Personal Access Tokens (PATs) luân phiên       |

---

### 3.2. Cấu trúc Module

#### `serviceFactory.ts` – Service Factory

- Quản lý singleton cho các service như Prisma, Bull, Redis.
- Khởi tạo, chia sẻ và dọn dẹp tài nguyên giữa các module.
- Đảm bảo các kết nối được đóng đúng cách khi tắt chương trình.

#### `dbService.ts` – Database Service

- Thực thi các giao dịch với PostgreSQL thông qua Prisma.
- Ghi dữ liệu theo batch, áp dụng upsert để giữ tính nhất quán.
- Hỗ trợ retry logic khi thao tác CSDL thất bại.

#### `crawlService.ts` – Crawl Service

- Giao tiếp với GitHub API: releases, tags, commits.
- Tự động xử lý rate limit, luân phiên token và proxy.
- Retry logic theo exponential backoff + delay nếu bị block.

#### `worker.ts` – Parallel Crawl System

- Lấy job từ hàng đợi và xử lý song song qua nhiều tiến trình.
- Hỗ trợ retry job thất bại, logging trạng thái.
- Áp dụng phân phối khối lượng công việc hiệu quả.

#### `benchmarkService.ts`

- Theo dõi hiệu suất toàn bộ hệ thống: số job thành công, thất bại.
- Ghi log và hỗ trợ thống kê trong quá trình crawl dữ liệu.

#### `config.ts`

- Quản lý biến môi trường: token GitHub, proxy, Redis, DB URI...
- Cấu hình các tham số hệ thống một cách tập trung.

#### Prisma Schema – Mô hình dữ liệu

- Định nghĩa các bảng:
  - `Repository`: thông tin repo (name, owner).
  - `Release`: tag, nội dung release, liên kết với repo.
  - `Commit`: SHA, message, liên kết với release.
- Hỗ trợ tự động migrate bằng Prisma CLI.
