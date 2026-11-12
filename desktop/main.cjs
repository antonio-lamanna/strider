'use strict';
const {app,BrowserWindow,Menu,shell,dialog} = require('electron');
const path=require('node:path');
const fs=require('node:fs');
let mainWindow;
function appFile(){return app.isPackaged?path.join(process.resourcesPath,'web','index.html'):path.resolve(__dirname,'../dist/index.html');}
function createWindow(){
  mainWindow=new BrowserWindow({width:1500,height:930,minWidth:990,minHeight:650,backgroundColor:'#1f1f1f',title:'Strider Desktop',autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(url!==mainWindow.webContents.getURL()) event.preventDefault();});
  mainWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
  mainWindow.webContents.on('did-finish-load',async()=>{
    try{await mainWindow.webContents.insertCSS(fs.readFileSync(path.join(__dirname,'moria-desktop.css'),'utf8'));}catch(error){dialog.showErrorBox('Strider desktop theme',String(error));}
  });
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.loadFile(appFile()).catch(error=>dialog.showErrorBox('Strider startup',String(error)));
}
app.whenReady().then(()=>{
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'File',submenu:[{role:'quit'}]},{label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}]));
  createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
