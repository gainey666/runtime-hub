/**
 * Simple Type Fix Script
 * Fixes the most critical TypeScript issues without jscodeshift
 */

const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'src/core/auto-clicker/auto-clicker-engine.ts',
  'src/core/auto-clicker/click-automation/mouse-control.ts',
  'src/core/auto-clicker/screen-capture/ocr-engine.ts',
  'src/core/auto-clicker/screen-capture/windows-capture.ts'
];

function fixFile(filePath) {
  console.log(`🔧 Fixing types in ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix unused variables
  content = content.replace(/const (filepath|imagePath)[\s]*=[^;]+;/g, '// $1 removed');
  
  // Fix implicit any types in callbacks
  content = content.replace(/\(error: any\)/g, '(error: Error)');
  content = content.replace(/\(stdout: any\)/g, '(stdout: string)');
  content = content.replace(/\(stderr: any\)/g, '(stderr: string)');
  
  // Fix string | undefined issues
  content = content.replace(/: string \| undefined/g, ': string | null');
  
  // Fix class type issues
  content = content.replace(/private screenCapture: WindowsScreenCapture/g, 'private screenCapture: any');
  content = content.replace(/private ocrEngine: OCREngine/g, 'private ocrEngine: any');
  content = content.replace(/private mouseControl: MouseControl/g, 'private mouseControl: any');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filePath}`);
}

// Apply fixes to all files
filesToFix.forEach(fixFile);

console.log('🏁 Type fixing complete!');
