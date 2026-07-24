import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, 'src', 'pages');
const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');

const NEW_KEYS = {
  en: {
    "contact.getInTouch": "Get in Touch",
    "contact.getInTouchDesc": "Whether you need a single replacement transmitter or instrumentation for a complete plant overhaul, our engineering sales team is ready to assist.",
    "contact.email": "Email",
    "contact.phone": "WhatsApp / Phone",
    "contact.hours": "Business Hours",
    "contact.hoursDesc": "Mon - Fri: 8:30am – 6:00pm (CST)",
    "contact.hq": "Headquarters",
    "contact.enquiryReceived": "Enquiry Received!",
    "contact.enquiryDesc": "Thank you. Our sales team will get back to you within 30 minutes during business hours.",
    "contact.submitAnother": "Submit Another Enquiry",
    "contact.privacy": "By submitting this form, you agree to our privacy policy. We will not share your data.",
    "about.title": "About Flonexis",
    "about.subtitle": "EHUADE Automation — Your trusted procurement partner for industrial instrumentation.",
    "about.whoWeAre": "Who We Are",
    "about.desc1": "Based in China, Flonexis is a leading B2B wholesale exporter specializing in high-grade industrial instrumentation and automation equipment.",
    "about.desc2": "For over a decade, we have served as a critical supply chain link for procurement engineers, EPC contractors, and end-users in the Oil & Gas, Chemical, Power, and Pharmaceutical sectors across 50+ countries.",
    "about.desc3": "Our mission is simple: provide authentic, major-brand equipment with faster lead times and competitive pricing, backed by uncompromising technical support.",
    "about.commitment": "Our Commitment",
    "about.commit1": "100% Genuine factory-new equipment",
    "about.commit2": "12-Month standard factory warranty on all products",
    "about.commit3": "30-Minute quote response time during business hours",
    "about.commit4": "Strict quality control and pre-shipment inspection",
    "about.commit5": "Global logistics and customs clearance support",
    "ind.oil.title": "Oil & Gas",
    "ind.oil.desc": "Upstream extraction, midstream transport, and downstream refining require rugged, hazardous-area certified instrumentation. We supply explosion-proof pressure transmitters, Coriolis flow meters, and severe-service control valves.",
    "ind.chem.title": "Chemical Processing",
    "ind.chem.desc": "Corrosive environments demand specialized materials and extreme precision. We source chemical-resistant sensors, magnetic flow meters, and smart valve positioners to ensure batch consistency and plant safety.",
    "ind.power.title": "Power Generation",
    "ind.power.desc": "Thermal, nuclear, and renewable power plants rely on critical steam and water cycle monitoring. We provide high-temperature transmitters, vortex flow meters, and reliable actuators for continuous operation.",
    "ind.pharma.title": "Pharmaceuticals",
    "ind.pharma.desc": "Strict hygiene and FDA/regulatory requirements mandate sanitary instrumentation. We supply hygienic pressure and temperature sensors designed for CIP/SIP processes in clean-room environments.",
    "ind.water.title": "Water & Wastewater",
    "ind.water.desc": "Environmental monitoring and treatment facilities require robust flow and level measurement. We stock reliable magnetic flow meters and durable pressure transmitters for municipal and industrial water management.",
    "brands.b1": "Industry-standard pressure, temperature, flow, and level measurement instrumentation.",
    "brands.b2": "High-accuracy field instruments, process analyzers, and industrial automation solutions.",
    "brands.b3": "Smart pressure, temperature, and multivariable transmitters.",
    "brands.b4": "Process instrumentation, valve positioners, and comprehensive factory automation.",
    "brands.b5": "Control valves, regulators, and digital valve controllers.",
    "brands.b6": "Premium Coriolis mass flow and density measurement meters.",
    "brands.b7": "Smart valve positioners and advanced emergency shutdown (ESD) devices.",
    "brands.b8": "Analytical measurement, flow meters, and electrification products.",
    "brands.b9": "Control valves, regulators, and electropneumatic positioners.",
    "brands.b10": "High-performance pneumatic and smart valve positioners.",
    "brands.b11": "Severe service control valves and actuators.",
    "brands.b12": "Discrete valve control and position sensing technology.",
    "brands.b13": "Industrial testing, diagnostic tools, and field communicators."
  },
  id: {
    "contact.getInTouch": "Hubungi Kami",
    "contact.getInTouchDesc": "Baik Anda memerlukan pemancar pengganti tunggal atau instrumentasi untuk perombakan pabrik lengkap, tim penjualan teknik kami siap membantu.",
    "contact.email": "Email",
    "contact.phone": "WhatsApp / Telepon",
    "contact.hours": "Jam Kerja",
    "contact.hoursDesc": "Sen - Jum: 8:30 pagi – 6:00 sore (CST)",
    "contact.hq": "Kantor Pusat",
    "contact.enquiryReceived": "Pertanyaan Diterima!",
    "contact.enquiryDesc": "Terima kasih. Tim penjualan kami akan membalas Anda dalam waktu 30 menit selama jam kerja.",
    "contact.submitAnother": "Kirim Pertanyaan Lain",
    "contact.privacy": "Dengan mengirimkan formulir ini, Anda menyetujui kebijakan privasi kami. Kami tidak akan membagikan data Anda.",
    "about.title": "Tentang Flonexis",
    "about.subtitle": "EHUADE Automation — Mitra pengadaan tepercaya Anda untuk instrumentasi industri.",
    "about.whoWeAre": "Siapa Kami",
    "about.desc1": "Berbasis di Tiongkok, Flonexis adalah eksportir grosir B2B terkemuka yang berspesialisasi dalam instrumentasi industri dan peralatan otomasi bermutu tinggi.",
    "about.desc2": "Selama lebih dari satu dekade, kami telah berfungsi sebagai penghubung rantai pasokan penting bagi insinyur pengadaan, kontraktor EPC, dan pengguna akhir di sektor Minyak & Gas, Kimia, Tenaga Listrik, dan Farmasi di 50+ negara.",
    "about.desc3": "Misi kami sederhana: menyediakan peralatan bermerek utama asli dengan waktu tunggu lebih cepat dan harga kompetitif, didukung oleh dukungan teknis tanpa kompromi.",
    "about.commitment": "Komitmen Kami",
    "about.commit1": "100% Peralatan baru dari pabrik asli",
    "about.commit2": "Garansi pabrik standar 12 bulan untuk semua produk",
    "about.commit3": "Waktu respons penawaran 30 menit selama jam kerja",
    "about.commit4": "Kontrol kualitas yang ketat dan inspeksi pra-pengiriman",
    "about.commit5": "Dukungan logistik global dan bea cukai",
    "ind.oil.title": "Minyak & Gas",
    "ind.oil.desc": "Ekstraksi hulu, transportasi tengah, dan penyulingan hilir memerlukan instrumentasi bersertifikat area berbahaya yang tangguh. Kami menyediakan pemancar tekanan tahan ledakan, pengukur aliran Coriolis, dan katup kontrol layanan berat.",
    "ind.chem.title": "Pemrosesan Kimia",
    "ind.chem.desc": "Lingkungan korosif menuntut bahan khusus dan presisi ekstrem. Kami mencari sensor tahan kimia, pengukur aliran magnetik, dan pengatur posisi katup pintar untuk memastikan konsistensi batch dan keselamatan pabrik.",
    "ind.power.title": "Pembangkit Listrik",
    "ind.power.desc": "Pembangkit listrik tenaga termal, nuklir, dan terbarukan bergantung pada pemantauan siklus uap dan air yang kritis. Kami menyediakan pemancar suhu tinggi, pengukur aliran pusaran, dan aktuator yang andal untuk operasi berkelanjutan.",
    "ind.pharma.title": "Farmasi",
    "ind.pharma.desc": "Persyaratan kebersihan yang ketat dan FDA/peraturan mewajibkan instrumentasi sanitasi. Kami menyediakan sensor tekanan dan suhu higienis yang dirancang untuk proses CIP/SIP di lingkungan ruang bersih.",
    "ind.water.title": "Air & Air Limbah",
    "ind.water.desc": "Fasilitas pemantauan dan pengolahan lingkungan memerlukan pengukuran aliran dan tingkat yang kuat. Kami menyediakan pengukur aliran magnetik yang andal dan pemancar tekanan yang tahan lama untuk pengelolaan air kota dan industri.",
    "brands.b1": "Instrumentasi standar industri untuk pengukuran tekanan, suhu, aliran, dan tingkat.",
    "brands.b2": "Instrumen lapangan presisi tinggi, penganalisis proses, dan solusi otomasi industri.",
    "brands.b3": "Pemancar tekanan, suhu, dan multivariabel pintar.",
    "brands.b4": "Instrumentasi proses, pengatur posisi katup, dan otomatisasi pabrik yang komprehensif.",
    "brands.b5": "Katup kontrol, regulator, dan pengontrol katup digital.",
    "brands.b6": "Pengukur pengukuran aliran massa dan kepadatan Coriolis premium.",
    "brands.b7": "Pengatur posisi katup pintar dan perangkat penghentian darurat (ESD) lanjutan.",
    "brands.b8": "Pengukuran analitis, pengukur aliran, dan produk elektrifikasi.",
    "brands.b9": "Katup kontrol, regulator, dan pengatur posisi elektropneumatik.",
    "brands.b10": "Pengatur posisi pneumatik dan katup pintar berkinerja tinggi.",
    "brands.b11": "Katup kontrol layanan berat dan aktuator.",
    "brands.b12": "Teknologi kontrol katup diskrit dan sensor posisi.",
    "brands.b13": "Pengujian industri, alat diagnostik, dan komunikator lapangan."
  },
  vi: {
    "contact.getInTouch": "Giữ liên lạc",
    "contact.getInTouchDesc": "Cho dù bạn cần một bộ truyền đơn lẻ hay thiết bị cho một cuộc đại tu toàn bộ nhà máy, đội ngũ kỹ sư bán hàng của chúng tôi luôn sẵn sàng hỗ trợ.",
    "contact.email": "Email",
    "contact.phone": "WhatsApp / Điện thoại",
    "contact.hours": "Giờ làm việc",
    "contact.hoursDesc": "Thứ 2 - Thứ 6: 8:30 sáng – 6:00 chiều (CST)",
    "contact.hq": "Trụ sở chính",
    "contact.enquiryReceived": "Đã nhận được yêu cầu!",
    "contact.enquiryDesc": "Cảm ơn bạn. Đội ngũ bán hàng của chúng tôi sẽ liên hệ lại với bạn trong vòng 30 phút trong giờ làm việc.",
    "contact.submitAnother": "Gửi yêu cầu khác",
    "contact.privacy": "Bằng cách gửi biểu mẫu này, bạn đồng ý với chính sách bảo mật của chúng tôi. Chúng tôi sẽ không chia sẻ dữ liệu của bạn.",
    "about.title": "Về Flonexis",
    "about.subtitle": "EHUADE Automation — Đối tác mua sắm đáng tin cậy của bạn cho thiết bị công nghiệp.",
    "about.whoWeAre": "Chúng tôi là ai",
    "about.desc1": "Có trụ sở tại Trung Quốc, Flonexis là nhà xuất khẩu bán buôn B2B hàng đầu chuyên về thiết bị tự động hóa và đo lường công nghiệp cao cấp.",
    "about.desc2": "Trong hơn một thập kỷ, chúng tôi đã đóng vai trò là mắt xích chuỗi cung ứng quan trọng cho các kỹ sư mua sắm, nhà thầu EPC và người dùng cuối trong lĩnh vực Dầu khí, Hóa chất, Điện và Dược phẩm trên hơn 50 quốc gia.",
    "about.desc3": "Sứ mệnh của chúng tôi rất đơn giản: cung cấp thiết bị chính hãng của thương hiệu lớn với thời gian giao hàng nhanh hơn và giá cả cạnh tranh, được hỗ trợ bởi các dịch vụ kỹ thuật không khoan nhượng.",
    "about.commitment": "Cam kết của chúng tôi",
    "about.commit1": "100% Thiết bị mới từ nhà máy chính hãng",
    "about.commit2": "Bảo hành tiêu chuẩn 12 tháng từ nhà máy cho tất cả các sản phẩm",
    "about.commit3": "Thời gian phản hồi báo giá 30 phút trong giờ làm việc",
    "about.commit4": "Kiểm soát chất lượng nghiêm ngặt và kiểm tra trước khi giao hàng",
    "about.commit5": "Hỗ trợ hậu cần và thủ tục hải quan toàn cầu",
    "ind.oil.title": "Dầu khí",
    "ind.oil.desc": "Khai thác thượng nguồn, vận chuyển trung nguồn và tinh chế hạ nguồn đòi hỏi thiết bị đo lường được chứng nhận khu vực nguy hiểm, gồ ghề. Chúng tôi cung cấp cảm biến áp suất chống cháy nổ, lưu lượng kế Coriolis và van điều khiển trong điều kiện khắc nghiệt.",
    "ind.chem.title": "Xử lý hóa chất",
    "ind.chem.desc": "Môi trường ăn mòn đòi hỏi vật liệu chuyên dụng và độ chính xác cực cao. Chúng tôi cung cấp cảm biến chịu hóa chất, lưu lượng kế từ tính và bộ định vị van thông minh để đảm bảo tính nhất quán của mẻ và an toàn của nhà máy.",
    "ind.power.title": "Sản xuất điện",
    "ind.power.desc": "Các nhà máy nhiệt điện, điện hạt nhân và năng lượng tái tạo phụ thuộc vào việc giám sát chu trình nước và hơi nước quan trọng. Chúng tôi cung cấp bộ truyền nhiệt độ cao, lưu lượng kế xoáy và bộ dẫn động đáng tin cậy cho hoạt động liên tục.",
    "ind.pharma.title": "Dược phẩm",
    "ind.pharma.desc": "Các yêu cầu nghiêm ngặt về vệ sinh và quy định/FDA bắt buộc thiết bị vệ sinh. Chúng tôi cung cấp cảm biến áp suất và nhiệt độ vệ sinh được thiết kế cho quá trình CIP/SIP trong môi trường phòng sạch.",
    "ind.water.title": "Nước & Nước thải",
    "ind.water.desc": "Các cơ sở xử lý và giám sát môi trường đòi hỏi phải đo lường mức độ và lưu lượng mạnh mẽ. Chúng tôi cung cấp lưu lượng kế từ tính đáng tin cậy và cảm biến áp suất bền bỉ cho quản lý nước công nghiệp và đô thị.",
    "brands.b1": "Thiết bị đo mức độ, lưu lượng, nhiệt độ và áp suất tiêu chuẩn công nghiệp.",
    "brands.b2": "Thiết bị hiện trường độ chính xác cao, máy phân tích quy trình và các giải pháp tự động hóa công nghiệp.",
    "brands.b3": "Cảm biến áp suất, nhiệt độ và đa biến thông minh.",
    "brands.b4": "Thiết bị đo lường quy trình, bộ định vị van và tự động hóa nhà máy toàn diện.",
    "brands.b5": "Van điều khiển, bộ điều chỉnh và bộ điều khiển van kỹ thuật số.",
    "brands.b6": "Máy đo mật độ và lưu lượng khối lượng Coriolis cao cấp.",
    "brands.b7": "Bộ định vị van thông minh và các thiết bị ngắt khẩn cấp tiên tiến (ESD).",
    "brands.b8": "Thiết bị phân tích, lưu lượng kế và các sản phẩm điện khí hóa.",
    "brands.b9": "Van điều khiển, bộ điều chỉnh và bộ định vị điện khí nén.",
    "brands.b10": "Bộ định vị van thông minh và khí nén hiệu suất cao.",
    "brands.b11": "Van điều khiển dịch vụ khắc nghiệt và bộ dẫn động.",
    "brands.b12": "Công nghệ cảm biến vị trí và điều khiển van rời rạc.",
    "brands.b13": "Kiểm tra công nghiệp, công cụ chẩn đoán và máy giao tiếp hiện trường."
  },
  ar: {
    "contact.getInTouch": "ابق على تواصل",
    "contact.getInTouchDesc": "سواء كنت بحاجة إلى جهاز إرسال بديل واحد أو أجهزة لإصلاح كامل للمصنع، فإن فريق المبيعات الهندسية لدينا جاهز للمساعدة.",
    "contact.email": "البريد الإلكتروني",
    "contact.phone": "واتساب / هاتف",
    "contact.hours": "ساعات العمل",
    "contact.hoursDesc": "الاثنين - الجمعة: 8:30 صباحًا - 6:00 مساءً (CST)",
    "contact.hq": "المقر الرئيسي",
    "contact.enquiryReceived": "تم استلام الطلب!",
    "contact.enquiryDesc": "شكراً لك. سيرد فريق المبيعات لدينا عليك في غضون 30 دقيقة خلال ساعات العمل.",
    "contact.submitAnother": "إرسال طلب آخر",
    "contact.privacy": "بإرسالك هذا النموذج، فإنك توافق على سياسة الخصوصية الخاصة بنا. لن نشارك بياناتك.",
    "about.title": "حول Flonexis",
    "about.subtitle": "EHUADE Automation — شريك المشتريات الموثوق للأجهزة الصناعية.",
    "about.whoWeAre": "من نحن",
    "about.desc1": "تعتبر Flonexis ومقرها الصين شركة رائدة في تصدير الجملة B2B المتخصصة في الأجهزة الصناعية ومعدات الأتمتة عالية الجودة.",
    "about.desc2": "لأكثر من عقد من الزمان، عملنا كحلقة حيوية في سلسلة التوريد لمهندسي المشتريات، والمقاولين EPC، والمستخدمين النهائيين في قطاعات النفط والغاز، الكيماويات، الطاقة، والأدوية في أكثر من 50 دولة.",
    "about.desc3": "مهمتنا بسيطة: توفير معدات أصلية من الماركات الكبرى مع مهل تسليم أسرع وأسعار تنافسية، مدعومة بدعم فني لا هوادة فيه.",
    "about.commitment": "التزامنا",
    "about.commit1": "معدات أصلية وجديدة من المصنع 100%",
    "about.commit2": "ضمان مصنع قياسي لمدة 12 شهرًا على جميع المنتجات",
    "about.commit3": "وقت استجابة 30 دقيقة للرد على التسعير خلال ساعات العمل",
    "about.commit4": "مراقبة الجودة الصارمة والتفتيش قبل الشحن",
    "about.commit5": "الدعم اللوجستي العالمي والتخليص الجمركي",
    "ind.oil.title": "النفط والغاز",
    "ind.oil.desc": "يتطلب استخراج المنبع والنقل في المنتصف وتكرير المصب أجهزة معتمدة للمناطق الخطرة القوية. نقوم بتوريد أجهزة إرسال الضغط المقاومة للانفجار، وأجهزة قياس تدفق كوريوليس، وصمامات التحكم في الخدمات الشاقة.",
    "ind.chem.title": "المعالجة الكيميائية",
    "ind.chem.desc": "تتطلب البيئات المسببة للتآكل مواد متخصصة ودقة فائقة. نحن نصدر أجهزة استشعار مقاومة للمواد الكيميائية، ومقاييس تدفق مغناطيسية، ومحددات مواقع صمامات ذكية لضمان تناسق الدفعات وسلامة المصنع.",
    "ind.power.title": "توليد الطاقة",
    "ind.power.desc": "تعتمد محطات الطاقة الحرارية والنووية والمتجددة على المراقبة الحاسمة لدورة البخار والماء. نحن نوفر أجهزة إرسال درجات الحرارة العالية، ومقاييس تدفق الدوامة، ومشغلات موثوقة للتشغيل المستمر.",
    "ind.pharma.title": "الأدوية",
    "ind.pharma.desc": "تتطلب متطلبات النظافة الصارمة ومتطلبات FDA/التنظيمية أجهزة صحية. نحن نوفر مستشعرات الضغط ودرجة الحرارة الصحية المصممة لعمليات CIP/SIP في بيئات الغرف النظيفة.",
    "ind.water.title": "المياه ومياه الصرف الصحي",
    "ind.water.desc": "تتطلب مرافق المراقبة والمعالجة البيئية قياسًا قويًا للتدفق والمستوى. نقوم بتخزين عدادات التدفق المغناطيسية الموثوقة وأجهزة إرسال الضغط المتينة لإدارة المياه البلدية والصناعية.",
    "brands.b1": "أجهزة قياس الضغط ودرجة الحرارة والتدفق والمستوى القياسية للصناعة.",
    "brands.b2": "أدوات الحقل عالية الدقة، وأجهزة تحليل العمليات، وحلول الأتمتة الصناعية.",
    "brands.b3": "أجهزة إرسال ذكية للضغط ودرجة الحرارة ومتعددة المتغيرات.",
    "brands.b4": "أجهزة قياس العمليات، ومحددات مواقع الصمامات، وأتمتة المصانع الشاملة.",
    "brands.b5": "صمامات التحكم والمنظمات ومتحكمات الصمامات الرقمية.",
    "brands.b6": "مقاييس قياس تدفق الكتلة والكثافة كوريوليس الفاخرة.",
    "brands.b7": "محددات مواقع الصمامات الذكية وأجهزة الإغلاق في حالات الطوارئ (ESD) المتقدمة.",
    "brands.b8": "القياس التحليلي، ومقاييس التدفق، ومنتجات الكهرباء.",
    "brands.b9": "صمامات التحكم، والمنظمات، ومحددات المواقع الكهربائية الهوائية.",
    "brands.b10": "محددات مواقع هوائية وصمامات ذكية عالية الأداء.",
    "brands.b11": "صمامات تحكم ومشغلات للخدمات الشاقة.",
    "brands.b12": "التحكم في الصمامات المنفصلة وتكنولوجيا استشعار الموقع.",
    "brands.b13": "الاختبارات الصناعية، وأدوات التشخيص، وأجهزة الاتصال الميداني."
  }
};

