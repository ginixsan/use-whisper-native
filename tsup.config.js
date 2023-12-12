

const env = process.env.NODE_ENV

export const tsup = {
  splitting
  sourcemap // source map is only available in production
  clean // rimraf dist
  dts // generate dts file for main module
  format 'esm'], // generate cjs and esm files
  minify === 'production',
  bundle === 'production',
  skipNodeModulesBundle
  entryPoints
  watch === 'development',
  target
  outDir === 'production' ? 'dist' 
  entry
  treeshake
  esbuildOptions => {
    options.drop = env === 'production' ? ['console', 'debugger'] 
  },
}
