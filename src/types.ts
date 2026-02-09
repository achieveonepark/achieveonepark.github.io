import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AppDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  type: 'system' | 'browser' | 'custom';
  url?: string; // For browser based apps
  component?: React.FC<any>; // For internal system apps
  color: string;
  pinned?: boolean; // Determines if the app appears in the dock by default
}

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  content?: any; // To pass specific file data (e.g., image URL, text content)
}

export interface FileObject {
  name: string;
  icon: React.ElementType;
  color: string;
  type: 'image' | 'text' | 'app' | 'folder' | 'pdf' | 'markdown';
  content?: string; // URL for images, text string for text files, appId for apps
}

export interface OSContextType {
  apps: AppDefinition[];
  windows: WindowState[];
  activeWindowId: string | null;
  launchApp: (app: AppDefinition) => void;
  openFile: (file: FileObject) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  installApp: (title: string, url: string, iconStr: string, color: string) => void;
}