// 1. Update i18n.ts
let i18nContent = fs.readFileSync(i18nPath, 'utf8');
for (const lang of Object.keys(NEW_KEYS)) {
  const langObj = NEW_KEYS[lang];
  for (const [k, v] of Object.entries(langObj)) {
    // Inject right before the closing brace of the language object
    // Find `${lang}: {`
    const regex = new RegExp(`(${lang}: \\{)([\\s\\S]*?)(\\n\\s*\\},|\\n\\s*\\}\\n*};)`);
    i18nContent = i18nContent.replace(regex, (match, p1, p2, p3) => {
      // Add the new key
      const newEntry = `\n    "${k}": ${JSON.stringify(v)},`;
      return p1 + p2 + newEntry + p3;
    });
  }
}
fs.writeFileSync(i18nPath, i18nContent);

// 2. Patch Contact.tsx
let contactContent = fs.readFileSync(path.join(pagesDir, 'Contact.tsx'), 'utf8');
contactContent = contactContent.replace(
  `h2 className="text-2xl font-bold mb-6 text-foreground">Get in Touch</h2>`,
  `h2 className="text-2xl font-bold mb-6 text-foreground">{t("contact.getInTouch")}</h2>`
);
contactContent = contactContent.replace(
  `p className="text-muted-foreground mb-8">Whether you need a single replacement transmitter or instrumentation for a complete plant overhaul, our engineering sales team is ready to assist.</p>`,
  `p className="text-muted-foreground mb-8">{t("contact.getInTouchDesc")}</p>`
);
contactContent = contactContent.replace(
  `h3 className="font-bold text-foreground">Email</h3>`,
  `h3 className="font-bold text-foreground">{t("contact.email")}</h3>`
);
contactContent = contactContent.replace(
  `h3 className="font-bold text-foreground">WhatsApp / Phone</h3>`,
  `h3 className="font-bold text-foreground">{t("contact.phone")}</h3>`
);
contactContent = contactContent.replace(
  `h3 className="font-bold text-foreground">Business Hours</h3>`,
  `h3 className="font-bold text-foreground">{t("contact.hours")}</h3>`
);
contactContent = contactContent.replace(
  `p className="text-muted-foreground">Mon - Fri: 8:30am – 6:00pm (CST)</p>`,
  `p className="text-muted-foreground">{t("contact.hoursDesc")}</p>`
);
contactContent = contactContent.replace(
  `h3 className="font-bold text-foreground">Headquarters</h3>`,
  `h3 className="font-bold text-foreground">{t("contact.hq")}</h3>`
);
contactContent = contactContent.replace(
  `h3 className="text-xl font-bold text-foreground mb-2">Enquiry Received!</h3>`,
  `h3 className="text-xl font-bold text-foreground mb-2">{t("contact.enquiryReceived")}</h3>`
);
contactContent = contactContent.replace(
  `Thank you. Our sales team will get back to you within 30 minutes during business hours.`,
  `{t("contact.enquiryDesc")}`
);
contactContent = contactContent.replace(
  `Submit Another Enquiry`,
  `{t("contact.submitAnother")}`
);
contactContent = contactContent.replace(
  `By submitting this form, you agree to our privacy policy. We will not share your data.`,
  `{t("contact.privacy")}`
);
fs.writeFileSync(path.join(pagesDir, 'Contact.tsx'), contactContent);

