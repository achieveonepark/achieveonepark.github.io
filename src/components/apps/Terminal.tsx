import React, { useState, useEffect, useRef } from 'react';

interface Command {
  cmd: string;
  desc: string;
  action: (args: string[]) => string;
}

export const Terminal: React.FC = () => {
  const [history, setHistory] = useState<string[]>(['Welcome to AchieveOne OS Terminal', 'Type /help for available commands.']);
  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); // For keyboard navigation
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // User-controllable commands definition
  const commands: Command[] = [
    { cmd: '/help', desc: 'Show available commands', action: () => 'Available commands:\n' + commands.map(c => `${c.cmd} - ${c.desc}`).join('\n') },
    { cmd: '/clear', desc: 'Clear terminal history', action: () => { setHistory([]); return ''; } },
    { cmd: '/date', desc: 'Show current date and time', action: () => new Date().toString() },
    { cmd: '/whoami', desc: 'Show current user', action: () => 'guest_user' },
    { cmd: '/echo', desc: 'Repeat text', action: (args) => args.join(' ') },
    { cmd: '/ls', desc: 'List directory', action: () => 'Desktop  Documents  Downloads  Music  Pictures' },
  ];

  // Derive filtered commands based on input
  const filteredCommands = commands.filter(c => c.cmd.startsWith(input));

  const executeCommand = (cmdString: string) => {
      const trimmed = cmdString.trim();
      if (!trimmed) return;

      const newHistory = [...history, `$ ${trimmed}`];
      
      // Process command
      if (trimmed.startsWith('/')) {
        const parts = trimmed.split(' ');
        const cmdName = parts[0];
        const args = parts.slice(1);
        
        const command = commands.find(c => c.cmd === cmdName);
        if (command) {
          const output = command.action(args);
          if (output) newHistory.push(output);
        } else {
          newHistory.push(`Command not found: ${cmdName}`);
        }
      } else {
        newHistory.push(`zsh: command not found: ${trimmed}`);
      }

      setHistory(newHistory);
      setInput('');
      setShowHelp(false);
      setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showHelp && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            return;
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            // Select the command from help menu
            e.preventDefault();
            selectCommand(filteredCommands[selectedIndex].cmd);
            return;
        }
    }

    if (e.key === 'Enter') {
      executeCommand(input);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setShowHelp(val.startsWith('/'));
    setSelectedIndex(0); // Reset selection on typing
  };

  const selectCommand = (cmd: string) => {
    setInput(cmd + ' ');
    inputRef.current?.focus();
    setShowHelp(false);
  };

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input on click anywhere
  const handleClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className="w-full h-full bg-[#1e1e1e] text-[#33ff00] font-mono p-4 text-sm overflow-hidden flex flex-col"
      onClick={handleClick}
    >
      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-snug">{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 relative">
        <div className="flex items-center">
          <span className="mr-2 text-blue-400">$</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[#33ff00] placeholder-gray-600"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
          />
        </div>

        {/* IntelliSense Popup */}
        {showHelp && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-10">
            <div className="px-3 py-1 bg-gray-700 text-xs text-gray-300 font-bold border-b border-gray-600">
              Suggested Commands (Use ↑↓ to navigate)
            </div>
            {filteredCommands.length > 0 ? (
                filteredCommands.map((c, idx) => (
                <div 
                    key={c.cmd}
                    className={`px-3 py-2 cursor-pointer flex justify-between items-center group ${idx === selectedIndex ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    onClick={(e) => { e.stopPropagation(); selectCommand(c.cmd); }}
                >
                    <span className={`font-bold ${idx === selectedIndex ? 'text-white' : 'text-gray-200 group-hover:text-blue-300'}`}>{c.cmd}</span>
                    <span className={`text-xs ${idx === selectedIndex ? 'text-blue-100' : 'text-gray-400'}`}>{c.desc}</span>
                </div>
                ))
            ) : (
                <div className="px-3 py-2 text-gray-500 italic text-xs">No matching commands</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};