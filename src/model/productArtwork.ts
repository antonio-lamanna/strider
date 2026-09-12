export function validProductArtwork(uri: string): boolean {
 if(uri.length>150000 || !uri.startsWith('data:image/svg+xml;charset=utf-8,')) return false;
 try {
  const svg=new DOMParser().parseFromString(decodeURIComponent(uri.slice(uri.indexOf(',')+1)),'image/svg+xml');
  if(svg.documentElement.localName!=='svg'||svg.querySelector('parsererror'))return false;
  return Array.from(svg.querySelectorAll('*')).every(el=>['svg','path','title'].includes(el.localName)&&Array.from(el.attributes).every(a=>['xmlns','viewBox','fill','d','role','width','height'].includes(a.name)));
 } catch {return false;}
}