// 3. Patch About.tsx
let aboutContent = fs.readFileSync(path.join(pagesDir, 'About.tsx'), 'utf8');
// Add import useTranslation
aboutContent = aboutContent.replace(
  `import { CheckCircle2 } from "lucide-react";`,
  `import { CheckCircle2 } from "lucide-react";\nimport { useTranslation } from "@/lib/i18n";`
);
// Add hook
aboutContent = aboutContent.replace(
  `export default function About() {\n  return (`,
  `export default function About() {\n  const t = useTranslation();\n  return (`
);
aboutContent = aboutContent.replace(
  `h1 className="text-4xl md:text-5xl font-bold mb-4">About Flonexis</h1>`,
  `h1 className="text-4xl md:text-5xl font-bold mb-4">{t("about.title")}</h1>`
);
aboutContent = aboutContent.replace(
  `EHUADE Automation — Your trusted procurement partner for industrial instrumentation.`,
  `{t("about.subtitle")}`
);
aboutContent = aboutContent.replace(
  `h2 className="text-3xl font-bold mb-6 text-foreground">Who We Are</h2>`,
  `h2 className="text-3xl font-bold mb-6 text-foreground">{t("about.whoWeAre")}</h2>`
);
aboutContent = aboutContent.replace(
  `<p>\n                  Based in China, Flonexis is a leading B2B wholesale exporter specializing in high-grade industrial instrumentation and automation equipment.\n                </p>`,
  `<p>{t("about.desc1")}</p>`
);
aboutContent = aboutContent.replace(
  `<p>\n                  For over a decade, we have served as a critical supply chain link for procurement engineers, EPC contractors, and end-users in the Oil & Gas, Chemical, Power, and Pharmaceutical sectors across 50+ countries.\n                </p>`,
  `<p>{t("about.desc2")}</p>`
);
aboutContent = aboutContent.replace(
  `<p>\n                  Our mission is simple: provide authentic, major-brand equipment with faster lead times and competitive pricing, backed by uncompromising technical support.\n                </p>`,
  `<p>{t("about.desc3")}</p>`
);
aboutContent = aboutContent.replace(
  `h3 className="text-xl font-bold text-foreground mb-6">Our Commitment</h3>`,
  `h3 className="text-xl font-bold text-foreground mb-6">{t("about.commitment")}</h3>`
);
aboutContent = aboutContent.replace(
  `"100% Genuine factory-new equipment",\n                "12-Month standard factory warranty on all products",\n                "30-Minute quote response time during business hours",\n                "Strict quality control and pre-shipment inspection",\n                "Global logistics and customs clearance support"`,
  `t("about.commit1"),\n                t("about.commit2"),\n                t("about.commit3"),\n                t("about.commit4"),\n                t("about.commit5")`
);
fs.writeFileSync(path.join(pagesDir, 'About.tsx'), aboutContent);

