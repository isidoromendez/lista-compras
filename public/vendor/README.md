# Lector de códigos de barras de respaldo

Se usa solo si Chrome no trae `BarcodeDetector` nativo.

- `barcode-detector.js`: [barcode-detector](https://github.com/Sec-ant/barcode-detector) 3.2.3 (MIT) empaquetado con esbuild, configurado para cargar el wasm desde `/vendor/`.
- `zxing_reader.wasm`: [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) 3.1.6 (MIT, basado en ZXing-C++ Apache-2.0).

Para regenerarlo:

```js
// entry.js
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
prepareZXingModule({ overrides: { locateFile: (p, prefix) => (p.endsWith('.wasm') ? '/vendor/' + p : prefix + p) } });
export { BarcodeDetector };
```

```bash
npm i barcode-detector@3.2.3 esbuild
npx esbuild entry.js --bundle --format=esm --minify --outfile=barcode-detector.js
cp node_modules/zxing-wasm/dist/reader/zxing_reader.wasm .
```
