// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  },
  fs: {
    writeFileSync: (p, data) => fs.writeFileSync(p, data),
    readFileSync: (p, encoding) => fs.readFileSync(p, encoding),
    existsSync: (p) => fs.existsSync(p)
  },
  path: {
    basename: (p) => path.basename(p),
    join: (...args) => path.join(...args)
  },
  // --- Get userData path via IPC ---
  getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),
  
  // --- ATOMIC CRYPTO FUNCTIONS ---
  crypto: {
    deriveKey: (text) => {
      return crypto.createHash('sha256').update(text).digest('base64').substr(0, 32);
    },
    randomBytes: (size) => crypto.randomBytes(size),
    encrypt: (key, iv, text) => {
      const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
      const ivBuf = Buffer.isBuffer(iv) ? iv : Buffer.from(iv);
      const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, ivBuf);
      let encrypted = cipher.update(text, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return encrypted;
    },
    decrypt: (key, ivHex, dataHex) => {
      const keyBuf = Buffer.from(key);
      const ivBuf = Buffer.from(ivHex, 'hex');
      const dataBuf = Buffer.from(dataHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
      let decrypted = decipher.update(dataBuf);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    }
  },
  Buffer: {
    from: (data, encoding) => Buffer.from(data, encoding)
  },
  exportPdf: (htmlContent, defaultFilename) => ipcRenderer.invoke('export-pdf', htmlContent, defaultFilename)
});