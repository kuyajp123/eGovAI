const fs = require('fs');
const path = require('path');

const EBUDDY_PAGES_DIR = 'd:/eBuddy/src/pages';
const files = fs.readdirSync(EBUDDY_PAGES_DIR);

files.forEach(file => {
    if (!file.endsWith('.tsx')) return;
    const filePath = path.join(EBUDDY_PAGES_DIR, file);
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Fix onClick="something" to onClick={() => something}
    code = code.replace(/onClick="([^"]+)"/g, (match, script) => {
        return `onClick={() => { ${script} }}`;
    });
    
    fs.writeFileSync(filePath, code);
});
console.log('Cleanup 2 complete');
