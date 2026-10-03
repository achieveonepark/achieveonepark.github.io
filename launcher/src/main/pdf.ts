import { BrowserWindow } from 'electron';
import { documentHtml, documentOptionsSchema, type DocumentOptions } from '../shared/document';
import { contentSchema, type Content } from '../shared/model';

export async function renderPdf(rawContent: Content, rawOptions: DocumentOptions, imageData?: string): Promise<Buffer> {
  const content = contentSchema.parse(rawContent);
  const options = documentOptionsSchema.parse(rawOptions);
  const window = new BrowserWindow({ show: false, width: 900, height: 1100, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, javascript: false, webSecurity: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(documentHtml(content, options, imageData))}`);
    return await window.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: 'A4', displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;color:#82909a;width:100%;text-align:center;font-family:Arial"><span class="pageNumber"></span> / <span class="totalPages"></span></div>', generateDocumentOutline: true });
  } finally { window.destroy(); }
}
