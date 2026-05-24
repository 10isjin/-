import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { X, Trophy, User as UserIcon, Calendar, Eye } from 'lucide-react';
import { generateUserHistory } from '../utils/history';
import ProgressChart from './ProgressChart';

interface RunnerDetailsModalProps {
  runner: UserProfile | null;
  onClose: () => void;
}

export default function RunnerDetailsModal({ runner, onClose }: RunnerDetailsModalProps) {
  if (!runner) return null;

  const runnerHistory = generateUserHistory(runner);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                  runner.role === 'student' ? 'bg-emerald-500/20 text-emerald-300' :
                  runner.role === 'teacher' ? 'bg-blue-500/20 text-blue-300' :
                  runner.role === 'parent' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-orange-500/20 text-orange-300'
                }`}>
                  {runner.role === 'student' ? '학생' : runner.role === 'teacher' ? '교사' : runner.role === 'parent' ? '학부모' : '주민'}
                </span>
                
                {runner.studentId && (
                  <span className="text-[10px] font-black text-blue-300">
                    학번: {runner.studentId}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black tracking-tight">{runner.displayName}</h3>
              {runner.classId && (
                <p className="text-slate-400 text-xs mt-1 font-bold">
                  소속: {runner.classId.replace('-', '학년 ')}반
                </p>
              )}
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contents Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main stats counters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">누적 기록</span>
              <div className="font-black text-emerald-600 mt-1 leading-none">
                <span className="text-3xl">{Math.floor(runner.totalDistance)}</span>
                <span className="text-lg">.{(runner.totalDistance % 1).toFixed(2).split('.')[1]}</span>
                <span className="text-xs text-slate-300 ml-1">KM</span>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">참여 횟수</span>
              <div className="font-black text-slate-800 mt-1 leading-none">
                <span className="text-3xl">{runner.runCount || 0}</span>
                <span className="text-xs text-slate-300 ml-1">회</span>
              </div>
            </div>
          </div>

          {/* Daily Progress Chart */}
          <ProgressChart records={runnerHistory} title="개인 누적" />
        </div>
      </motion.div>
    </motion.div>
  );
}
