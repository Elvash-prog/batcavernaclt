import {copyFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

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
  server:{strictPort:true},
  build:{target:'es2021',emptyOutDir:true},
  clearScreen:false
});
