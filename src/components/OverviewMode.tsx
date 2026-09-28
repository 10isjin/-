import React, { useState, useMemo, useRef } from 'react';
import {
  Classroom,
  Student,
  FeedbackItem,
  AiEvaluation,
  ShotType
} from '../types';
import { StudentDetailModal } from './StudentDetailModal';
import {
  Star,
  Search,
  Users,
  Trophy,
  Flame,
  Sparkles,
  ChevronRight,
  ArrowUp,
  ArrowLeft
} from 'lucide-react';

interface Props {
  classes: Classroom[];
  students: Student[];
  feedbacks: FeedbackItem[];
  aiEvaluations: Record<string, AiEvaluation>;
  onRequestAiFeedback: (performerId: string, performerName: string, shotType: ShotType) => Promise<AiEvaluation | null>;
}

export const OverviewMode: React.FC<Props> = ({
  classes,
  students,
  feedbacks,
  aiEvaluations,
  onRequestAiFeedback
}) => {
  // activeClassId: null = Screen 1 (전체 학급 랭킹 대항전), string = Screen 2 (학급 상세 / 학생 명렬)
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalStudent, setActiveModalStudent] = useState<Student | null>(null);

  const studentListTopRef = useRef<HTMLDivElement>(null);

  // Calculate statistics for each student
  const getStudentStats = (studentId: string) => {
    const myFeedbacks = feedbacks.filter(f => f.performerId === studentId);
    const middleStars = myFeedbacks
      .filter(f => f.shotType === 'middle')
      .reduce((sum, f) => sum + (f.stars || 1), 0);
    const layupStars = myFeedbacks
      .filter(f => f.shotType === 'layup')
      .reduce((sum, f) => sum + (f.stars || 1), 0);

    // Stars earned from peers thanking this student for helpful observation
    const thankYouStars = feedbacks
      .filter(f => f.observerId === studentId && f.favoriteRewarded)
      .length;

    const totalStars = middleStars + layupStars + thankYouStars;

    return {
      middleStars,
      layupStars,
      thankYouStars,
      totalStars,
      feedbackCount: myFeedbacks.length
    };
  };

  // Precompute comprehensive stats for ALL classes for the Star Competition Leaderboard
  const classRankingList = useMemo(() => {
    const list = classes.map(c => {
      const cStudents = students.filter(s => s.classId === c.id);
      const cFeedbacks = feedbacks.filter(f => f.classId === c.id);
      const cTotalStars = cStudents.reduce((sum, s) => sum + getStudentStats(s.id).totalStars, 0);
      const studentCount = cStudents.length;
      const avgStars = studentCount > 0 ? (cTotalStars / studentCount).toFixed(1) : '0';

      return {
        ...c,
        studentCount,
        feedbackCount: cFeedbacks.length,
        totalStars: cTotalStars,
        avgStars: parseFloat(avgStars)
      };
    });

    // Sort by totalStars descending, then avgStars descending
    return list.sort((a, b) => b.totalStars - a.totalStars || b.avgStars - a.avgStars);
  }, [classes, students, feedbacks]);

  const totalSchoolStars = useMemo(() => {
    return classRankingList.reduce((sum, c) => sum + c.totalStars, 0);
  }, [classRankingList]);

  const maxClassStars = Math.max(...classRankingList.map(c => c.totalStars), 1);

  // Selected class info when on Screen 2
  const currentClassInfo = useMemo(() => {
    if (!activeClassId) return null;
    return classRankingList.find(c => c.id === activeClassId) || null;
  }, [activeClassId, classRankingList]);

  const currentClassRank = useMemo(() => {
    if (!activeClassId) return 0;
    return classRankingList.findIndex(c => c.id === activeClassId) + 1;
  }, [activeClassId, classRankingList]);

  // Filter students for the active class
  const classStudents = useMemo(() => {
    if (!activeClassId) return [];
    return students.filter(s => s.classId === activeClassId);
  }, [students, activeClassId]);

  // Always naturally sorted by student number (1번, 2번, 3번...), no confusing sort selector
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = classStudents.filter(s =>
      !query ||
      s.name.toLowerCase().includes(query) ||
      String(s.number).includes(query)
    );
    // Natural number ascending order
    result.sort((a, b) => a.number - b.number);
    return result;
  }, [classStudents, searchQuery]);

  // Navigate to class screen
  const handleSelectClass = (classId: string) => {
    setActiveClassId(classId);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate back to school overview
  const handleBackToOverview = () => {
    setActiveClassId(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 relative z-10 overflow-x-hidden">
      {/* ========================================================================= */}
      {/* SCREEN 1: 전체 학급별 별빛 랭킹 대항전 (CLASS COMPETITION OVERVIEW)        */}
      {/* ========================================================================= */}
      {!activeClassId ? (
        <div className="animate-in fade-in duration-200">
          {/* Top Header */}
          <div className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-400/10 text-indigo-300 border border-indigo-400/20 text-xs font-bold mb-2">
              <Star className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
              전체확인 모드 &bull; 학급별빛현황
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>학급별빛현황</span>
              <span className="text-xs sm:text-sm font-semibold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">
                전교 누적 ★ {totalSchoolStars}개 별빛
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              원하는 학급 카드를 누르면 해당 학급의 학생별 별빛 현황과 상세 피드백을 확인할 수 있습니다.
            </p>
          </div>

          {/* Star Competition Board */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/85 to-slate-950 border border-amber-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>학급별 별빛 랭킹 대항전</span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                    실시간 집계
                  </span>
                </h3>
              </div>
            </div>

            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
              {classRankingList.map((c, index) => {
                const rank = index + 1;
                const percentage = maxClassStars > 0 ? Math.round((c.totalStars / maxClassStars) * 100) : 0;

                let rankBadge = (
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700">
                    {rank}위
                  </span>
                );
                let cardBorder = 'border-slate-800 bg-slate-950/70 hover:border-amber-400/60 hover:bg-slate-900/90';

                if (rank === 1) {
                  rankBadge = (
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-md">
                      1위
                    </span>
                  );
                  cardBorder = 'border-amber-400/40 bg-slate-900/90 hover:border-amber-400 shadow-md shadow-amber-500/10';
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 text-xs font-black flex items-center justify-center">
                      2위
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 text-xs font-black flex items-center justify-center">
                      3위
                    </span>
                  );
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectClass(c.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group shadow-md hover:-translate-y-0.5 ${cardBorder}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {rankBadge}
                          <div>
                            <h4 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                              {c.name}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              학생 {c.studentCount}명 &bull; 피드백 {c.feedbackCount}건
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <strong className="text-lg font-black text-amber-300">
                              {c.totalStars}
                            </strong>
                            <span className="text-xs text-slate-400 font-bold">개</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block -mt-0.5">
                            평균 {c.avgStars}개
                          </span>
                        </div>
                      </div>

                      {/* Star Progress Bar */}
                      <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rank === 1
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                              : 'bg-amber-400/80 group-hover:bg-amber-400'
                          }`}
                          style={{ width: `${Math.max(percentage, 6)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        순위: <strong className="text-slate-200">{rank}위</strong>
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-400 group-hover:text-amber-300 text-xs">
                        학생 목록 보기
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SCREEN 2: 학급 상세 화면 (가로스크롤 제거 & 초소형 고밀도 콤팩트 그리드)  */
        /* ========================================================================= */
        <div className="animate-in fade-in duration-200">
          {/* Header Bar: Back button, Class Title & Dropdown Switcher (가로 스크롤 없음) */}
          <div ref={studentListTopRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleBackToOverview}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shrink-0 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>전체 랭킹</span>
              </button>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {currentClassInfo?.name} 학생 별빛 현황
                  </h2>
                  <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                    전교 {currentClassRank}위
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  총 {classStudents.length}명 &bull; 누적 ★ {currentClassInfo?.totalStars || 0}개 (평균 {currentClassInfo?.avgStars || 0}개)
                </p>
              </div>
            </div>

            {/* Clean Dropdown Class Switcher (가로 스크롤바 유발 요소 원천 차단) */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="class-select" className="text-xs text-slate-400 font-bold shrink-0">
                학급 이동:
              </label>
              <select
                id="class-select"
                value={activeClassId}
                onChange={(e) => handleSelectClass(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-extrabold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
              >
                {classes.map(c => {
                  const cInfo = classRankingList.find(x => x.id === c.id);
                  return (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} (★{cInfo?.totalStars || 0}개)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Search Bar Only (정렬 기준 버튼 완전 삭제) */}
          <div className="mb-3.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학생 이름 또는 번호 검색 (예: 1, 15, 민준)"
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 shadow-sm"
              />
            </div>
          </div>

          {/* Student Roster: High-Density Compact Grid (한눈에 여러 명 확인, 상하 스크롤 대폭 감소) */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-slate-500">
              <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs font-semibold">검색 조건에 일치하는 학생이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredStudents.map((student) => {
                const stats = getStudentStats(student.id);

                return (
                  <div
                    key={student.id}
                    onClick={() => setActiveModalStudent(student)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/85 hover:border-amber-400/70 hover:bg-slate-850 hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm group flex flex-col justify-between"
                  >
                    {/* Top Row: Number & Name & Stars Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center border border-slate-700 shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                          {student.number}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                          {student.name}
                        </h4>
                      </div>

                      {/* Star count pill */}
                      <div className="px-1.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 flex items-center gap-0.5 shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 group-hover:fill-slate-950 group-hover:text-slate-950" />
                        <strong className="text-xs font-black text-amber-300 group-hover:text-slate-950">
                          {stats.totalStars}
                        </strong>
                      </div>
                    </div>

                    {/* Bottom Row: Subtle Compact Info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>피드백 {stats.feedbackCount}건</span>
                      <span className="text-amber-400/80 font-medium">
                        M{stats.middleStars} &bull; L{stats.layupStars}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Quick Scroll to Top Button */}
          <div className="fixed bottom-5 right-4 z-20">
            <button
              type="button"
              onClick={handleScrollToTop}
              title="맨 위로 이동"
              className="w-9 h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-lg flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal when student card is clicked */}
      {activeModalStudent && (
        <StudentDetailModal
          student={activeModalStudent}
          feedbacks={feedbacks}
          aiEvaluations={aiEvaluations}
          onClose={() => setActiveModalStudent(null)}
          onRequestAiFeedback={onRequestAiFeedback}
        />
      )}
    </div>
  );
};
