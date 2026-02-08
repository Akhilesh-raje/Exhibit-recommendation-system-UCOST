import type { Plugin } from 'vite';

/**
 * Vite plugin to ensure React vendor bundle loads before other vendor bundles
 * This fixes the issue where vendor-misc loads before vendor-react, causing
 * "Cannot read properties of undefined (reading 'createContext')" errors
 */
export function reactFirst(): Plugin {
  return {
    name: 'react-first',
    generateBundle(options, bundle) {
      // This runs during build, but we need to modify HTML after it's generated
      // So we'll use transformIndexHtml instead
    },
    transformIndexHtml(html) {
      // Extract all script and modulepreload tags
      const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
      const modulepreloadRegex = /<link[^>]*rel=["']modulepreload["'][^>]*>/gi;
      
      const scripts: string[] = [];
      const modulepreloads: string[] = [];
      
      // Collect all scripts
      let match;
      while ((match = scriptRegex.exec(html)) !== null) {
        scripts.push(match[0]);
      }
      
      // Collect all modulepreloads
      while ((match = modulepreloadRegex.exec(html)) !== null) {
        modulepreloads.push(match[0]);
      }
      
      // CRITICAL: Order chunks correctly to prevent initialization errors
      // Order: vendor-react -> vendor-radix -> vendor-ui -> others
      const reactScripts: string[] = [];
      const reactPreloads: string[] = [];
      const radixScripts: string[] = [];
      const radixPreloads: string[] = [];
      const uiScripts: string[] = [];
      const uiPreloads: string[] = [];
      const remainingScripts: string[] = [];
      const remainingPreloads: string[] = [];
      
      [...scripts, ...modulepreloads].forEach(tag => {
        if (tag.includes('vendor-react')) {
          if (tag.includes('<script')) reactScripts.push(tag);
          else reactPreloads.push(tag);
        } else if (tag.includes('vendor-radix')) {
          // Radix UI loads after React
          if (tag.includes('<script')) radixScripts.push(tag);
          else radixPreloads.push(tag);
        } else if (tag.includes('vendor-ui')) {
          // UI libraries load after Radix
          if (tag.includes('<script')) uiScripts.push(tag);
          else uiPreloads.push(tag);
        } else {
          if (tag.includes('<script')) remainingScripts.push(tag);
          else remainingPreloads.push(tag);
        }
      });
      
      // Remove all script and modulepreload tags
      html = html.replace(scriptRegex, '');
      html = html.replace(modulepreloadRegex, '');
      
      // Reorder: React -> Radix -> UI -> Others
      const reorderedTags = [
        ...reactPreloads,
        ...radixPreloads,
        ...uiPreloads,
        ...remainingPreloads,
        ...reactScripts,
        ...radixScripts,
        ...uiScripts,
        ...remainingScripts
      ].join('\n    ');
      
      // Insert before closing head tag
      if (html.includes('</head>')) {
        html = html.replace('</head>', `    ${reorderedTags}\n</head>`);
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', `<head>\n    ${reorderedTags}\n</head>\n<body>`);
      }
      
      return html;
    }
  };
}

