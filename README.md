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
   - Dữ liệu được lưu vào các bảng `Repository`, `Release`, `Commit` trong database `gitstar`
   - Sử dụng ORM Prisma: đảm bảo mapping và migrate schema linh hoạt.

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

## 4. Đánh giá và Nguyên nhân của Các Vấn đề Gặp Phải

### 4.1. Đánh giá tổng quan
Việc thu thập dữ liệu từ trang chủ GitHub để lấy danh sách các repository được gắn sao nhiều nhất (top-starred repos) tiêu tốn rất nhiều thời gian và dễ gặp lỗi. Dưới đây là các vấn đề cụ thể:

### 4.2. Các vấn đề gặp phải

#### Giới hạn số lượng repository
- GitHub chỉ cho phép truy xuất tối đa 1000 repo từ trang Explore (bằng cách phân trang), gây khó khăn trong việc thu thập 5000 repo như mục tiêu ban đầu.

#### Rate limit từ GitHub API
- Khi dùng GitHub Token, API giới hạn ở 5000 request/giờ/token.
- Trong khi đó, tổng số request để thu thập đầy đủ dữ liệu có thể lên tới (77539 releases + 5000 repo = 82539) request, chưa kể các lượt retry.

#### Mất mát dữ liệu do lỗi mạng hoặc gián đoạn
- Trong quá trình crawl, nếu gặp lỗi (timeout, mạng yếu, proxy die...) mà không có cơ chế khôi phục tốt thì dễ dẫn đến thiếu dữ liệu.

#### Giới hạn đồng thời
- GitHub chỉ cho phép tối đa 100 kết nối đồng thời, việc vượt quá ngưỡng này khiến IP hoặc token dễ bị block hoặc throttled.

#### Thời gian crawl kéo dài
- Với tốc độ hiện tại và giới hạn token, quá trình crawl có thể kéo dài tới 15 tiếng hoặc hơn, đặc biệt nếu phải chờ hết hạn rate limit.

#### Hiệu suất ghi vào database chưa tối ưu
- Các thao tác ghi dữ liệu có độ trễ cao, đặc biệt khi không có batch insert hoặc connection pool hiệu quả.