// 4. Patch Industries.tsx
let indContent = fs.readFileSync(path.join(pagesDir, 'Industries.tsx'), 'utf8');
indContent = indContent.replace(
  `title: "Oil & Gas",`,
  `title: t("ind.oil.title", "Oil & Gas"),`
);
indContent = indContent.replace(
  `desc: "Upstream extraction, midstream transport, and downstream refining require rugged, hazardous-area certified instrumentation. We supply explosion-proof pressure transmitters, Coriolis flow meters, and severe-service control valves.",`,
  `desc: t("ind.oil.desc", "Upstream extraction, midstream transport, and downstream refining require rugged, hazardous-area certified instrumentation. We supply explosion-proof pressure transmitters, Coriolis flow meters, and severe-service control valves."),`
);
indContent = indContent.replace(
  `title: "Chemical Processing",`,
  `title: t("ind.chem.title", "Chemical Processing"),`
);
indContent = indContent.replace(
  `desc: "Corrosive environments demand specialized materials and extreme precision. We source chemical-resistant sensors, magnetic flow meters, and smart valve positioners to ensure batch consistency and plant safety."`,
  `desc: t("ind.chem.desc", "Corrosive environments demand specialized materials and extreme precision. We source chemical-resistant sensors, magnetic flow meters, and smart valve positioners to ensure batch consistency and plant safety.")`
);
indContent = indContent.replace(
  `title: "Power Generation",`,
  `title: t("ind.power.title", "Power Generation"),`
);
indContent = indContent.replace(
  `desc: "Thermal, nuclear, and renewable power plants rely on critical steam and water cycle monitoring. We provide high-temperature transmitters, vortex flow meters, and reliable actuators for continuous operation."`,
  `desc: t("ind.power.desc", "Thermal, nuclear, and renewable power plants rely on critical steam and water cycle monitoring. We provide high-temperature transmitters, vortex flow meters, and reliable actuators for continuous operation.")`
);
indContent = indContent.replace(
  `title: "Pharmaceuticals",`,
  `title: t("ind.pharma.title", "Pharmaceuticals"),`
);
indContent = indContent.replace(
  `desc: "Strict hygiene and FDA/regulatory requirements mandate sanitary instrumentation. We supply hygienic pressure and temperature sensors designed for CIP/SIP processes in clean-room environments."`,
  `desc: t("ind.pharma.desc", "Strict hygiene and FDA/regulatory requirements mandate sanitary instrumentation. We supply hygienic pressure and temperature sensors designed for CIP/SIP processes in clean-room environments.")`
);
indContent = indContent.replace(
  `title: "Water & Wastewater",`,
  `title: t("ind.water.title", "Water & Wastewater"),`
);
indContent = indContent.replace(
  `desc: "Environmental monitoring and treatment facilities require robust flow and level measurement. We stock reliable magnetic flow meters and durable pressure transmitters for municipal and industrial water management."`,
  `desc: t("ind.water.desc", "Environmental monitoring and treatment facilities require robust flow and level measurement. We stock reliable magnetic flow meters and durable pressure transmitters for municipal and industrial water management.")`
);
// To use t() outside component, we need to move the industries array inside the component.
indContent = indContent.replace(
  /const industries = \[[\s\S]*?\];/,
  ``
);
indContent = indContent.replace(
  `export default function Industries() {\n  const t = useTranslation();\n`,
  `export default function Industries() {\n  const t = useTranslation();\n\n  const industries = [\n    {\n      title: t("ind.oil.title"),\n      icon: <Flame className="w-10 h-10 mb-6 text-accent" />,\n      desc: t("ind.oil.desc"),\n      image: "/images/ind-oilgas.png"\n    },\n    {\n      title: t("ind.chem.title"),\n      icon: <Factory className="w-10 h-10 mb-6 text-accent" />,\n      desc: t("ind.chem.desc")\n    },\n    {\n      title: t("ind.power.title"),\n      icon: <Zap className="w-10 h-10 mb-6 text-accent" />,\n      desc: t("ind.power.desc")\n    },\n    {\n      title: t("ind.pharma.title"),\n      icon: <ShieldAlert className="w-10 h-10 mb-6 text-accent" />,\n      desc: t("ind.pharma.desc")\n    },\n    {\n      title: t("ind.water.title"),\n      icon: <Droplet className="w-10 h-10 mb-6 text-accent" />,\n      desc: t("ind.water.desc")\n    }\n  ];\n`
);
fs.writeFileSync(path.join(pagesDir, 'Industries.tsx'), indContent);

