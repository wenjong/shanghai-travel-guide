const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 設定檔案對應關係與頁面標題
const pages = [
  { src: 'README.md', dist: 'index.html', title: '首頁與基本資訊', key: 'index' },
  { src: '00-pre-travel-checklist.md', dist: '00-pre-travel-checklist.html', title: '行前檢查與避坑', key: '00' },
  { src: '01-telecom-and-bank.md', dist: '01-telecom-and-bank.html', title: '聯通門號與富邦開戶', key: '01' },
  { src: '02-attraction-guide.md', dist: '02-attraction-guide.html', title: '景點導覽與低步行', key: '02' },
  { src: '03-itinerary.md', dist: '03-itinerary.html', title: '6天5夜活動行程', key: '03' }
];

const srcDir = __dirname;
const distDir = path.join(__dirname, 'docs');
const templatePath = path.join(__dirname, 'templates', 'layout.html');

// 確保輸出目錄與圖片子目錄存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 建立 images 佔位資料夾以防止離線瀏覽時找不到目錄
const imagesDistDir = path.join(distDir, 'images');
if (!fs.existsSync(imagesDistDir)) {
  fs.mkdirSync(imagesDistDir, { recursive: true });
}

// 讀取 HTML 模板
const template = fs.readFileSync(templatePath, 'utf8');

// 配置 marked 解析選項 (可自訂 class 或安全設定)
marked.setOptions({
  gfm: true,
  breaks: true
});

// 開始編譯各頁面
pages.forEach(page => {
  const srcPath = path.join(srcDir, page.src);
  if (!fs.existsSync(srcPath)) {
    console.error(`找不到來源檔案: ${srcPath}`);
    return;
  }

  // 讀取 Markdown 內容
  let markdownContent = fs.readFileSync(srcPath, 'utf8');

  // 將 Markdown 轉成 HTML
  let mainContentHtml = marked.parse(markdownContent);

  // 核心轉換邏輯：將 Markdown 格式的本機 file:/// 連結與相對 .md 連結，自動改寫為 HTML 連結
  // 例如：[README.md](file:///C:/Users/.../README.md) 或是 [README.md](README.md)
  // 將所有 href 屬性中的 .md 結尾與帶有 file:/// 的 .md 全部更換為本機離線 .html 連結
  mainContentHtml = mainContentHtml.replace(/href="file:\/\/\/[^"]+\/([^\/]+)\.md(#([^"]+))?"/g, 'href="$1.html$2"');
  mainContentHtml = mainContentHtml.replace(/href="([^\/"]+)\.md(#([^"]+))?"/g, 'href="$1.html$2"');
  
  // 特別處理首頁 index.html
  mainContentHtml = mainContentHtml.replace(/href="README\.html(#([^"]+))?"/g, 'href="index.html$1"');

  // 套用模板
  let finalHtml = template
    .replace('{{title}}', page.title)
    .replace('{{content}}', mainContentHtml);

  // 動態標記側邊導覽列的活躍狀態 (Active Menu)
  pages.forEach(p => {
    const placeholder = `{{nav-${p.key}}}`;
    if (p.key === page.key) {
      finalHtml = finalHtml.replace(placeholder, 'active');
    } else {
      finalHtml = finalHtml.replace(placeholder, '');
    }
  });

  // 輸出 HTML 檔案
  const distPath = path.join(distDir, page.dist);
  fs.writeFileSync(distPath, finalHtml, 'utf8');
  console.log(`成功編譯: ${page.src} -> docs/${page.dist}`);
});

// 複製 Mockup 設計圖片至 dist 目錄以利完整展現網頁視覺
const mockupSrc = path.join(srcDir, 'shanghai_guide_mockup.png');
const mockupDist = path.join(distDir, 'shanghai_guide_mockup.png');

if (fs.existsSync(mockupSrc)) {
  fs.copyFileSync(mockupSrc, mockupDist);
  console.log('已複製設計概念圖 shanghai_guide_mockup.png 至 docs 目錄');
} else {
  console.warn('找不到設計概念圖，請確認檔案是否存在於根目錄。');
}

// 自動複製 images/ 目錄下的所有實體圖片至 dist/images/
const srcImagesDir = path.join(srcDir, 'images');
if (fs.existsSync(srcImagesDir)) {
  const imageFiles = fs.readdirSync(srcImagesDir);
  imageFiles.forEach(file => {
    const fileSrc = path.join(srcImagesDir, file);
    const fileDist = path.join(imagesDistDir, file);
    fs.copyFileSync(fileSrc, fileDist);
    console.log(`已複製圖片: images/${file} -> dist/images/${file}`);
  });
}

console.log('\n離線網頁建置完成！請至 docs/ 目錄中雙擊 index.html 進行預覽。');
