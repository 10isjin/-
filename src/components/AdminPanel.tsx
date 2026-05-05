import { useState, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { useFirebase } from '../hooks/useFirebase';
import { Database, Upload, FileText, CheckCircle, AlertTriangle, ArrowLeft, Users, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const { bulkUpdateFromCSV, visitorStats } = useFirebase();
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setStatus({ type: 'success', message: `${results.data.length}개의 데이터를 불러왔습니다.` });
      },
      error: (err) => {
        setStatus({ type: 'error', message: 'CSV 파싱 중 오류가 발생했습니다.' });
        console.error(err);
      }
    });
  };

  const handleSync = async () => {
    if (csvData.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setStatus(null);
    
    try {
      await bulkUpdateFromCSV(csvData);
      setStatus({ type: 'success', message: '데이터 동기화가 완료되었습니다!' });
      setCsvData([]);
    } catch (err) {
      setStatus({ type: 'error', message: '업데이트 중 오류가 발생했습니다. 권한을 확인하세요.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        메인 대시보드로 돌아가기
      </button>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
           {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
               <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-2">
                <Database size={14} />
                관리자 콘솔
              </div>
              <h2 className="text-3xl font-black italic-header">데이터 관리 센터</h2>
              <p className="text-slate-400 text-sm mt-1">런데이(Runday) CSV 데이터를 업로드하여 실시간 기록을 동기화합니다.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats Dashboard */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">누적 접속자 수</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">
                  {visitorStats?.totalVisits?.toLocaleString() || 0}
                  <span className="text-sm font-medium text-slate-400 ml-1">명</span>
                </h3>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">오늘의 접속자 수</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">
                  {visitorStats?.dailyVisits?.[new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())]?.toLocaleString() || 0}
                  <span className="text-sm font-medium text-slate-400 ml-1">명</span>
                </h3>
              </div>
            </div>
          </div>

          {/* File Upload Hero */}
          <div className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
            csvData.length > 0 ? 'border-green-200 bg-green-50/30' : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/30'
          }`}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer block">
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors ${
                csvData.length > 0 ? 'bg-green-500 text-white' : 'bg-white text-slate-400 shadow-sm'
              }`}>
                {csvData.length > 0 ? <FileText size={32} /> : <Upload size={32} />}
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {csvData.length > 0 ? '파일이 준비되었습니다' : 'CSV 파일 업로드'}
              </h4>
              <p className="text-sm text-slate-400">
                런데이 관리자 페이지에서 내려받은 활동 리포트를 선택하세요.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-700">안내: 당일 운동 기록은 런데이 시스템 특성상 다음 날 데이터부터 반영될 수 있습니다.</span>
              </div>
            </label>
          </div>

          {status && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-4 rounded-2xl flex items-center gap-3 ${
                status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              <span className="text-sm font-bold">{status.message}</span>
            </motion.div>
          )}

          {csvData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">데이터 미리보기</span>
                <span className="text-xs font-bold text-blue-600">{csvData.length}개 행 불러옴</span>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-50 bg-slate-50/50">
                <table className="w-full text-left text-xs font-medium">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-slate-400">이름</th>
                      <th className="px-4 py-3 text-slate-400">소속</th>
                      <th className="px-4 py-3 text-slate-400">거리(km)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvData.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-bold text-slate-900">{row["이름"] || row["닉네임"]}</td>
                        <td className="px-4 py-3 text-slate-500">{row["소속"]}</td>
                        <td className="px-4 py-3 font-mono text-blue-600">{row["누적거리(km)"]} km</td>
                      </tr>
                    ))}
                    {csvData.length > 50 && (
                      <tr className="bg-white">
                        <td colSpan={3} className="px-4 py-3 text-center text-slate-400 italic">
                          ...외 {csvData.length - 50}개 행 더 있음
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleSync}
                disabled={isProcessing}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black text-xl shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    동기화 진행 중...
                  </>
                ) : (
                  <>
                    <Database size={24} />
                    서버 데이터 실시간 반영하기
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
