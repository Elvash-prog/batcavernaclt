import {copyFileSync,existsSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const pkg=JSON.parse(readFileSync(resolve('package.json'),'utf8')) as {version:string};

export default defineConfig({
  plugins:[
    react(),
    {
      name:'batcaverna-static-assets',
      closeBundle(){
        mkdirSync(resolve('dist'),{recursive:true});
        for(const name of ['brand.jpg','icon.png','login-cave.jpg']){
          const source=resolve('src',name);
          if(existsSync(source))copyFileSync(source,resolve('dist',name));
        }
      }
    }
  ],
  define:{__APP_VERSION__:JSON.stringify(pkg.version)},
  server:{strictPort:true},
  build:{target:'es2021',emptyOutDir:true,assetsInlineLimit:0},
  clearScreen:false
});
