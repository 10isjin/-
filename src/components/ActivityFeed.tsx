import { Run } from '../types';
import { Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityFeedProps {
  runs: Run[];
}

export default function ActivityFeed({ runs }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <h3 className="text-lg font-black italic-header flex items-center gap-2">
          <Activity size={18} className="text-emerald-400" />
          최근 활동
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">실시간 현황</span>
      </div>

      <div className="p-2">
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {runs.map((run) => (
              <motion.div
                key={run.id}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-2xl bg-white hover:bg-emerald-50/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <Activity size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 leading-tight">{run.userName}</p>
                  </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(run.timestamp.toDate(), { addSuffix: true, locale: ko })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-600 number-font tracking-tighter">+{run.distance.toFixed(1)}</span>
                  <span className="text-[10px] font-black text-slate-300 ml-1">KM</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {runs.length === 0 && (
            <div className="p-16 text-center text-slate-300 italic text-sm">
              방금 전까지 실시간으로 업데이트된 기록이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
