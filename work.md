# Work Guide: Advanced Integration

This document outlines how to extend the CyberOS Simulator with advanced file handling (PDF) and interactive applications (Phaser Games).

---

## 1. Displaying PDF Files as "Beautiful Markdown"

Since browsers cannot natively convert PDF layout to Markdown perfectly, the best approach for a "Holographic UI" is to extract the text content and render it cleanly, or use a PDF canvas renderer with a custom dark theme layer.

### Approach A: Text Extraction (Recommended for "Data Stream" look)
This method extracts raw text from the PDF and displays it in the `TextEdit` component or a new `Reader` component, giving it a "hacked data" feel consistent with the OS.

**Dependencies:**
```bash
npm install pdfjs-dist react-markdown
```

**Implementation Steps:**

1.  **Create a PDF Parser Utility:**
    Use `pdfjs-dist` to read the binary data and extract text strings from each page.

    ```typescript
    // utils/pdfParser.ts
    import * as pdfjsLib from 'pdfjs-dist';

    export const extractTextFromPDF = async (url: string): Promise<string> => {
      const pdf = await pdfjsLib.getDocument(url).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `## PAGE ${i}\n\n${pageText}\n\n---\n\n`;
      }
      
      return fullText;
    };
    ```

2.  **Create a Markdown Reader Component:**
    Instead of the raw `TextEdit`, create a `ReaderApp` that uses `react-markdown`.

    ```typescript
    import ReactMarkdown from 'react-markdown';

    export const ReaderApp: React.FC<{ content: string }> = ({ content }) => (
      <div className="prose prose-invert prose-cyan max-w-none p-6 font-mono">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
    ```

3.  **Integrate into OS:**
    Update `App.tsx`'s `openFile` to detect `.pdf` extensions, call the parser, and open the `ReaderApp` window with the result.

---

## 2. Integrating Phaser Games as Apps

Phaser games render into a `<canvas>` element. Integrating them into CyberOS is straightforward: wrap the game initialization in a React component and manage the instance lifecycle.

**Dependencies:**
```bash
npm install phaser
```

**Implementation Steps:**

1.  **Create the Game Wrapper Component:**

    ```typescript
    // components/apps/GameWrapper.tsx
    import React, { useEffect, useRef } from 'react';
    import Phaser from 'phaser';

    interface GameProps {
      config: Phaser.Types.Core.GameConfig;
    }

    export const GameWrapper: React.FC<GameProps> = ({ config }) => {
      const gameRef = useRef<HTMLDivElement>(null);
      const gameInstance = useRef<Phaser.Game | null>(null);

      useEffect(() => {
        if (!gameRef.current) return;

        // Force parent size to match window
        const finalConfig = {
          ...config,
          parent: gameRef.current,
          width: '100%',
          height: '100%',
          scale: {
             mode: Phaser.Scale.RESIZE, // crucial for window resizing
             autoCenter: Phaser.Scale.CENTER_BOTH
          }
        };

        gameInstance.current = new Phaser.Game(finalConfig);

        return () => {
          gameInstance.current?.destroy(true);
          gameInstance.current = null;
        };
      }, []);

      return <div ref={gameRef} className="w-full h-full overflow-hidden" />;
    };
    ```

2.  **Define a Simple Phaser Scene (Example):**

    ```typescript
    // games/SpaceShooter.ts
    import Phaser from 'phaser';

    export class SpaceScene extends Phaser.Scene {
        create() {
            this.add.text(100, 100, 'CYBER-SPACE LOADING...', { fill: '#0ff' });
            // ... game logic ...
        }
    }
    ```

3.  **Register App in `constants.tsx`:**

    ```typescript
    {
        id: 'game-space',
        title: 'HYPER_SPACE',
        icon: Gamepad, // from lucide-react
        type: 'custom',
        component: GameWrapper, // You need to update AppDefinition to accept this
        color: 'bg-red-500'
    }
    ```

4.  **Render in `App.tsx`:**
    Update the `renderAppContent` function to handle this new app type.

    ```typescript
    if (app.id === 'game-space') {
       const config = { type: Phaser.AUTO, scene: SpaceScene, transparent: true };
       return <GameWrapper config={config} />;
    }
    ```
