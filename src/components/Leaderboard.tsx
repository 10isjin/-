import { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import { Trophy, User as UserIcon, ChevronDown, ChevronUp, Search, Hash, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeaderboardProps {
  runners: UserProfile[];
}

const RankChange = ({ current, previous }: { current: number, previous?: number | null }) => {
  if (previous === undefined || previous === null) return null;
  const diff = previous - current;
  if (diff === 0) return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-400">
      <Minus size={10} strokeWidth={3} />
    </div>
  );
  if (diff > 0) return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 rounded text-[10px] font-black text-emerald-600">
      <ArrowUp size={10} strokeWidth={3} />
      {diff}
    </div>
  );
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 rounded text-[10px] font-black text-rose-600">
      <ArrowDown size={10} strokeWidth={3} />
      {Math.abs(diff)}
    </div>
  );
};

export default function Leaderboard({ runners }: LeaderboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRunners = useMemo(() => {
    if (!searchTerm.trim()) return runners;
    const lowerSearch = searchTerm.toLowerCase().trim();
    return runners.filter(r => 
      r.displayName.toLowerCase().includes(lowerSearch) || 
      (r.studentId && r.studentId.includes(lowerSearch)) ||
      (r.classId && r.classId.includes(lowerSearch))
    );
  }, [runners, searchTerm]);

  const displayRunners = (isExpanded || searchTerm.trim()) ? filteredRunners : filteredRunners.slice(0, 5);

  return (
    <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
        <h3 className="text-lg font-black italic-header flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" />
          개인별 순위
        </h3>
        {runners.length > 5 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-white/5"
          >
            {isExpanded ? (
              <>접기 <ChevronUp size={12} /></>
            ) : (
              <>전체보기 <ChevronDown size={12} /></>
            )}
          </button>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 border-b border-emerald-50">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="이름, 학번, 또는 학급으로 검색" 
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="divide-y divide-slate-50 flex-1">
        <AnimatePresence initial={false}>
          {displayRunners.map((runner) => {
            const overallRank = runners.indexOf(runner) + 1;
            const isTop3 = overallRank <= 3;
            
            return (
              <motion.div 
                key={runner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-4 p-4 transition-all group overflow-hidden ${
                  overallRank === 1 ? 'bg-yellow-50/50 hover:bg-yellow-50' : 
                  overallRank === 2 ? 'bg-slate-50/50 hover:bg-slate-50' : 
                  overallRank === 3 ? 'bg-orange-50/30 hover:bg-orange-50/50' : 
                  'hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors ${
                    overallRank === 1 ? 'bg-yellow-400 text-white' :
                    overallRank === 2 ? 'bg-slate-300 text-white' :
                    overallRank === 3 ? 'bg-orange-400 text-white' :
                    'text-slate-300 group-hover:text-emerald-600'
                  }`}>
                    {overallRank}
                  </div>
                  {runner.totalDistance > 0 && <RankChange current={overallRank} previous={runner.previousRank} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={`font-bold leading-tight ${overallRank === 1 ? 'text-yellow-700' : 'text-slate-900'}`}>
                      {runner.displayName}
                    </span>
                    <div className="flex items-center gap-1">
                      {runner.studentId ? (
                        <span className="text-[10px] font-black text-blue-400 shrink-0">
                          ({runner.studentId})
                        </span>
                      ) : runner.classId ? (
                        <span className="text-[10px] font-black text-emerald-400 shrink-0">
                          ({runner.classId.replace('-', '학년 ')}반)
                        </span>
                      ) : null}
                      {isTop3 && <Trophy size={12} className={
                        overallRank === 1 ? 'text-yellow-500' : 
                        overallRank === 2 ? 'text-slate-400' : 
                        'text-orange-500'
                      } />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                      runner.role === 'student' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      runner.role === 'teacher' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      runner.role === 'parent' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                      'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}>
                      {runner.role === 'student' ? '학생' : runner.role === 'teacher' ? '교사' : runner.role === 'parent' ? '학부모' : '주민'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                      {runner.runCount || 0}회 참여
                    </span>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className={`font-black number-font tracking-tighter transition-colors ${
                    overallRank === 1 ? 'text-yellow-600' : 'text-slate-900 group-hover:text-emerald-600'
                  }`}>
                    <span className="text-xl">{Math.floor(runner.totalDistance)}</span>
                    <span className="text-xs">.{(runner.totalDistance % 1).toFixed(2).split('.')[1]}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 ml-1">KM</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {runners.length === 0 && (
          <div className="p-16 text-center text-slate-300 italic text-sm">
            데이터를 불러오고 있습니다...
          </div>
        )}
      </div>
    </div>
  );
}
