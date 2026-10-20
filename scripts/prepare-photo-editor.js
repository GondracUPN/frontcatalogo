const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '../public/photo-editor-vendor');
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(require.resolve('@techstark/opencv-js'), path.join(target, 'opencv.js'));
fs.copyFileSync(path.join(path.dirname(require.resolve('@techstark/opencv-js')), '../LICENSE'), path.join(target, 'LICENSE'));
