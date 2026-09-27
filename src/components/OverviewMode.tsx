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
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  LayoutGrid,
  LayoutList,
  Zap,
  ArrowDownToLine,
  ArrowUpToLine,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  classes: Classroom[];
  students: Student[];
  feedbacks: FeedbackItem[];
  aiEvaluations: Record<string, AiEvaluation>;
  onRequestAiFeedback: (performerId: string, performerName: string, shotType: ShotType) => Promise<AiEvaluation | null>;
}

type SortMode = 'number-asc' | 'number-desc' | 'stars-desc';
type ViewMode = 'cards' | 'compact';

export const OverviewMode: React.FC<Props> = ({
  classes,
  students,
  feedbacks,
  aiEvaluations,
  onRequestAiFeedback
}) => {
  // activeClassId: null = Screen 1 (학급별빛 랭킹 대항전), string = Screen 2 (학급 상세 / 학생 명렬 화면)
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalStudent, setActiveModalStudent] = useState<Student | null>(null);

  // Sorting and viewing preferences for the student list
  const [sortMode, setSortMode] = useState<SortMode>('number-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);

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

  // Filter & Sort students
  const filteredAndSortedStudents = useMemo(() => {
    let result = classStudents.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.number).includes(searchQuery)
    );

    if (sortMode === 'number-asc') {
      result.sort((a, b) => a.number - b.number);
    } else if (sortMode === 'number-desc') {
      result.sort((a, b) => b.number - a.number);
    } else if (sortMode === 'stars-desc') {
      result.sort((a, b) => {
        const starsA = getStudentStats(a.id).totalStars;
        const starsB = getStudentStats(b.id).totalStars;
        return starsB - starsA || a.number - b.number;
      });
    }

    return result;
  }, [classStudents, searchQuery, sortMode, feedbacks]);

  // Find lowest and highest number in active class
  const sortedByNumber = useMemo(() => {
    return [...classStudents].sort((a, b) => a.number - b.number);
  }, [classStudents]);

  const minNumberStudent = sortedByNumber[0];
  const maxNumberStudent = sortedByNumber[sortedByNumber.length - 1];

  // Quick jump milestone numbers (e.g. 1, 5, 10, 15, 20, last)
  const jumpMilestones = useMemo(() => {
    if (sortedByNumber.length === 0) return [];
    const milestones: { label: string; studentId: string; number: number }[] = [];

    // Always first student
    milestones.push({
      label: `1번 (처음)`,
      studentId: sortedByNumber[0].id,
      number: sortedByNumber[0].number
    });

    // Milestone intervals (5, 10, 15, 20, 25...)
    const lastNum = sortedByNumber[sortedByNumber.length - 1].number;
    for (let step = 5; step < lastNum; step += 5) {
      const match = sortedByNumber.find(s => s.number >= step && s.number < step + 5);
      if (match && !milestones.some(m => m.studentId === match.id)) {
        milestones.push({
          label: `${match.number}번`,
          studentId: match.id,
          number: match.number
        });
      }
    }

    // Always last student
    if (sortedByNumber.length > 1) {
      const last = sortedByNumber[sortedByNumber.length - 1];
      if (!milestones.some(m => m.studentId === last.id)) {
        milestones.push({
          label: `끝번 (${last.number}번)`,
          studentId: last.id,
          number: last.number
        });
      }
    }

    return milestones;
  }, [sortedByNumber]);

  // Scroll to student handler
  const scrollToStudent = (studentId: string) => {
    const el = document.getElementById(`student-item-${studentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedStudentId(studentId);
      setTimeout(() => {
        setHighlightedStudentId(null);
      }, 2400);
    }
  };

  // Scroll to top of list
  const handleScrollToTop = () => {
    if (studentListTopRef.current) {
      studentListTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll to bottom of list
  const handleScrollToBottom = () => {
    if (maxNumberStudent) {
      scrollToStudent(maxNumberStudent.id);
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

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

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 relative z-10 overflow-x-hidden">
      {/* ========================================================================= */}
      {/* SCREEN 1: 전체 학급별 별빛 랭킹 대항전 (CLASS COMPETITION OVERVIEW)        */}
      {/* ========================================================================= */}
      {!activeClassId ? (
        <div className="animate-in fade-in duration-200">
          {/* Top Header without any single 1st-place badge */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-400/10 text-indigo-300 border border-indigo-400/20 text-xs font-bold mb-2">
              <Star className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
              전체확인 모드 &bull; 학급별빛현황
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>학급별빛현황</span>
              <span className="text-xs sm:text-sm font-semibold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">
                전교 누적 ★ {totalSchoolStars}개 별빛
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              학급을 선택하면 다음 화면으로 이동하여 학생들의 <strong>번호순</strong> 또는 <strong>별 순위</strong>와 상세 피드백을 확인할 수 있습니다.
            </p>
          </div>

          {/* Star Competition Board */}
          <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900/85 to-slate-950 border border-amber-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-96 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 mb-5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                    <span>🏆 학급별 별빛 랭킹 대항전</span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                      실시간 집계
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    원하는 학급 카드를 누르면 개별 학생 목록 화면으로 넘어갑니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {classRankingList.map((c, index) => {
                const rank = index + 1;
                const percentage = maxClassStars > 0 ? Math.round((c.totalStars / maxClassStars) * 100) : 0;

                // Podium rank styles
                let rankBadge = (
                  <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700 shadow-sm">
                    {rank}위
                  </span>
                );
                let cardBorder = 'border-slate-800 bg-slate-950/70 hover:border-amber-400/60 hover:bg-slate-900/90';

                if (rank === 1) {
                  rankBadge = (
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-md shadow-amber-500/30">
                      🥇 1
                    </span>
                  );
                  cardBorder = 'border-amber-400/40 bg-slate-900/90 hover:border-amber-400 shadow-lg shadow-amber-500/10';
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 text-xs font-black flex items-center justify-center shadow-md">
                      🥈 2
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 text-xs font-black flex items-center justify-center shadow-md">
                      🥉 3
                    </span>
                  );
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectClass(c.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-lg hover:-translate-y-1 ${cardBorder}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          {rankBadge}
                          <div>
                            <h4 className="font-extrabold text-base text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                              {c.name}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              학생 {c.studentCount}명 &bull; 피드백 {c.feedbackCount}건
                            </span>
                          </div>
                        </div>

                        {/* High-visibility total stars */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
                            <strong className="text-2xl font-black text-amber-300 tracking-tight">
                              {c.totalStars}
                            </strong>
                            <span className="text-xs font-bold text-slate-400">개</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block -mt-0.5">
                            평균 {c.avgStars}개 / 인
                          </span>
                        </div>
                      </div>

                      {/* Relative Star Progress Bar */}
                      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mt-3">
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

                    {/* Action button */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        순위: <strong className="text-slate-200">{rank}위</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all">
                        학생 명렬 & 별 순위 보기
                        <ChevronRight className="w-4 h-4" />
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
        /* SCREEN 2: 학급 상세 화면 (NEXT SCREEN - 번호순 / 별 순위별 학생 명렬)      */
        /* ========================================================================= */
        <div className="animate-in fade-in duration-200">
          {/* Back button and Class Header */}
          <div ref={studentListTopRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToOverview}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-md cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>전체 학급 랭킹으로</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {currentClassInfo?.name} 별빛 현황
                  </h2>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950">
                    {currentClassRank}위
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  총 학생 {classStudents.length}명 &bull; 누적 별빛 ★ {currentClassInfo?.totalStars || 0}개 (평균 {currentClassInfo?.avgStars || 0}개)
                </p>
              </div>
            </div>

            {/* Quick Switcher for Other Classes */}
            <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 px-2 shrink-0">다른 반 보기:</span>
              {classes.map((c) => {
                const isCurrent = c.id === activeClassId;
                const cInfo = classRankingList.find(x => x.id === c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClass(c.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950/70 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{c.name.match(/\d+반/) ? c.name.match(/\d+반/)?.[0] : c.name}</span>
                    <span className="text-[10px] opacity-80">★{cInfo?.totalStars || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Bar: Sort Mode (번호순 / 별 순위) + Search + View Mode */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl mb-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Primary Sort Selector: 번호순 vs 별 순위 */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  정렬 기준:
                </span>

                <button
                  type="button"
                  onClick={() => setSortMode('number-asc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    sortMode === 'number-asc'
                      ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>번호순 (1번부터)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode('number-desc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    sortMode === 'number-desc'
                      ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>번호순 (끝번부터)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortMode('stars-desc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    sortMode === 'stars-desc'
                      ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>별 순위 (별빛순)</span>
                </button>
              </div>

              {/* View Mode Toggle: Cards vs Compact */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">보기 방식:</span>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    title="상세 카드 모드"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-slate-800 text-amber-300 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    title="한눈에 보기 (스크롤 없이 빠른 확인)"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'compact'
                        ? 'bg-slate-800 text-amber-300 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search + Quick Jump Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="학생 이름 또는 번호 검색 (예: 1, 28, 민우)"
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Quick Milestones (1번, 5번, 10번... 끝번) */}
              {jumpMilestones.length > 0 && sortMode !== 'stars-desc' && (
                <div className="flex items-center gap-1 overflow-x-auto text-xs py-1">
                  <span className="text-[10px] text-slate-500 font-bold shrink-0">바로가기:</span>
                  {jumpMilestones.map((m, idx) => {
                    const isLast = idx === jumpMilestones.length - 1;
                    return (
                      <button
                        key={m.studentId}
                        type="button"
                        onClick={() => scrollToStudent(m.studentId)}
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] shrink-0 transition-all cursor-pointer border ${
                          isLast
                            ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 hover:bg-amber-400 hover:text-slate-950'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Student Roster View */}
          {filteredAndSortedStudents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">검색 조건에 맞는 학생이 없습니다.</p>
            </div>
          ) : viewMode === 'compact' ? (
            /* COMPACT HIGH-DENSITY GRID (All students visible on one screen!) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {filteredAndSortedStudents.map((student, idx) => {
                const stats = getStudentStats(student.id);
                const isHighlighted = highlightedStudentId === student.id;
                const starRank = idx + 1;

                return (
                  <div
                    key={student.id}
                    id={`student-item-${student.id}`}
                    onClick={() => setActiveModalStudent(student)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group shadow-md hover:-translate-y-0.5 ${
                      isHighlighted
                        ? 'ring-2 ring-amber-400 bg-amber-950/40 border-amber-400 scale-[1.03] shadow-amber-400/20'
                        : 'bg-slate-900/90 border-slate-800 hover:border-amber-400/60 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-extrabold text-xs flex items-center justify-center border border-slate-700/80 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                          {student.number}
                        </span>
                        {sortMode === 'stars-desc' && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            starRank === 1
                              ? 'bg-amber-400 text-slate-950'
                              : starRank === 2
                              ? 'bg-slate-300 text-slate-950'
                              : starRank === 3
                              ? 'bg-amber-700 text-amber-100'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {starRank}위
                          </span>
                        )}
                      </div>

                      <div className="px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center gap-1 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 group-hover:fill-slate-950 group-hover:text-slate-950" />
                        <strong className="text-xs font-black text-amber-300 group-hover:text-slate-950">
                          {stats.totalStars}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-amber-200 transition-colors truncate">
                        {student.name}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>피드백 {stats.feedbackCount}건</span>
                        <span className="text-amber-400/80">★M{stats.middleStars} L{stats.layupStars}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DETAILED CARD VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedStudents.map((student, idx) => {
                const stats = getStudentStats(student.id);
                const isHighlighted = highlightedStudentId === student.id;
                const starRank = idx + 1;

                return (
                  <div
                    key={student.id}
                    id={`student-item-${student.id}`}
                    onClick={() => setActiveModalStudent(student)}
                    className={`group p-5 rounded-2xl border transition-all cursor-pointer shadow-lg flex flex-col justify-between relative overflow-hidden ${
                      isHighlighted
                        ? 'ring-2 ring-amber-400 bg-amber-950/40 border-amber-400 scale-[1.02] shadow-amber-400/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-amber-400/60 hover:bg-slate-900 hover:-translate-y-1'
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

                    <div>
                      {/* Header: Student Number & Name & Star Rank */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 font-extrabold text-xs flex items-center justify-center border border-slate-700/80 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                            {student.number}번
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-base text-white group-hover:text-amber-200 transition-colors">
                                {student.name}
                              </h4>
                              {sortMode === 'stars-desc' && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  starRank === 1
                                    ? 'bg-amber-400 text-slate-950'
                                    : starRank === 2
                                    ? 'bg-slate-300 text-slate-950'
                                    : starRank === 3
                                    ? 'bg-amber-700 text-amber-100'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  학급 {starRank}위
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              피드백 {stats.feedbackCount}건 &bull; 보답별 {stats.thankYouStars}개
                            </span>
                          </div>
                        </div>

                        {/* Total Stars Badge */}
                        <div
                          title="별을 눌러 상세 자료 및 피드백 열람"
                          className="px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center gap-1.5 shadow-sm group-hover:bg-amber-400 group-hover:text-slate-950 transition-all"
                        >
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:fill-slate-950 group-hover:text-slate-950" />
                          <strong className="text-sm font-extrabold text-amber-300 group-hover:text-slate-950">
                            {stats.totalStars}
                          </strong>
                        </div>
                      </div>

                      {/* Star breakdown details */}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">미들슛 별</span>
                          <strong className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                            <Flame className="w-3 h-3 text-amber-400" />
                            ★ {stats.middleStars}
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">레이업슛 별</span>
                          <strong className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3 text-sky-400" />
                            ★ {stats.layupStars}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action prompt */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 group-hover:text-slate-300 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        자세 자료 & 피드백 열람
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Quick Jump Buttons */}
          <div className="fixed bottom-6 right-4 sm:right-6 z-30 flex flex-col gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleScrollToTop}
              title="맨 위로 이동"
              className="w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md hover:scale-105"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleScrollToBottom}
              title={`마지막 번호(${maxNumberStudent?.number || '끝'}번)로 이동`}
              className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 shadow-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 font-bold"
            >
              <ArrowDownToLine className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal when student/star is clicked */}
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
