const fs = require('fs');
const path = require('path');

const EBUDDY_PAGES_DIR = 'd:/eBuddy/src/pages';
const files = fs.readdirSync(EBUDDY_PAGES_DIR);

files.forEach(file => {
    if (!file.endsWith('.tsx')) return;
    const filePath = path.join(EBUDDY_PAGES_DIR, file);
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Fix onclick
    code = code.replace(/onclick=/g, 'onClick=');
    
    // Remove duplicate useNavigate imports
    const importRegex = /import\s+\{\s*useNavigate\s*\}\s+from\s+["']react-router-dom["']/g;
    let matchCount = 0;
    code = code.replace(importRegex, (match) => {
        matchCount++;
        return matchCount === 1 ? match : '';
    });

    // Also remove empty import blocks like "import { }" or just generic duplicated router imports
    code = code.replace(/import\s+\{\s*\}\s+from\s+['"]react-router-dom['"];?/g, '');
    
    // Some lines might have duplicate useAuth or others if they had different quotes.
    // We can just ignore unused vars for now, as tsc just warns about them unless noUnusedLocals is true.
    // Let's just write the fixed code.
    fs.writeFileSync(filePath, code);
});
console.log('Cleanup complete');
