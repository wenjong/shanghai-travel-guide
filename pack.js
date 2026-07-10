const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 設定檔案與頁面配置
const pages = [
  { key: 'index', title: '首頁與基本資訊', src: 'README.md' },
  { key: '00', title: '行前檢查與避坑', src: '00-pre-travel-checklist.md' },
  { key: '01', title: '聯通門號與富邦開戶', src: '01-telecom-and-bank.md' },
  { key: '02', title: '景點導覽與低步行', src: '02-attraction-guide.md' },
  { key: '03', title: '6天5夜活動行程', src: '03-itinerary.md' }
];

const srcDir = __dirname;
const distDir = path.join(__dirname, 'docs');
const templatePath = path.join(__dirname, 'templates', 'layout.html');
const singleHtmlPath = path.join(distDir, 'shanghai-travel-guide-single.html');

// 確保輸出目錄存在
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. 讀取 HTML 模板
let template = fs.readFileSync(templatePath, 'utf8');

// 2. 改造模板的導航選單 (將常規連結 href 改為 javascript 點擊控制)
const oldNav = `<nav>
        <a href="index.html" class="{{nav-index}}">🏠 首頁與基本資訊</a>
        <a href="00-pre-travel-checklist.html" class="{{nav-00}}">📋 行前檢查與避坑</a>
        <a href="01-telecom-and-bank.html" class="{{nav-01}}">💳 聯通門號與富邦開戶</a>
        <a href="02-attraction-guide.html" class="{{nav-02}}">🧭 景點導覽與低步行</a>
        <a href="03-itinerary.html" class="{{nav-03}}">📅 6天5夜活動行程</a>
      </nav>`;

const newNav = `<nav>
        <a href="#" onclick="switchPage('index', event)" id="nav-index" class="active">🏠 首頁與基本資訊</a>
        <a href="#" onclick="switchPage('00', event)" id="nav-00">📋 行前檢查與避坑</a>
        <a href="#" onclick="switchPage('01', event)" id="nav-01">💳 聯通門號與富邦開戶</a>
        <a href="#" onclick="switchPage('02', event)" id="nav-02">🧭 景點導覽與低步行</a>
        <a href="#" onclick="switchPage('03', event)" id="nav-03">📅 6天5夜活動行程</a>
      </nav>`;

template = template.replace(oldNav, newNav);

// 3. 讀取所有 Markdown 內容，編譯並包裝在帶有 display 控制的 div 中
let pagesHtml = '';

pages.forEach(page => {
  const srcPath = path.join(srcDir, page.src);
  if (!fs.existsSync(srcPath)) {
    console.error(`找不到來源檔案: ${srcPath}`);
    return;
  }

  const markdownContent = fs.readFileSync(srcPath, 'utf8');
  let pageHtml = marked.parse(markdownContent);

  // Wix 畫冊與卡片風格 DOM 重塑與包裝演算法
  if (page.key === 'index') {
    let processedHero = pageHtml.replace(/<h2([^>]*)>/g, '<!-- HERO_SPLIT --><h2$1>');
    let heroParts = processedHero.split('<!-- HERO_SPLIT -->');
    let finalHero = `<section class="wix-section-card hero-section">${heroParts[0]}</section>`;
    for (let i = 1; i < heroParts.length; i++) {
      finalHero += `<section class="wix-section-card">${heroParts[i]}</section>`;
    }
    pageHtml = finalHero;
  } else if (page.key === '03') {
    let processedDay = pageHtml.replace(/<h3([^>]*)>/g, '<!-- DAY_SPLIT --><h3$1>');
    let dayParts = processedDay.split('<!-- DAY_SPLIT -->');
    let finalItinerary = dayParts[0];
    for (let i = 1; i < dayParts.length; i++) {
      finalItinerary += `<div class="timeline-day-card">${dayParts[i]}</div>`;
    }
    pageHtml = finalItinerary.replace('<div class="timeline-day-card">', '<div class="wix-timeline"><div class="timeline-day-card">');
    if (dayParts.length > 1) {
      pageHtml += '</div>';
    }
    pageHtml = pageHtml.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>([\s\S]*?)(?=(<h2|<div class="wix-timeline"|$))/g, '<section class="wix-section-card"><h2$1>$2</h2>$3</section>');
  } else {
    let processed = pageHtml.replace(/<h2([^>]*)>/g, '<!-- SECTION_SPLIT --><h2$1>');
    let parts = processed.split('<!-- SECTION_SPLIT -->');
    let wrappedHtml = parts[0];
    for (let i = 1; i < parts.length; i++) {
      wrappedHtml += `<section class="wix-section-card">${parts[i]}</section>`;
    }
    pageHtml = wrappedHtml;
  }

  // 將內部跳轉的 .md 或 .html 連結改寫為 JavaScript 點擊事件，以便在單一 HTML 下流暢切換
  // 匹配 file:/// 絕對路徑與相對路徑
  pageHtml = pageHtml.replace(/href="file:\/\/\/[^"]+\/([^\/]+)\.md(#([^"]+))?"/g, 'href="#" onclick="switchPage(\'$1\', event)"');
  pageHtml = pageHtml.replace(/href="([^\/"]+)\.md(#([^"]+))?"/g, 'href="#" onclick="switchPage(\'$1\', event)"');
  
  // 替換特殊檔名 README / index
  pageHtml = pageHtml.replace(/switchPage\('README', event\)/g, "switchPage('index', event)");
  pageHtml = pageHtml.replace(/switchPage\('00-pre-travel-checklist', event\)/g, "switchPage('00', event)");
  pageHtml = pageHtml.replace(/switchPage\('01-telecom-and-bank', event\)/g, "switchPage('01', event)");
  pageHtml = pageHtml.replace(/switchPage\('02-attraction-guide', event\)/g, "switchPage('02', event)");
  pageHtml = pageHtml.replace(/switchPage\('03-itinerary', event\)/g, "switchPage('03', event)");

  // 包裝在獨立的 div 中 (首頁預設顯示，其餘隱藏)
  const displayStyle = page.key === 'index' ? 'block' : 'none';
  pagesHtml += `
    <div id="content-${page.key}" class="page-section" style="display: ${displayStyle};">
      ${pageHtml}
    </div>
  `;
});

