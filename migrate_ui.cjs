const fs = require('fs');
const path = require('path');

const STITCH_DIR = 'c:/Users/Arnel/Downloads/stitch_govassist_ai_mobile_ui/stitch_govassist_ai_mobile_ui';
const EBUDDY_PAGES_DIR = 'd:/eBuddy/src/pages';

const map = {
  'my_applications': 'Dashboard.tsx',
  'application_tracking': 'ActivityPage.tsx',
  'profile_screen': 'ProfilePage.tsx',
  'notifications': 'NotificationsPage.tsx',
  'identity_verification': 'IDRegistration.tsx',
  'document_upload': 'DocumentUpload.tsx',
  'national_id_biometrics': 'BiometricPage.tsx',
  'face_biometrics_scan': 'FaceLivenessPage.tsx',
  'review_consent': 'ReviewPage.tsx',
  'government_payment': 'PaymentPage.tsx',
  'submission_success': 'SuccessPage.tsx',
};

function htmlToJsx(html) {
    let jsx = html.replace(/class=/g, 'className=');
    jsx = jsx.replace(/for=/g, 'htmlFor=');
    
    const voidTags = ['img', 'input', 'br', 'hr', 'meta', 'link'];
    voidTags.forEach(tag => {
        // Match <tag ... > but not <tag ... />
        const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
        jsx = jsx.replace(regex, `<${tag}$1 />`);
    });
    
    jsx = jsx.replace(/style="([^"]*)"/g, (match, p1) => {
        const styleObj = {};
        p1.split(';').forEach(rule => {
            if (!rule.trim()) return;
            const parts = rule.split(':');
            const key = parts[0];
            const value = parts.slice(1).join(':'); // value could have colons
            if (key && value) {
                const camelKey = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                styleObj[camelKey] = value.trim().replace(/"/g, "'");
            }
        });
        let objStr = '{';
        for (const [k, v] of Object.entries(styleObj)) {
            objStr += `${k}: "${v}",`;
        }
        objStr += '}';
        return `style={${objStr}}`;
    });
    
    jsx = jsx.replace(/checked=""/g, 'defaultChecked');
    jsx = jsx.replace(/disabled=""/g, 'disabled');
    jsx = jsx.replace(/required=""/g, 'required');
    
    jsx = jsx.replace(/stroke-width/g, 'strokeWidth');
    jsx = jsx.replace(/stroke-linecap/g, 'strokeLinecap');
    jsx = jsx.replace(/stroke-linejoin/g, 'strokeLinejoin');
    jsx = jsx.replace(/fill-rule/g, 'fillRule');
    jsx = jsx.replace(/clip-rule/g, 'clipRule');
    jsx = jsx.replace(/clip-path/g, 'clipPath');
    jsx = jsx.replace(/viewbox/g, 'viewBox');
    jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

    return jsx;
}

for (const [stitchFolder, reactFile] of Object.entries(map)) {
    const stitchPath = path.join(STITCH_DIR, stitchFolder, 'code.html');
    if (!fs.existsSync(stitchPath)) {
        console.log(`Skipping ${stitchFolder}, not found.`);
        continue;
    }
    
    const htmlContent = fs.readFileSync(stitchPath, 'utf8');
    
    const mainMatch = htmlContent.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    let innerContent = '';
    
    if (mainMatch) {
        innerContent = mainMatch[0];
    } else {
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/);
        if (bodyMatch) innerContent = bodyMatch[1];
    }
    
    innerContent = innerContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    innerContent = innerContent.replace(/<header[^>]*>([\s\S]*?)<\/header>/i, '');
    
    // Also remove Bottom Navbar if it exists
    innerContent = innerContent.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/i, '');

    const jsxContent = htmlToJsx(innerContent);
    
    const reactFilePath = path.join(EBUDDY_PAGES_DIR, reactFile);
    let imports = ['import { useNavigate } from "react-router-dom"'];
    let reactCode = '';
    if (fs.existsSync(reactFilePath)) {
        reactCode = fs.readFileSync(reactFilePath, 'utf8');
        const fileImports = reactCode.match(/^import.*$/gm) || [];
        imports = [...new Set([...imports, ...fileImports])];
    }
    
    const compName = reactFile.replace('.tsx', '');
    
    const newCode = `${imports.join('\n')}

const ${compName} = () => {
  const navigate = useNavigate();
  return (
    <>
      ${jsxContent}
    </>
  )
}

export default ${compName};
`;
    
    fs.writeFileSync(reactFilePath, newCode);
    console.log(`Updated ${reactFile}`);
}
