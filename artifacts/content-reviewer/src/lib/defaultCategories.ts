export interface DefaultCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  guidelines: string;
}

export const DEFAULT_SYSTEM_CATEGORIES: DefaultCategory[] = [
  {
    id: 1,
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
- Bằng chứng khoa học: Cần nguồn tham khảo uy tín`,
  },
  {
    id: 2,
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
- Không phân biệt màu da trong quảng cáo`,
  },
  {
    id: 3,
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
- Phải có thông tin CE, FDA hoặc chứng nhận an toàn nếu có`,
  },
  {
    id: 4,
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
- NGHIÊM CẤM: Tuyên bố điều trị y tế
- ĐƯỢC PHÉP: Tuyên bố làm đẹp như "cải thiện độ ẩm", "tăng hiệu quả hấp thu"
- Phải có chứng nhận an toàn điện và bằng chứng phù hợp`,
  },
  {
    id: 5,
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

GOOGLE ADS:
- CỰC KỲ NGHIÊM NGẶT: Chỉ được quảng cáo khi đáp ứng đúng điều kiện địa phương
- BẮT BUỘC: Có cảnh báo sử dụng rõ ràng
- NGHIÊM CẤM: Tuyên bố chữa khỏi hoàn toàn và so sánh sai lệch với thuốc kê đơn`,
  },
];
