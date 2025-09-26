// quasar.config.ts
import { configure } from 'quasar/wrappers'
import checker from 'vite-plugin-checker'

export default configure(() => ({
  // Global styles
  css: ['app.scss'],
  // Fonts/icons (optional)
  extras: ['roboto-font', 'material-icons'],
  
  build: {
    // Base path + output dir
    publicPath: '/quiz/',
    distDir: 'dist/spa',
    // Router mode & base
    vueRouterMode: 'history',
    vueRouterBase: '/quiz/',
    // TypeScript config
    typescript: {
      strict: true,
      vueShim: true
    },
    // Targets
    target: {
      browser: ['es2022', 'chrome115', 'firefox115', 'safari14'],
      node: 'node20'
    },
    // Optional envs readable in app code
    env: {
      APP_VERSION: process.env.npm_package_version,
      BUILD_DATE: new Date().toISOString()
    },
    // ✅ vitePlugins should be HERE, inside 'build'
    vitePlugins: [
      [
        checker,
        {
          vueTsc: true,
          eslint: {
            lintCommand:
              'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
            useFlatConfig: true
          }
        }
      ]
    ]
  },
  
  devServer: {
    open: false
  },
  // Add boot files as you create them
  boot: [],
  
  framework: {
    config: {
      brand: {
        primary:   '#5B2BE0', // Royal Purple
        secondary: '#2563EB', // Electric Blue
        accent:    '#F4B504', // Royal Gold
        positive:  '#10B981',
        negative:  '#E11D48',
        info:      '#06B6D4',
        warning:   '#F59E0B'
      }
    },
    plugins: []
  }
}))