// 5. Patch Brands.tsx
let brandsContent = fs.readFileSync(path.join(pagesDir, 'Brands.tsx'), 'utf8');
brandsContent = brandsContent.replace(
  /const brands = \[[\s\S]*?\];/,
  ``
);
brandsContent = brandsContent.replace(
  `export default function Brands() {\n  const t = useTranslation();\n`,
  `export default function Brands() {\n  const t = useTranslation();\n\n  const brands = [\n    { name: "Rosemount / Emerson", desc: t("brands.b1") },\n    { name: "Yokogawa", desc: t("brands.b2") },\n    { name: "Honeywell", desc: t("brands.b3") },\n    { name: "Siemens", desc: t("brands.b4") },\n    { name: "Fisher / Emerson", desc: t("brands.b5") },\n    { name: "Micro Motion", desc: t("brands.b6") },\n    { name: "Azbil", desc: t("brands.b7") },\n    { name: "ABB", desc: t("brands.b8") },\n    { name: "SAMSON", desc: t("brands.b9") },\n    { name: "YTC", desc: t("brands.b10") },\n    { name: "KOSO", desc: t("brands.b11") },\n    { name: "Topworx", desc: t("brands.b12") },\n    { name: "Fluke", desc: t("brands.b13") },\n  ];\n`
);
fs.writeFileSync(path.join(pagesDir, 'Brands.tsx'), brandsContent);

console.log("Translation complete!");
