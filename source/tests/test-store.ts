import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function adapter(db:DatabaseSync):any{
 const prepare=(sql:string)=>{let args:any[]=[];return{bind(...a:any[]){args=a;return this},async first(){return db.prepare(sql).get(...args)??null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){const r=db.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}};
 return{prepare,async batch(statements:any[]){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
}
export function database(path=':memory:'){const db=new DatabaseSync(path);for(const file of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'));return{db,store:adapter(db)}}