// 將合併後的內容替換進模板
let singleHtmlContent = template.replace('{{content}}', pagesHtml);

// 4. 清除模板中殘留的 nav 活躍標籤佔位符 (單網頁下改由 JS 動態控制)
pages.forEach(p => {
  singleHtmlContent = singleHtmlContent.replace(`{{nav-${p.key}}}`, '');
});

// 5. 圖片 Base64 內嵌處理 (核心步驟：免除 images 資料夾依附)
const srcImagesDir = path.join(srcDir, 'images');
if (fs.existsSync(srcImagesDir)) {
  const imageFiles = fs.readdirSync(srcImagesDir);
  imageFiles.forEach(file => {
    const filePath = path.join(srcImagesDir, file);
    const ext = path.extname(file).toLowerCase();
    
    // 限制處理常見圖片格式
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const base64Data = fs.readFileSync(filePath).toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      
      // 在 HTML 中尋找 src="images/filename.ext" 並全面替換為 Base64 Data URI
      const targetPattern = new RegExp(`src="images/${file}"`, 'g');
      singleHtmlContent = singleHtmlContent.replace(targetPattern, `src="${dataUri}"`);
      console.log(`成功內嵌 Base64 圖片: images/${file}`);
    }
  });
}

// 6. 在 body 底部注入 JS 控制程式碼以實現平滑的 Tab 切換
const jsControlCode = `
  <script>
    // 離線單頁面 Tab 切換控制函數
    function switchPage(pageKey, event) {
      if (event) {
        event.preventDefault();
      }
      
      // 1. 隱藏所有頁面區塊
      const sections = document.querySelectorAll('.page-section');
      sections.forEach(sec => {
        sec.style.display = 'none';
      });
      
      // 2. 顯示目標頁面區塊
      const targetSec = document.getElementById('content-' + pageKey);
      if (targetSec) {
        targetSec.style.display = 'block';
      }
      
      // 3. 清除側邊欄導航 active 狀態
      const navLinks = document.querySelectorAll('nav a');
      navLinks.forEach(link => {
        link.classList.remove('active');
      });
      
      // 4. 高亮當前點選之導航項目
      const targetNav = document.getElementById('nav-' + pageKey);
      if (targetNav) {
        targetNav.classList.add('active');
      }
      
      // 5. 手機版選單自動收合
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
      
      // 6. 滑動回到頁面頂部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  </script>
</body>
`;

singleHtmlContent = singleHtmlContent.replace('</body>', jsControlCode);

// 7. 寫入單一打包網頁檔案
fs.writeFileSync(singleHtmlPath, singleHtmlContent, 'utf8');
console.log(`\n🎉 打包完成！獨立單一網頁已成功輸出至: docs/shanghai-travel-guide-single.html`);
console.log(`檔案大小: ${(fs.statSync(singleHtmlPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log('您可以直接將此檔案以 Line 或微信發送給家人，完全免除資料夾依賴與離線限制！');
