import {createRequire} from 'node:module';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {buildSync}=createRequire(require.resolve('drizzle-kit'))('esbuild');
const output=mkdtempSync(join(tmpdir(),'pocket-pal-tests-'));
try{
 const files=['pet.test','expansion.test'];
 for(const name of files)buildSync({entryPoints:[`tests/${name}.ts`],bundle:true,platform:'node',format:'esm',outfile:join(output,`${name}.mjs`)});
 const result=spawnSync(process.execPath,['--test',...files.map(name=>join(output,`${name}.mjs`))],{stdio:'inherit'});
 process.exitCode=result.status??1;
}finally{rmSync(output,{recursive:true,force:true})}
