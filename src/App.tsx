import { useState, type FormEvent } from 'react';
import { useFirebase } from './hooks/useFirebase';
import { loginWithGoogle, auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import EarthProgress from './components/EarthProgress';
import Leaderboard from './components/Leaderboard';
import ActivityFeed from './components/ActivityFeed';
import ClassLeaderboard from './components/ClassLeaderboard';
import AdminPanel from './components/AdminPanel';
import { 
  LogOut, 
  Globe,
  Settings,
  ShieldCheck,
  TrendingUp, 
  Users,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, profile, globalStats, recentRuns, topRunners, topClasses, loading, getClassMembers } = useFirebase();
  const [isAdminView, setIsAdminView] = useState(false);

  const isAdmin = user?.email === "yelloboll@goedu.kr";

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-slate-900 font-bold tracking-tight italic-header">갈매지구런</p>
        </div>
      </div>
    );
  }

  if (isAdminView && isAdmin) {
    return <AdminPanel onBack={() => setIsAdminView(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F7FBF9] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Slim Navbar */}
      <nav className="sticky top-0 z-[60] bg-white/70 backdrop-blur-xl border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-emerald-600" />
            <h1 className="text-base font-black italic-header text-slate-900 tracking-tighter">갈매지구런</h1>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminView(true)}
                className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-100 cursor-pointer"
              >
                <Settings size={12} />
                관리자 콘솔
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                   {isAdmin && <ShieldCheck size={12} className="text-emerald-600" />}
                   <span className="text-[11px] font-black text-slate-500 uppercase">{user.displayName}</span>
                </div>
                <button 
                  onClick={() => signOut(auth)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
                <button 
                onClick={loginWithGoogle}
                className="text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-[0.2em] transition-colors"
              >
                관리자 로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pb-24">
        {/* Progress Tracker Section - Minimized Header Area */}
        <section className="relative">
          <EarthProgress 
            currentDistance={globalStats?.totalDistance || 0} 
            lastUpdated={globalStats?.lastUpdated ? globalStats.lastUpdated.toDate() : null}
          />
        </section>

        {/* The Leaderboards View */}
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 mt-12">
          
          {/* Column 1: Class Ranking */}
          <div className="space-y-4">
            <ClassLeaderboard classes={topClasses} getClassMembers={getClassMembers} />
            {globalStats?.lastUpdated && (
              <p className="text-[10px] text-slate-400 font-medium px-2 flex items-center justify-end gap-1.5 opacity-70">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                최근 업데이트: {globalStats.lastUpdated.toDate().toLocaleString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

          {/* Column 2: Individual Ranking */}
          <div className="space-y-4">
            <Leaderboard runners={topRunners} />
            {globalStats?.lastUpdated && (
              <p className="text-[10px] text-slate-400 font-medium px-2 flex items-center justify-end gap-1.5 opacity-70">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                최근 업데이트: {globalStats.lastUpdated.toDate().toLocaleString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

        </div>
      </main>

      <footer className="py-24 bg-white text-center border-t border-emerald-50 mt-20 px-6">
        <p className="text-3xl md:text-5xl font-black italic-header text-slate-900 mb-6 tracking-tighter leading-tight">
          "갈매의 발걸음을 모아 <br className="md:hidden" /> 내일의 지구를 뛰게하라"
        </p>
        <div className="w-16 h-1.5 bg-emerald-600 rounded-full mx-auto mb-10" />
        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">
          갈매중학교 체육 교육 프로젝트
        </p>
      </footer>
    </div>
  );
}
