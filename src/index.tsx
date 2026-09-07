import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoot from './AppRoot';
import { LanguageProvider } from './i18n/LanguageContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider><AppRoot /></LanguageProvider>
  </React.StrictMode>
);
