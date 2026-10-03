import { contextBridge, ipcRenderer } from 'electron';
import type { StudioApi } from '../shared/model';

const api: StudioApi = {
  state: () => ipcRenderer.invoke('studio:state'),
  login: () => ipcRenderer.invoke('studio:login'),
  logout: () => ipcRenderer.invoke('studio:logout'),
  refresh: () => ipcRenderer.invoke('studio:refresh'),
  saveDraft: draft => ipcRenderer.invoke('studio:save-draft', draft),
  discardDraft: () => ipcRenderer.invoke('studio:discard-draft'),
  publish: (draft, message) => ipcRenderer.invoke('studio:publish', draft, message),
  deployment: sha => ipcRenderer.invoke('studio:deployment', sha),
  chooseImage: () => ipcRenderer.invoke('studio:choose-image'),
  profileImage: () => ipcRenderer.invoke('studio:profile-image'),
  openSite: () => ipcRenderer.invoke('studio:open-site'),
  openDeployment: sha => ipcRenderer.invoke('studio:open-deployment', sha),
  onCloseRequested: callback => {
    const listener = () => callback();
    ipcRenderer.on('studio:prepare-close', listener);
    return () => ipcRenderer.removeListener('studio:prepare-close', listener);
  },
  close: () => ipcRenderer.invoke('studio:close'),
  documentSettings: locale => ipcRenderer.invoke('studio:document-settings', locale),
  saveDocumentSettings: options => ipcRenderer.invoke('studio:save-document-settings', options),
  exportDocument: (content, options) => ipcRenderer.invoke('studio:export-document', content, options),
  revealDocument: () => ipcRenderer.invoke('studio:reveal-document'),
};
contextBridge.exposeInMainWorld('studio', api);