#### Benchmark của version ban đầu chỉ sử dụng 1 github token và không có xử lý song song
![Screenshot 2025-05-07 at 22 13 20](https://github.com/user-attachments/assets/465d336e-437d-4a97-8a7c-735c394ab8eb)



## 5. Cải tiến và So sánh Hiệu Suất

### 5.1. Các cải tiến chính

#### Sử dụng GitStar thay thế GitHub Explore
- GitStar là một dịch vụ trung gian thống kê các repo được gắn sao nhiều nhất
- Việc crawl dữ liệu từ đây giúp vượt qua giới hạn 1000 repo của GitHub Explore

#### Sử dụng nhiều GitHub token theo cơ chế Round-Robin
- Chia đều các request qua nhiều token để phân tải và tránh rate limit
- Giúp giảm thời gian chờ và tăng số lượng request xử lý mỗi giờ

#### Bổ sung cơ chế retry
- Với các request lỗi (timeout, 403, 500...), hệ thống tự động retry với backoff
- Tránh mất dữ liệu trong các đợt gián đoạn tạm thời

#### Tích hợp proxy xoay tua (Round-Robin Proxy)
- Giảm nguy cơ bị chặn IP hoặc throttled do gửi nhiều request từ một địa chỉ IP cố định

#### Dùng BullJS + Redis để xử lý song song
- Áp dụng hàng đợi công việc với Bull + Redis, chia việc crawl cho 70 worker song song
- Giảm thời gian crawl từ 15 tiếng xuống còn khoảng vài giờ

#### Benchmark của version cải tiến với việc sử dụng 40 worker để crawl releases, commit song song và 8 github token
![Screenshot 2025-05-07 at 22 23 50](https://github.com/user-attachments/assets/fb0df781-9be7-4783-8f1a-4f864fdfb05d)


## 6. Thiết kế Cơ sở dữ liệu

Dự án sử dụng cơ sở dữ liệu **PostgreSQL** được quản lý thông qua **Prisma ORM**.

Cơ sở dữ liệu bao gồm **3 bảng chính**:

### 1. `Repo`
Đại diện cho một repository trên Github.

| Trường      | Kiểu dữ liệu | Mô tả                           |
|-------------|--------------|----------------------------------|
| `id`        | UUID         | Khóa chính, tự sinh             |
| `name`      | String       | Tên repository                  |
| `owner`     | String       | Chủ sở hữu repository           |
| `createdAt` | DateTime     | Thời điểm tạo repository        |
| `updatedAt` | DateTime     | Tự động cập nhật khi có thay đổi |
| `releases`  | Release[]    | Danh sách các phiên bản phát hành liên kết |

- **Ràng buộc duy nhất**: `(name, owner)`
- **Index**: `(name, owner)`

---

### 2. `Release` - Phiên bản phát hành
Đại diện cho một phiên bản Release của Repository.

| Trường     | Kiểu dữ liệu | Mô tả                             |
|------------|--------------|------------------------------------|
| `id`       | UUID         | Khóa chính, tự sinh               |
| `tagName`  | String       | Tên thẻ phiên bản (VD: v1.0.0)     |
| `body`     | String       | Nội dung mô tả phiên bản           |
| `repoId`   | UUID         | Khóa ngoại đến bảng `Repo`        |
| `repo`     | Quan hệ      | Liên kết đến một `Repo` cụ thể     |
| `commits`  | Commit[]     | Danh sách các commit liên quan     |

- **Ràng buộc duy nhất**: `(tagName, repoId)`  
- **Index**: `repoId`

---

### 3. `Commit` - Cam kết mã nguồn
Đại diện cho một commit mã nguồn, có thể liên kết với một phiên bản phát hành.

| Trường       | Kiểu dữ liệu | Mô tả                             |
|--------------|--------------|------------------------------------|
| `id`         | UUID         | Khóa chính, tự sinh               |
| `sha`        | String       | Mã định danh commit duy nhất      |
| `message`    | String       | Thông điệp commit                 |
| `releaseId`  | UUID?        | Khóa ngoại đến bảng `Release` (có thể null) |
| `release`    | Quan hệ      | Liên kết đến một `Release` (nếu có) |

- **Ràng buộc duy nhất**: `sha`
- **Index**: `releaseId`, `sha`

---

### Quan hệ giữa các bảng

- Một `Repo` **có nhiều** `Release`
- Một `Release` **có thể có nhiều** `Commit`
- Một `Commit` **có thể thuộc về** một `Release` (hoặc không)

### Cấu hình kết nối cơ sở dữ liệu

Tham số kết nối được lưu trong biến môi trường `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## 7. Tính năng đã hoàn thành

| Tính năng                             | Mô tả chi tiết |
|--------------------------------------|----------------|
| **Xác thực nhiều token**             | Hệ thống hỗ trợ nhiều GitHub token và tự động đổi token khi gặp rate limit. |
| **Luân phiên proxy**                 | Tự động xoay vòng proxy để phân tán tải và tránh bị chặn IP. |
| **Crawl repository có phân trang**   | Hỗ trợ crawl dữ liệu repository và các release kèm commit với phân trang. |
| **Hàng đợi BullJS + Redis**          | Sử dụng Bull Queue kết hợp Redis để xử lý crawl theo hàng đợi, tối ưu hiệu suất. |
| **Xử lý giới hạn rate + retry**      | Tự động phát hiện và xử lý khi gặp rate limit từ GitHub, retry theo exponential backoff. |
| **So sánh commit giữa các tag**      | Thu thập danh sách commit giữa hai phiên bản (tag) để lưu trữ và phân tích. |
| **Redis cache release cuối**         | Cache release mới nhất mỗi repo trong Redis để tránh crawl lại dữ liệu đã có. |
| **Lưu vào PostgreSQL**               | Toàn bộ dữ liệu được lưu có cấu trúc trong PostgreSQL bằng Prisma ORM. |
| **Viết tài liệu README**             | Tài liệu hóa chi tiết quy trình thực hiện, cấu trúc dự án và các tính năng trong README. |

