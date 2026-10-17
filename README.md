# Sutta MCP

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-%5E1.10.1-purple)](https://modelcontextprotocol.io)

MCP server kết nối Claude với SuttaCentral — giúp trả lời câu hỏi Phật pháp có trích dẫn nguồn kinh điển.

## Tools

| Tool | Mô tả |
|------|-------|
| `search_topic` | Tìm sutta theo chủ đề (vô ngã, chánh niệm, tứ diệu đế...) |
| `get_sutta` | Lấy toàn văn sutta theo UID, mỗi đoạn kèm segment ID để dẫn link tới đúng đoạn trên SuttaCentral |
| `get_sutta_meta` | Metadata: tên, blurb, độ khó, danh sách bản dịch |
| `get_parallels` | Parallels giữa các truyền thống (Pali, Hán tạng, Sanskrit) |
| `list_divisions` | Liệt kê các bộ kinh, lọc theo tạng (sutta/vinaya/abhidhamma) |

## Cài đặt

```bash
git clone https://github.com/nbkhoi/sutta-mcp.git
cd sutta-mcp
npm install
npm run build
```

## Chạy thử (dev mode)

```bash
npm run dev
```

## Tích hợp vào Claude.ai (Claude Desktop)

Thêm vào file config của Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "suttacentral": {
      "command": "node",
      "args": ["/đường/dẫn/tuyệt/đối/sutta-mcp/dist/index.js"]
    }
  }
}
```

Sau đó restart Claude Desktop. MCP sẽ xuất hiện trong danh sách tools.

## Ví dụ sử dụng

Khi đã kết nối, bạn có thể hỏi Claude:

> "Đức Phật dạy gì về vô ngã? Hãy trích dẫn kinh điển."

> "Tìm cho tôi các sutta về chánh niệm và giải thích tóm tắt."

> "MN 10 có parallels trong Hán tạng không?"

Claude sẽ tự động gọi MCP tools, tra cứu SuttaCentral, rồi trả lời có nguồn cụ thể.

## Chủ đề có sẵn

Tiếng Anh: `mindfulness`, `four noble truths`, `eightfold path`, `not-self`, `impermanence`,
`loving-kindness`, `dependent origination`, `aggregates`, `nibbana`, `kamma`, `jhana`, `triple gem`

Tiếng Việt: `chánh niệm`, `tứ diệu đế`, `bát chánh đạo`, `vô ngã`, `vô thường`,
`từ bi`, `duyên khởi`, `ngũ uẩn`, `niết bàn`, `nghiệp`, `thiền`, `quy y`

## Mở rộng

Để thêm chủ đề mới, chỉnh `TOPIC_INDEX` trong `src/index.ts`.
Đây là prototype — bước tiếp theo là tích hợp Elasticsearch của SuttaCentral để search thực sự.

## Lưu ý

SuttaCentral yêu cầu content của họ không được dùng để train AI.
MCP này chỉ fetch dữ liệu theo thời gian thực để trả lời người dùng và không train.
Hiện chưa có cache; nếu thêm (roadmap mục 6), cache chỉ là bản sao tạm thời, có giới hạn,
không tích lũy thành bộ dữ liệu.

## Tài liệu thiết kế

- [Đặc tả và roadmap](specs/sutta-mcp-requirements.md) — tools, ràng buộc, hướng nâng cấp
- [Danh sách spec tính năng](specs/INDEX.md)

## Giấy phép

Sutta MCP phát hành theo [PolyForm Noncommercial 1.0.0](LICENSE). Bạn được dùng, sửa và chia sẻ
tự do cho mọi mục đích phi thương mại — tu học cá nhân, thực hành tôn giáo, nghiên cứu, chùa và
tổ chức từ thiện, trường học, cơ quan nhà nước. Không được bán hoặc dùng cho mục đích thương mại.
Đây là giấy phép source-available, không phải open source theo định nghĩa của OSI.

Tác giả không bán dự án này. Theo tinh thần SuttaCentral cho đi kinh điển miễn phí, Sutta MCP
cũng được cho đi như một pháp thí.

Giấy phép chỉ áp dụng cho code của Sutta MCP. Nội dung kinh do SuttaCentral cung cấp theo
[điều khoản riêng của SuttaCentral](https://suttacentral.net/licensing).
