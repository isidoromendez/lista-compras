// Verificación: qué tan actualizados están los datos abiertos oficiales del SEPA.
const PKG = 'https://datos.produccion.gob.ar/api/3/action/package_show?id=sepa-precios';
const r = await fetch(PKG);
console.log('package_show →', r.status);
const j = await r.json();
const p = j.result;
console.log('Dataset:', p.title, '| organización:', p.organization?.title, '| mantenedor:', p.maintainer);
console.log('Licencia:', p.license_title, '| frecuencia:', p.accrualPeriodicity ?? p.frequency ?? '(no informada)');
console.log('Creado:', p.metadata_created, '| modificado:', p.metadata_modified);
console.log('\nRecursos (más recientes primero):');
const recursos = [...p.resources].sort((a, b) => String(b.last_modified ?? b.created).localeCompare(String(a.last_modified ?? a.created)));
for (const x of recursos.slice(0, 12)) {
  console.log(`- ${x.name} | modificado ${x.last_modified ?? '?'} | creado ${x.created ?? '?'} | ${x.format} | ${x.url}`);
}
console.log('\nEncabezados de los zip (fecha real del archivo):');
for (const x of recursos.filter((x) => /\.zip$/i.test(x.url)).slice(0, 7)) {
  try {
    const h = await fetch(x.url, { method: 'HEAD' });
    console.log(`- ${x.name}: HTTP ${h.status} | Last-Modified ${h.headers.get('last-modified')} | ${(Number(h.headers.get('content-length')) / 1e6).toFixed(0)} MB`);
  } catch (e) { console.log(`- ${x.name}: error ${e}`); }
}
// Mirar adentro del zip más reciente: nombres de archivos y una muestra de precios con fechas.
const z = recursos.find((x) => /\.zip$/i.test(x.url));
if (z) {
  const { execSync } = await import('node:child_process');
  execSync(`curl -sSL -o /tmp/sepa.zip "${z.url}"`, { stdio: 'inherit' });
  console.log('\nContenido del zip', z.name, ':');
  console.log(execSync('unzip -l /tmp/sepa.zip | head -15').toString());
  execSync('mkdir -p /tmp/sepa && cd /tmp/sepa && unzip -q -o /tmp/sepa.zip');
  const inner = execSync("find /tmp/sepa -name '*.zip' | head -3").toString().trim().split('\n').filter(Boolean);
  console.log('zips internos (uno por comercio):', inner.length ? inner.join(' , ') : 'ninguno');
  if (inner[0]) execSync(`cd /tmp/sepa && unzip -q -o "${inner[0]}" -d /tmp/sepa/c1`);
  console.log(execSync("find /tmp/sepa -name '*.csv' | head -8").toString());
  const csv = execSync("find /tmp/sepa -name 'productos.csv' | head -1").toString().trim();
  if (csv) {
    console.log('Primeras líneas de', csv);
    console.log(execSync(`head -4 "${csv}"; echo ...; tail -3 "${csv}"`).toString());
  }
  const comercio = execSync("find /tmp/sepa -name 'comercio.csv' | head -1").toString().trim();
  if (comercio) console.log('comercio.csv:\n' + execSync(`head -3 "${comercio}"; tail -2 "${comercio}"`).toString());
}
