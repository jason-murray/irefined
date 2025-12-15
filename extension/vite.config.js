import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [
        vue(),
        {
            name: 'combine-css',
            closeBundle() {
                // Combine CSS files after build
                const distDir = path.resolve(__dirname, 'dist');

                const cssFiles = ['main.css', 'vue.css', 'websockets.css'];
                let combined = '';

                cssFiles.forEach(file => {
                    const filepath = path.join(distDir, file);
                    if (fs.existsSync(filepath)) {
                        combined += fs.readFileSync(filepath, 'utf-8') + '\n';
                    }
                });

                fs.writeFileSync(path.join(distDir, 'extension.css'), combined);
                console.log('✓ Combined CSS files into extension.css');
            }
        }
    ],
    build: {
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'src/main.js',      // Features entry point
                vue: 'src/vue/main.js'    // Vue app entry point
            },
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
                preserveModules: false
            }
        }
    }
})
