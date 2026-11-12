'use strict';
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('striderDesktop', Object.freeze({ platform: process.platform, desktop: true }));
