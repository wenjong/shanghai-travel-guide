const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { outlinePdfCjs } = require('@lillallol/outline-pdf-cjs');

const pdfPath = path.join(__dirname, 'shanghai-travel-guide.pdf');
const outputPath = path.join(__dirname, 'shanghai-travel-guide-marked.pdf');

// 定義一級與二級大綱標題、層級與定位標記
const outlineDef = [
  { text: '上海自由行手冊：行前準備與基礎資訊', marker: '[PDF-MARKER-INDEX]', depth: '', type: 'parent' },
  { text: '上海自由行：行前檢查與安全避坑指南', marker: '[PDF-MARKER-00]', depth: '', type: 'parent' },
  { text: '手機門號辦理與銀行開戶實戰手冊 (2025-2026 最新版)', marker: '[PDF-MARKER-01]', depth: '', type: 'parent' },
  { text: '上海熱門景點深度導覽與低步行逛法', marker: '[PDF-MARKER-02]', depth: '', type: 'parent' },
  { text: '1. 經典人文與江景：豫園 ＋ 外灘', marker: '[PDF-MARKER-ATTR1]', depth: '-', type: 'child' },
  { text: '2. 法租界落葉梧桐散策：武康路 ＋ 安福路', marker: '[PDF-MARKER-ATTR2]', depth: '-', type: 'child' },
  { text: '3. 江南水鄉以船代步：朱家角古鎮', marker: '[PDF-MARKER-ATTR3]', depth: '-', type: 'child' },
  { text: '4. 科技與運動交匯：世博展覽館 ＋ 中華藝術宮 ＋ 洛克公園 ＋ 蘿蔔快跑', marker: '[PDF-MARKER-ATTR4]', depth: '-', type: 'child' },
  { text: '5. 二次元與 3C 二重奏：徐家匯美羅城', marker: '[PDF-MARKER-ATTR5]', depth: '-', type: 'child' },
  { text: '6. 運動潮流與科技地標：Nike 上海 001', marker: '[PDF-MARKER-ATTR6]', depth: '-', type: 'child' },
  { text: '上海 6 天 5 夜詳細行程時間表', marker: '[PDF-MARKER-03]', depth: '', type: 'parent' },
  { text: 'Day 1：7/19 (星期日)', marker: '[PDF-MARKER-DAY1]', depth: '-', type: 'child' },
  { text: 'Day 2：7/20 (星期一)', marker: '[PDF-MARKER-DAY2]', depth: '-', type: 'child' },
  { text: 'Day 3：7/21 (星期二)', marker: '[PDF-MARKER-DAY3]', depth: '-', type: 'child' },
  { text: 'Day 4：7/22 (星期三)', marker: '[PDF-MARKER-DAY4]', depth: '-', type: 'child' },
  { text: 'Day 5：7/23 (星期四)', marker: '[PDF-MARKER-DAY5]', depth: '-', type: 'child' },
  { text: 'Day 6：7/24 (星期五)', marker: '[PDF-MARKER-DAY6]', depth: '-', type: 'child' }
];

if (!fs.existsSync(pdfPath)) {
  console.error(`找不到目標 PDF: ${pdfPath}`);
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);
const pageTexts = [];

console.log('正在解析 PDF 檔案文字內容以定位標題頁碼...');

const pdfParser = new PDFParse({ data: dataBuffer });
pdfParser.getText().then(async function(result) {
  console.log(`PDF 解析完成，共計 ${result.pages.length} 頁。`);
  
  // 將每一頁的文字放入 pageTexts
  result.pages.forEach(p => {
    pageTexts[p.num - 1] = p.text;
  });
  
  const outlineLines = [];
  
  // 遍歷我們定義的大綱項目，並透過隱藏標記定位頁碼
  outlineDef.forEach(item => {
    let foundPage = -1;
    
    for (let i = 0; i < pageTexts.length; i++) {
      const cleanPageText = pageTexts[i] || '';
      if (cleanPageText.includes(item.marker)) {
        foundPage = i + 1; // 轉為 1-based 頁碼
        break; // 找到第一處即停止，避免重複
      }
    }
    
    if (foundPage !== -1) {
      console.log(`定位成功 [${item.text}] -> 第 ${foundPage} 頁`);
      // 組合格式: PageNumber | Depth | Title
      // Depth 為空代表一級，為 "-" 代表二級
      outlineLines.push(`${foundPage}|${item.depth}|${item.text}`);
    } else {
      console.warn(`⚠️ 無法定位標題: "${item.text}" (標記: ${item.marker})，將忽略此大綱項目`);
    }
  });

  if (outlineLines.length === 0) {
    console.error('沒有找到任何大綱項目，放棄書籤注入。');
    return;
  }

  const outlineString = outlineLines.join('\n');
  console.log('\n即將注入的大綱結構:');
  console.log(outlineString);

  try {
    // 注入大綱至 PDF
    await outlinePdfCjs({
      loadPath: pdfPath,
      savePath: outputPath,
      outline: outlineString
    });

    console.log(`\n🎉 書籤大綱注入成功！產出檔案: ${outputPath}`);
    
    // 覆蓋原始 PDF，以保持單一檔案輸出
    fs.copyFileSync(outputPath, pdfPath);
    fs.unlinkSync(outputPath);
    console.log(`已成功覆蓋原始 PDF 檔案: ${pdfPath}`);
  } catch (err) {
    console.error('注入書籤大綱時發生錯誤:', err);
  }
}).catch(err => {
  console.error('解析 PDF 時發生錯誤:', err);
});
