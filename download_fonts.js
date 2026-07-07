import fs from 'fs';
import path from 'path';
import https from 'https';

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap';
const FONTS_DIR = './src/fonts';

// Create directories if they don't exist
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Fetch helper with User-Agent to get woff2
function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
      }
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Download file helper
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('Fetching Google Fonts CSS with modern browser user-agent...');
    // We use Chrome User-Agent so Google Fonts serves woff2
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    const cssContent = await fetchUrl(FONT_CSS_URL, headers);
    
    // Find all font URLs
    const urlRegex = /url\((https:\/\/[^)]+)\)/g;
    let match;
    const urls = [];
    while ((match = urlRegex.exec(cssContent)) !== null) {
      urls.push(match[1]);
    }
    
    console.log(`Found ${urls.length} font files to download.`);
    
    let localCss = cssContent;
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = `cairo-${i}.woff2`;
      const destPath = path.join(FONTS_DIR, filename);
      
      console.log(`Downloading ${url} to ${destPath}...`);
      await downloadFile(url, destPath);
      
      // Replace the remote URL with the relative local path in the CSS
      // Vite resolves paths relative to the CSS file
      localCss = localCss.replace(url, `./fonts/${filename}`);
    }
    
    // Save the local CSS
    fs.writeFileSync('./src/fonts.css', localCss);
    console.log('Local fonts downloaded and src/fonts.css created successfully!');
  } catch (err) {
    console.error('Error downloading fonts:', err);
  }
}

main();
