import React, { useEffect, useState } from 'react';
import { RoomOption } from '../types';
import { generateRoomOptions } from '../services/geminiService';
import { Skull, Gift, Coins, Loader2 } from 'lucide-react';

interface RoomSelectorProps {
  depth: number;
  onSelect: (option: RoomOption) => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({ depth, onSelect }) => {
  const [options, setOptions] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchOptions = async () => {
      setLoading(true);
      const rooms = await generateRoomOptions(depth);
      if (mounted) {
        setOptions(rooms);
        setLoading(false);
      }
    };
    fetchOptions();
    return () => { mounted = false; };
  }, [depth]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="font-display tracking-widest text-sm">운명을 엮는 중...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      <h2 className="text-3xl font-display font-bold text-slate-200 mb-12 tracking-wider">
        운명의 갈림길
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {options.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelect(room)}
            className="group relative h-48 bg-slate-900 border border-slate-700 hover:border-red-500/50 hover:bg-slate-800 transition-all duration-300 rounded-lg overflow-hidden text-left p-6 flex flex-col justify-between"
          >
            {/* Background Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
                {room.rewardType === 'Boon' && <Gift size={120} />}
                {room.rewardType === 'Health' && <Gift size={120} />}
                {room.rewardType === 'Wealth' && <Coins size={120} />}
                {!['Boon','Health','Wealth'].includes(room.rewardType) && <Skull size={120} />}
            </div>

            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className={`
                        px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
                        ${room.difficulty === 'Hard' ? 'bg-red-900/50 text-red-400' : 'bg-slate-800 text-slate-400'}
                    `}>
                        {room.difficulty}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-widest">{room.type}</span>
                </div>
                <h3 className="text-xl font-serif text-slate-200 group-hover:text-red-100 transition-colors break-keep">
                    {room.description}
                </h3>
            </div>

            <div className="flex items-center gap-2 text-amber-500 font-display font-bold uppercase tracking-wide text-sm">
                {room.rewardType === 'Boon' && <Gift className="w-4 h-4" />}
                {room.rewardType === 'Health' && <span className="text-red-500">♥</span>}
                {room.rewardType === 'Wealth' && <Coins className="w-4 h-4" />}
                <span>보상: {room.rewardType}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};