import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_CATEGORIES = [
  {
    name: "Thực phẩm chức năng",
    slug: "thuc-pham-chuc-nang",
    description: "Thực phẩm bổ sung, vitamin, khoáng chất, các sản phẩm hỗ trợ sức khỏe",
    icon: "🌿",
    guidelines: `CHÍNH SÁCH VÀ TIÊU CHUẨN CHO THỰC PHẨM CHỨC NĂNG:
SEO:
- Title tag: Bao gồm tên sản phẩm, thành phần chính, công dụng chính (60-70 ký tự)
- Meta description: Mô tả rõ ràng công dụng, thành phần, đối tượng dùng (150-160 ký tự)
- Heading H1: Tên sản phẩm rõ ràng, không keyword stuffing
- Nội dung: Tối thiểu 800-1200 từ, có đủ thành phần, công dụng, hướng dẫn sử dụng
- Schema markup: Product, Review, FAQ
- Internal links: Liên kết đến trang danh mục, sản phẩm liên quan
- Alt text: Ảnh sản phẩm phải có alt text mô tả

GOOGLE ADS:
- NGHIÊM CẤM: Tuyên bố chữa bệnh, điều trị bệnh
- NGHIÊM CẤM: Đảm bảo hiệu quả 100%, cam kết kết quả cụ thể
- NGHIÊM CẤM: Sử dụng từ "thuốc", "điều trị", "chữa trị"
- BẮT BUỘC: Ghi rõ "Thực phẩm này không phải là thuốc"
- BẮT BUỘC: Có thông tin nhà sản xuất, số đăng ký
- KHÔNG ĐƯỢC: Nhắm mục tiêu người dưới 18 tuổi
- Bằng chứng khoa học: Cần nguồn tham khảo uy tín

GOOGLE SHOPPING:
- Tên sản phẩm: Brand + Tên SP + Thành phần chính + Dung tích/Số lượng
- Mô tả: Thành phần, công dụng, hướng dẫn, đối tượng sử dụng
- Hình ảnh: Nền trắng, rõ ràng, đủ thông tin nhãn
- Giá: Hiển thị rõ ràng, không gây hiểu nhầm
- KHÔNG được quảng cáo như thuốc kê đơn

GDN (Google Display Network):
- Không sử dụng hình ảnh gây sợ hãi, shock
- Không hứa hẹn kết quả phi thực tế
- Phải có disclaimer rõ ràng
- Không nhắm mục tiêu người bệnh cụ thể`
  },
  {
    name: "Mỹ phẩm",
    slug: "my-pham",
    description: "Kem dưỡng da, serum, son môi, nước hoa, sản phẩm chăm sóc da mặt và cơ thể",
    icon: "💄",
    guidelines: `CHÍNH SÁCH VÀ TIÊU CHUẨN CHO MỸ PHẨM:
SEO:
- Title tag: Tên sản phẩm + Thương hiệu + Loại da/Vấn đề da cần giải quyết (60-70 ký tự)
- Meta description: Thành phần nổi bật, công dụng, loại da phù hợp (150-160 ký tự)
- H1: Tên sản phẩm rõ ràng, không nhồi từ khóa
- Nội dung: Thành phần, công dụng từng thành phần, cách dùng, da phù hợp
- Schema: Product, Review, FAQ schema
- Ảnh: Alt text mô tả sản phẩm, kết cấu, màu sắc

GOOGLE ADS:
- NGHIÊM CẤM: Tuyên bố y tế như "điều trị mụn", "chữa da"
- NGHIÊM CẤM: Kết quả trước/sau nếu không có bằng chứng
- NGHIÊM CẤM: Cam kết kết quả trong thời gian cụ thể mà không có nghiên cứu
- ĐƯỢC PHÉP: "Giúp giảm", "hỗ trợ", "cải thiện" (không "chữa", "điều trị")
- BẮT BUỘC: Có số đăng ký lưu hành, thông tin nhà sản xuất
- Không phân biệt màu da trong quảng cáo

GOOGLE SHOPPING:
- Tên: Brand + Tên SP + Loại + Size/Volume
- Mô tả: Thành phần chính (INCI name hoặc tên thông thường), công dụng, loại da phù hợp
- Hình ảnh: Nền trắng hoặc sạch, thấy rõ sản phẩm
- Danh mục: Phải đúng danh mục Google Product Taxonomy

GDN:
- Không dùng hình ảnh gây mặc cảm về ngoại hình
- Không so sánh "da xấu" và "da đẹp" theo cách phân biệt
- Không có nhân vật xuất hiện không phù hợp với sản phẩm`
  },
  {
    name: "Máy massage",
    slug: "may-massage",
    description: "Máy massage cầm tay, ghế massage, máy massage mặt, máy massage chân",
    icon: "💆",
    guidelines: `CHÍNH SÁCH VÀ TIÊU CHUẨN CHO MÁY MASSAGE:
SEO:
- Title tag: Tên máy + Thương hiệu + Loại massage + Vùng cơ thể (60-70 ký tự)
- Meta description: Công nghệ, công dụng, tính năng nổi bật, đối tượng dùng (150-160 ký tự)
- H1: Tên sản phẩm + mô tả ngắn
- Nội dung: Thông số kỹ thuật, chế độ massage, hướng dẫn sử dụng, bảo hành
- Schema: Product, Review, FAQ, HowTo schema

GOOGLE ADS:
- NGHIÊM CẤM: Tuyên bố chữa bệnh, điều trị bệnh lý
- NGHIÊM CẤM: Kết quả y tế cụ thể như "chữa đau lưng mãn tính"
- ĐƯỢC PHÉP: "Giúp giảm mỏi", "thư giãn cơ", "hỗ trợ lưu thông máu"
- Phải có thông tin CE, FDA hoặc chứng nhận an toàn nếu có
- Không nhắm trẻ em nếu sản phẩm không phù hợp

GOOGLE SHOPPING:
- Tên: Brand + Model + Loại máy massage + Vùng sử dụng
- Mô tả: Công nghệ, số chế độ, công suất, pin/điện, kích thước, màu sắc
- Hình ảnh: Rõ ràng, nền sạch, nhiều góc độ nếu có thể
- Thông số kỹ thuật bắt buộc: Điện áp, công suất, trọng lượng, bảo hành
- Danh mục: Personal Care Appliances

GDN:
- Không dùng hình ảnh người đang đau đớn gây shock
- Không phóng đại kết quả
- Phải có hình ảnh thực tế sản phẩm`
  },
  {
    name: "Thiết bị làm đẹp",
    slug: "thiet-bi-lam-dep",
    description: "Máy rửa mặt, máy xông hơi, máy đẩy dưỡng chất, thiết bị chăm sóc da",
    icon: "✨",
    guidelines: `CHÍNH SÁCH VÀ TIÊU CHUẨN CHO THIẾT BỊ LÀM ĐẸP:
SEO:
- Title tag: Tên thiết bị + Thương hiệu + Công nghệ + Chức năng (60-70 ký tự)
- Meta description: Công nghệ, lợi ích, đối tượng da, cách dùng (150-160 ký tự)
- H1: Tên thiết bị + Slogan/mô tả ngắn
- Nội dung: Công nghệ hoạt động, hướng dẫn sử dụng, đối tượng phù hợp, bảo hành

GOOGLE ADS:
- NGHIÊM CẤM: Tuyên bố điều trị y tế (nếu không được FDA/Bộ Y tế chứng nhận)
- ĐƯỢC PHÉP: Tuyên bố làm đẹp như "cải thiện độ ẩm", "tăng hiệu quả hấp thu"
- Phải có chứng nhận CE, chứng nhận an toàn điện
- Không tuyên bố kết quả mà không có bằng chứng khoa học

GOOGLE SHOPPING:
- Tên: Brand + Model + Loại thiết bị + Công nghệ
- Mô tả: Công nghệ, chế độ, thông số kỹ thuật, màu sắc, phụ kiện đi kèm
- Hình ảnh: Nền trắng, sản phẩm rõ ràng
- Thuộc tính bắt buộc: Điện áp, công suất, bảo hành

GDN:
- Hình ảnh phải thể hiện rõ sản phẩm
- Không dùng hình ảnh phóng đại hiệu quả
- Có disclaimer nếu cần`
  },
  {
    name: "Dược phẩm OTC",
    slug: "duoc-pham-otc",
    description: "Thuốc không kê đơn, sản phẩm y tế được phép quảng cáo",
    icon: "💊",
    guidelines: `CHÍNH SÁCH VÀ TIÊU CHUẨN CHO DƯỢC PHẨM OTC:
SEO:
- Title tag: Tên thuốc + Hoạt chất + Dạng bào chế + Nhà sản xuất
- Meta description: Chỉ định, liều dùng, đối tượng, lưu ý (150-160 ký tự)
- H1: Tên thương mại + Tên hoạt chất
- Nội dung: Thành phần, chỉ định, chống chỉ định, liều dùng, tác dụng phụ, bảo quản
- BẮT BUỘC: Số đăng ký thuốc, nhà sản xuất, nhà nhập khẩu

GOOGLE ADS:
- CỰC KỲ NGHIÊM NGẶT: Google yêu cầu phê duyệt đặc biệt
- BẮT BUỘC: Chỉ được quảng cáo thuốc OTC được phép
- BẮT BUỘC: Phải có cảnh báo "Đọc kỹ hướng dẫn trước khi dùng"
- NGHIÊM CẤM: Tuyên bố chữa khỏi hoàn toàn
- NGHIÊM CẤM: So sánh với thuốc kê đơn
- Phải tuân thủ quy định địa phương về quảng cáo thuốc

GOOGLE SHOPPING:
- Thường bị hạn chế, cần xin phê duyệt đặc biệt từ Google
- Số đăng ký bắt buộc phải có
- Giá phải cạnh tranh và minh bạch

GDN:
- Chỉ nhắm mục tiêu người trưởng thành
- Không nhắm mục tiêu theo bệnh cụ thể
- Phải có disclaimer y tế đầy đủ`
  }
];

router.get("/categories", async (req, res): Promise<void> => {
  try {
    const existing = await db.select().from(categoriesTable);
    if (existing.length === 0) {
      const inserted = await db.insert(categoriesTable).values(DEFAULT_CATEGORIES).returning();
      res.json(inserted);
    } else {
      res.json(existing);
    }
  } catch (err) {
    req.log.error({ err }, "Không thể lấy danh sách danh mục");
    res.status(500).json({ error: "Không thể lấy danh sách danh mục." });
  }
});

export default router;
