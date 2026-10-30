# Sutta MCP

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-%5E1.10.1-purple)](https://modelcontextprotocol.io)

MCP server kết nối Claude với SuttaCentral — giúp trả lời câu hỏi Phật pháp có trích dẫn nguồn kinh điển.

## Tools

| Tool | Mô tả |
|------|-------|
| `search_instant` | Wrapper mỏng của search SuttaCentral (`GET /api/search/instant`): tham số API `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial` được gửi nguyên, tham số không truyền thì không gửi; `format` chọn `text` (mặc định: mọi kết quả theo thứ tự SC, kèm link) hoặc `json` (body response nguyên văn) |
| `get_bilarasuttas` | Văn bản segmented của một sutta (`GET /api/bilarasuttas/{uid}/{author_uid}?lang=`): tham số API `uid`, `author_uid` (bỏ trống thì chỉ có văn bản gốc), `lang` (bản dịch không phải tiếng Anh cần `lang` của bản dịch); mọi map (`root_text`, `translation_text`, `comment_text`, …) và `keys_order`, key là segment ID, không cắt; `format` `text` (mặc định) hoặc `json` |
| `get_suttaplex` | Metadata (`GET /api/suttaplex/{uid}?language=`): tham số API `uid`, `language`; nguyên mảng suttaplex, gồm mọi bản dịch trong `translations`; `format` `text` (mặc định) hoặc `json` |
| `get_parallels` | Parallels giữa các truyền thống (`GET /api/parallels/{uid}?language=`): tham số API `uid`, `language`; parallels theo anchor của sutta nguồn; `format` `text` (mặc định) hoặc `json` |
| `get_menu` | Cây duyệt của SuttaCentral (`GET /api/menu`, `GET /api/menu/{submenu_id}`, `?language=`): tham số API `submenu_id`, `language`; mỗi lời gọi trả một cấp con; `format` `text` (mặc định) hoặc `json` |

## Cài đặt

```bash
git clone https://github.com/nbkhoi/sutta-mcp.git
cd sutta-mcp
npm install
npm run build
# Chạy unit test offline (không cần mạng):
npm test
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

## Tìm bằng tiếng Việt

`search_instant` gửi truy vấn nguyên văn tới search của SuttaCentral, không ánh xạ hay dịch.
Để khớp tiêu đề tiếng Việt, truyền `language` = `vi`, ví dụ `{"query": "vô ngã", "language": "vi"}`.
Để có cả bản dịch tiếng Việt trong phần khớp nội dung (`hits`), thêm `selectedLanguages` có `vi`, ví dụ
`{"query": "vô ngã", "language": "vi", "selectedLanguages": ["vi", "pli"]}`. Khi bỏ trống `selectedLanguages`,
SuttaCentral dùng mặc định `["en", "pli"]`.
Để lấy toàn văn bản dịch tiếng Việt, dùng `get_bilarasuttas` với `author_uid` của bản dịch và `lang` = `vi`, ví dụ
`{"uid": "dhp1-20", "author_uid": "phantuananh", "lang": "vi"}`.

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
