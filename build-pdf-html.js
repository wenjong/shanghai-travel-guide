const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 設定手冊檔案順序 (README 作為 index 放在最前面)
const pages = [
  { key: 'index', src: 'README.md' },
  { key: '00', src: '00-pre-travel-checklist.md' },
  { key: '01', src: '01-telecom-and-bank.md' },
  { key: '02', src: '02-attraction-guide.md' },
  { key: '03', src: '03-itinerary.md' }
];

const srcDir = __dirname;
const templatePath = path.join(__dirname, 'templates', 'pdf-layout.html');
const tempHtmlPath = path.join(__dirname, 'print-to-pdf.html');

// 1. 讀取 HTML 模板
const template = fs.readFileSync(templatePath, 'utf8');

// 配置 marked 解析選項
marked.setOptions({
  gfm: true,
  breaks: true
});

// 2. 合併 Markdown 內容並轉為 HTML
let mergedHtml = '';

const markerStyle = 'font-size:1px;color:#ffffff;';

pages.forEach(page => {
  const srcPath = path.join(srcDir, page.src);
  if (!fs.existsSync(srcPath)) {
    console.error(`找不到來源檔案: ${srcPath}`);
    return;
  }

  const markdownContent = fs.readFileSync(srcPath, 'utf8');
  let pageHtml = marked.parse(markdownContent);

  // 插入 PDF 書籤定位標記 (純 ASCII, 100% 避開漢字編碼與康熙部首問題)
  if (page.key === 'index') {
    pageHtml = pageHtml.replace(/(<h1[^>]*>.*?<\/h1>)/, `$1<span style="${markerStyle}">[PDF-MARKER-INDEX]</span>`);
  } else if (page.key === '00') {
    pageHtml = pageHtml.replace(/(<h1[^>]*>.*?<\/h1>)/, `$1<span style="${markerStyle}">[PDF-MARKER-00]</span>`);
  } else if (page.key === '01') {
    pageHtml = pageHtml.replace(/(<h1[^>]*>.*?<\/h1>)/, `$1<span style="${markerStyle}">[PDF-MARKER-01]</span>`);
  } else if (page.key === '02') {
    pageHtml = pageHtml.replace(/(<h1[^>]*>.*?<\/h1>)/, `$1<span style="${markerStyle}">[PDF-MARKER-02]</span>`);
    pageHtml = pageHtml.replace(/(<h2[^>]*>1\.\s*經典人文.*?<\/h2>)/, `$1<span style="${markerStyle}">[PDF-MARKER-ATTR1]</span>`);
    pageHtml = pageHtml.replace(/(<h2[^>]*>2\.\s*法租界落葉梧桐.*?<\/h2>)/, `$1<span style="${markerStyle}">[PDF-MARKER-ATTR2]</span>`);
    pageHtml = pageHtml.replace(/(<h2[^>]*>3\.\s*江南水鄉.*?<\/h2>)/, `$1<span style="${markerStyle}">[PDF-MARKER-ATTR3]</span>`);
    pageHtml = pageHtml.replace(/(<h2[^>]*>4\.\s*科技與運動.*?<\/h2>)/, `$1<span style="${markerStyle}">[PDF-MARKER-ATTR4]</span>`);
    pageHtml = pageHtml.replace(/(<h2[^>]*>5\.\s*二次元與.*?<\/h2>)/, `$1<span style="${markerStyle}">[PDF-MARKER-ATTR5]</span>`);
    pageHtml = pageHtml.replace(/(<h2[^>]*>6\.\s*運動潮流.*?<\/h2>)/, `$1<span style="${markerStyle}">[PDF-MARKER-ATTR6]</span>`);
  } else if (page.key === '03') {
    pageHtml = pageHtml.replace(/(<h1[^>]*>.*?<\/h1>)/, `$1<span style="${markerStyle}">[PDF-MARKER-03]</span>`);
    pageHtml = pageHtml.replace(/(<h3[^>]*>Day 1.*?<\/h3>)/, `$1<span style="${markerStyle}">[PDF-MARKER-DAY1]</span>`);
    pageHtml = pageHtml.replace(/(<h3[^>]*>Day 2.*?<\/h3>)/, `$1<span style="${markerStyle}">[PDF-MARKER-DAY2]</span>`);
    pageHtml = pageHtml.replace(/(<h3[^>]*>Day 3.*?<\/h3>)/, `$1<span style="${markerStyle}">[PDF-MARKER-DAY3]</span>`);
    pageHtml = pageHtml.replace(/(<h3[^>]*>Day 4.*?<\/h3>)/, `$1<span style="${markerStyle}">[PDF-MARKER-DAY4]</span>`);
    pageHtml = pageHtml.replace(/(<h3[^>]*>Day 5.*?<\/h3>)/, `$1<span style="${markerStyle}">[PDF-MARKER-DAY5]</span>`);
    pageHtml = pageHtml.replace(/(<h3[^>]*>Day 6.*?<\/h3>)/, `$1<span style="${markerStyle}">[PDF-MARKER-DAY6]</span>`);
  }

  // 將內部跳轉的相對路徑改寫為 PDF 內置錨點，實現點選目錄時能在 PDF 內自動跳轉
  pageHtml = pageHtml.replace(/href="file:\/\/\/[^"]+\/([^\/]+)\.md(#([^"]+))?"/g, 'href="#content-$1"');
  pageHtml = pageHtml.replace(/href="([^\/"]+)\.md(#([^"]+))?"/g, 'href="#content-$1"');
  
  // 替換特殊檔名 README / index
  pageHtml = pageHtml.replace(/content-README/g, "content-index");
  pageHtml = pageHtml.replace(/content-00-pre-travel-checklist/g, "content-00");
  pageHtml = pageHtml.replace(/content-01-telecom-and-bank/g, "content-01");
  pageHtml = pageHtml.replace(/content-02-attraction-guide/g, "content-02");
  pageHtml = pageHtml.replace(/content-03-itinerary/g, "content-03");

  // 包裝在獨立的 div 中，並設定 id 供錨點跳轉
  mergedHtml += `
    <div id="content-${page.key}" class="page-section">
      ${pageHtml}
    </div>
  `;
});

// 3. 套用模板
let finalHtml = template.replace('{{content}}', mergedHtml);

// 4. 圖片 Base64 內嵌處理 (防範 Edge PDF 打印時找不到本機資源的報錯)
const srcImagesDir = path.join(srcDir, 'images');
if (fs.existsSync(srcImagesDir)) {
  const imageFiles = fs.readdirSync(srcImagesDir);
  imageFiles.forEach(file => {
    const filePath = path.join(srcImagesDir, file);
    const ext = path.extname(file).toLowerCase();
    
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const base64Data = fs.readFileSync(filePath).toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      
      // 替換 src
      const targetPattern = new RegExp(`src="images/${file}"`, 'g');
      finalHtml = finalHtml.replace(targetPattern, `src="${dataUri}"`);
      console.log(`已成功將圖片 ${file} 編碼為 Base64 內建`);
    }
  });
}

// 5. 輸出暫存 HTML 檔案
fs.writeFileSync(tempHtmlPath, finalHtml, 'utf8');
console.log(`\n暫存 HTML 檔案已成功生成: print-to-pdf.html`);
