import { build } from 'esbuild';

// const isWatch = process.argv.includes('--watch');

build({
  entryPoints: {
    content: "src/core/controller/content.ts",
    sw: "src/core/controller/sw.ts",
    popup: "src/core/controller/popup.ts",
    dashboard: "src/core/controller/dashboard.ts"
  },
  bundle: true,
  outdir: 'dist/extension',
  platform: 'browser',   // 🔥 IMPORTANTE
  format: 'iife',        // 🔥 remove import/export
  target: 'chrome100',   // 🔥 ambiente real
  sourcemap: true,
  minify: false,
  splitting: false,  // true só para browser + esm
  format: 'cjs', // 'esm' se quiser módulos ES
  tsconfig: 'tsconfig.json',
  logLevel: 'info'
})
//   watch: isWatch && {
//     onRebuild(error) {
//       if (error) console.error('Erro ao recompilar:', error);
//       else console.log('Rebuild concluído');
//     },
//   },
// }).catch(() => process.exit(1));