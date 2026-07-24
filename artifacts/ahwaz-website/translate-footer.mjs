import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');

const NEW_KEYS = {
  en: {
    "footer.desc": "Your trusted global supplier of precision industrial instrumentation. We deliver major brands at competitive wholesale prices to procurement engineers worldwide.",
    "footer.quickLinks": "Quick Links",
    "footer.topCategories": "Top Categories",
    "footer.warranty": "12-Month Factory Warranty • Fast Global Shipping",
    "footer.chat": "Chat with Sales"
  },
  id: {
    "footer.desc": "Pemasok global instrumentasi industri presisi tepercaya Anda. Kami memberikan merek-merek utama dengan harga grosir yang kompetitif kepada para insinyur pengadaan di seluruh dunia.",
    "footer.quickLinks": "Tautan Cepat",
    "footer.topCategories": "Kategori Teratas",
    "footer.warranty": "Garansi Pabrik 12 Bulan • Pengiriman Global Cepat",
    "footer.chat": "Ngobrol dengan Penjualan"
  },
  vi: {
    "footer.desc": "Nhà cung cấp toàn cầu đáng tin cậy của bạn về thiết bị đo lường công nghiệp chính xác. Chúng tôi cung cấp các thương hiệu lớn với giá bán buôn cạnh tranh cho các kỹ sư mua sắm trên toàn thế giới.",
    "footer.quickLinks": "Liên kết nhanh",
    "footer.topCategories": "Danh mục hàng đầu",
    "footer.warranty": "Bảo hành nhà máy 12 tháng • Giao hàng toàn cầu nhanh chóng",
    "footer.chat": "Trò chuyện với phòng bán hàng"
  },
  ar: {
    "footer.desc": "المورد العالمي الموثوق به للأجهزة الصناعية الدقيقة. نحن نقدم العلامات التجارية الكبرى بأسعار جملة تنافسية لمهندسي المشتريات في جميع أنحاء العالم.",
    "footer.quickLinks": "روابط سريعة",
    "footer.topCategories": "أهم الفئات",
    "footer.warranty": "ضمان المصنع لمدة 12 شهرًا • شحن عالمي سريع",
    "footer.chat": "الدردشة مع المبيعات"
  }
};

let i18nContent = fs.readFileSync(i18nPath, 'utf8');

for (const lang of Object.keys(NEW_KEYS)) {
  const langObj = NEW_KEYS[lang];
  for (const [k, v] of Object.entries(langObj)) {
    const regex = new RegExp(`(${lang}: \\{)([\\s\\S]*?)(\\n\\s*\\},|\\n\\s*\\}\\n*};)`);
    i18nContent = i18nContent.replace(regex, (match, p1, p2, p3) => {
      // Add the new key properly with a leading comma to avoid syntax errors
      const newEntry = `,\n    "${k}": ${JSON.stringify(v)}`;
      return p1 + p2 + newEntry + p3;
    });
  }
}

fs.writeFileSync(i18nPath, i18nContent);
console.log("Footer translations injected successfully.");
