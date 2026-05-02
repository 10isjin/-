import { useState } from 'react';
import { ClassProfile, UserProfile } from '../types';
import { Users, Hash, ChevronDown, ChevronUp, X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClassLeaderboardProps {
  classes: ClassProfile[];
  getClassMembers: (classId: string) => Promise<UserProfile[]>;
}

export default function ClassLeaderboard({ classes, getClassMembers }: ClassLeaderboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassProfile | null>(null);
  const [classMembers, setClassMembers] = useState<UserProfile[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const displayClasses = isExpanded ? classes : classes.slice(0, 5);

  const handleClassClick = async (cls: ClassProfile) => {
    setSelectedClass(cls);
    setIsLoadingMembers(true);
    const members = await getClassMembers(cls.id);
    setClassMembers(members);
    setIsLoadingMembers(false);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
        <h3 className="text-lg font-black italic-header flex items-center gap-2">
          <Hash size={18} className="text-emerald-400" />
          학급별 순위
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">학급 순위</span>
      </div>
      
      <div className="divide-y divide-slate-50 flex-1">
        <AnimatePresence initial={false}>
          {displayClasses.map((cls, index) => (
            <motion.div 
              key={cls.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => handleClassClick(cls)}
              className={`flex items-center gap-4 p-5 transition-all group overflow-hidden cursor-pointer ${
                index === 0 ? 'bg-yellow-50/50 hover:bg-yellow-50' : 
                index === 1 ? 'bg-slate-50/50 hover:bg-slate-50' : 
                index === 2 ? 'bg-orange-50/30 hover:bg-orange-50/50' : 
                'hover:bg-emerald-50/30'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors shrink-0 ${
                index === 0 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' :
                index === 1 ? 'bg-slate-300 text-white shadow-lg shadow-slate-200' :
                index === 2 ? 'bg-orange-400 text-white shadow-lg shadow-orange-200' :
                'bg-slate-50 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white'
              }`}>
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-black text-lg italic-header truncate ${
                    index === 0 ? 'text-yellow-700' : 'text-slate-900'
                  }`}>
                    {cls.grade}학년 {cls.classNumber}반
                  </span>
                  {index < 3 && <Trophy size={14} className={
                    index === 0 ? 'text-yellow-500' : 
                    index === 1 ? 'text-slate-400' : 
                    'text-orange-500'
                  } />}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                   <div className="flex items-center gap-1">
                     <Users size={10} />
                     {cls.participantCount} 러너
                   </div>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <span className={`text-2xl font-black number-font tracking-tighter ${
                  index === 0 ? 'text-yellow-600' : 'text-emerald-600'
                }`}>
                  {cls.totalDistance.toFixed(1)}
                </span>
                <span className="text-[10px] font-black text-slate-300 ml-1">KM</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {classes.length === 0 && (
          <div className="p-16 text-center text-slate-300 italic text-sm">
            데이터 동기화가 필요합니다.
          </div>
        )}
      </div>

      {classes.length > 5 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 border-t border-slate-50 cursor-pointer"
        >
          {isExpanded ? (
            <>접기 <ChevronUp size={14} /></>
          ) : (
            <>전체보기 <ChevronDown size={14} /></>
          )}
        </button>
      )}

      {/* Class Details Modal */}
      <AnimatePresence>
        {selectedClass && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedClass(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-emerald-600 p-8 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black italic-header tracking-tighter">
                    {selectedClass.grade}학년 {selectedClass.classNumber}반
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-emerald-100 text-[10px] font-black uppercase tracking-widest">
                      <Users size={12} />
                      {selectedClass.participantCount} 러너
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-100 text-[10px] font-black uppercase tracking-widest">
                      <Trophy size={12} />
                      {selectedClass.totalDistance.toFixed(2)} KM
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClass(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingMembers ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full"
                    />
                    <p className="text-xs font-black uppercase tracking-widest">데이터 불러오는 중...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classMembers.map((member, idx) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <span className="w-6 text-[10px] font-black text-slate-300 group-hover:text-emerald-400">{idx + 1}</span>
                          <div>
                            <p className="font-bold text-slate-900">{member.displayName}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {member.role === 'student' ? '학생' : member.role === 'teacher' ? '교사' : '러너'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-emerald-600 number-font tracking-tighter">{member.totalDistance.toFixed(1)}</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase">KM</p>
                        </div>
                      </div>
                    ))}
                    {classMembers.length === 0 && (
                      <p className="text-center py-12 text-slate-400 font-medium italic">이 학급에는 아직 기록된 학생이 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
