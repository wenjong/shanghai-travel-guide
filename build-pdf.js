const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('1. 開始編譯 PDF 的 HTML 原始檔 (build-pdf-html.js)...');
  execSync('node build-pdf-html.js', { stdio: 'inherit' });

  console.log('\n2. 正在透過 Microsoft Edge 將 HTML 列印為 PDF (headless)...');
  const x86Path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const x64Path = "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe";
  let edgePath = 'msedge';
  if (fs.existsSync(x86Path)) {
    edgePath = `"${x86Path}"`;
  } else if (fs.existsSync(x64Path)) {
    edgePath = `"${x64Path}"`;
  }
  
  const pdfPath = path.join(__dirname, 'shanghai-travel-guide.pdf');
  const htmlPath = path.join(__dirname, 'print-to-pdf.html');
  // 加入 --no-margins 與 --print-to-pdf-no-header 參數以去除頁首頁尾資訊，並輸出全寬頁面
  const printCmd = `${edgePath} --headless --disable-gpu --print-to-pdf="${pdfPath}" --no-margins --print-to-pdf-no-header "${htmlPath}"`;
  
  console.log(`執行命令: ${printCmd}`);
  execSync(printCmd, { stdio: 'inherit' });
  console.log('PDF 列印完成！');

  console.log('\n3. 開始解析 PDF 並注入書籤大綱 (add-bookmarks.js)...');
  execSync('node add-bookmarks.js', { stdio: 'inherit' });

  console.log('\n🎉 全套 PDF 大綱書籤手冊生成成功！');
} catch (error) {
  console.error('\n❌ 建置過程中發生錯誤:', error.message);
  process.exit(1);
}
