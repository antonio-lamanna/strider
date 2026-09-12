import * as library from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';
import { flatProductIcons } from './flatProductIcons';
export interface CatalogIcon {name:string;slug:string;uri:string;hex:string}
export const simpleIconCatalog: CatalogIcon[] = [
  ...Object.values(library).filter((v): v is SimpleIcon=>!!v&&typeof v==='object'&&'path' in v&&'slug' in v).map(v=>({name:v.title,slug:v.slug,hex:v.hex,uri:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${v.hex}"><path d="${v.path}"/></svg>`)})),
  ...Object.entries(flatProductIcons).map(([slug,v])=>({slug:'archived-'+slug,name:slug.replaceAll('-',' '),hex:v.hex,uri:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(v.svg)})),
].sort((a,b)=>a.name.localeCompare(b.name));
