import { useState, useMemo } from 'react';
import { DayRecord } from '../utils/history';
import { TrendingUp, Award, Calendar, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ProgressChartProps {
  records: DayRecord[];
  title?: string;
  isClass?: boolean;
}

export default function ProgressChart({ records, title, isClass = false }: ProgressChartProps) {
  const [viewMode, setViewMode] = useState<'recent' | 'all'>('recent');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter records based on viewMode
  const chartRecords = useMemo(() => {
    if (viewMode === 'recent') {
      return records.slice(-10); // Show last 10 days
    }
    return records;
  }, [records, viewMode]);

  // Today and Yesterday records from the original full list
  const todayRecord = records[records.length - 1];
  const yesterdayRecord = records[records.length - 2];

  const todayDist = todayRecord?.distance || 0;
  const yesterdayDist = yesterdayRecord?.distance || 0;
  const difference = Number((todayDist - yesterdayDist).toFixed(2));

  // Find max value for chart scaling
  const maxValue = useMemo(() => {
    const max = Math.max(...chartRecords.map(r => r.distance), 1);
    return Math.ceil(max * 1.15); // Add 15% padding at top
  }, [chartRecords]);

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = 140;
  const paddingX = 25;
  const paddingY = 20;

  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Generate coordinates for the SVG path
  const points = useMemo(() => {
    if (chartRecords.length === 0) return [];
    
    // Calculate uniform X step
    const stepX = chartRecords.length > 1 ? chartWidth / (chartRecords.length - 1) : chartWidth;

    return chartRecords.map((rec, i) => {
      const x = paddingX + i * stepX;
      // Invert Y because SVG 0 is at the top
      const yStr = maxValue > 0 ? (paddingY + chartHeight - (rec.distance / maxValue) * chartHeight) : (paddingY + chartHeight);
      const y = parseFloat(yStr.toFixed(2));
      return { x, y, record: rec };
    });
  }, [chartRecords, chartWidth, chartHeight, paddingX, paddingY, maxValue]);

  // Smooth cubic bezier path generator
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  // Area path (closed polygon at bottom)
  const areaPath = useMemo(() => {
    if (points.length < 2 || !linePath) return '';
    return `${linePath} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`;
  }, [points, linePath, paddingY, chartHeight]);

  // Helper to format date strings for Korean users (e.g. "05월 24일")
  const formatDateKorean = (dateStr: string) => {
    try {
      const [, month, day] = dateStr.split('-');
      return `${parseInt(month)}월 ${parseInt(day)}일`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-55 border border-emerald-100/50 rounded-3xl p-5 mb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <TrendingUp size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">일자별 참여 추이</h4>
            <span className="text-xs font-bold text-slate-600 leading-none">
              대비 분석 {title && `(${title})`}
            </span>
          </div>
        </div>
        
        {/* View Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
          <button
            onClick={() => setViewMode('recent')}
            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
              viewMode === 'recent' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            최근 10일
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
              viewMode === 'all' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            전체 기간
          </button>
        </div>
      </div>

      {/* Comparison Insights Box */}
      <div className="bg-gradient-to-r from-emerald-50/50 to-green-50/30 rounded-2xl p-4 border border-emerald-200/40 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
          <Award size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">오늘 vs 어제 기록 비교</p>
          <div className="text-slate-800 font-medium text-xs mt-1">
            {difference > 0 ? (
              <span>
                어제보다 오늘 <strong className="text-emerald-600 text-sm font-black">+{difference.toFixed(2)} km 더</strong> 달렸습니다! 기여도가 눈에 띄게 수직 상승 중입니다 🏃‍♂️💨
              </span>
            ) : difference < 0 ? (
              <span>
                어제보다 오늘 <strong className="text-orange-500 text-sm font-black">-{Math.abs(difference).toFixed(2)} km 덜</strong> 달렸습니다. 가볍게 발걸음을 떼어 어제 기록을 따라잡아 볼까요? 🔥
              </span>
            ) : todayDist > 0 ? (
              <span>
                어제와 똑같이 <strong className="text-emerald-600 text-sm font-black">{todayDist.toFixed(2)} km를</strong> 꾸준하게 완주했습니다! 흔들리지 않는 완벽한 페이스 유지입니다 ⭐
              </span>
            ) : yesterdayDist > 0 ? (
              <span>
                어제는 <strong className="text-slate-500 font-bold">{yesterdayDist.toFixed(2)} km</strong>를 달리며 활약했으나, 오늘은 아직 러닝 기록이 없습니다. 함께 활력을 넣어주세요! 🌟
              </span>
            ) : (
              <span>
                어제와 오늘 아직 달리기 기록이 반영되지 않았습니다. 내일의 활약을 위해 지금 첫발을 내디뎌 볼까요? 👍
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-400">
            <span>어제: <strong className="text-slate-600">{yesterdayDist.toFixed(2)} km</strong></span>
            <span>오늘: <strong className="text-slate-600">{todayDist.toFixed(2)} km</strong></span>
          </div>
        </div>
      </div>

      {/* The Styled SVG Graph */}
      <div className="relative bg-white rounded-2xl border border-slate-100 p-4 shadow-inner overflow-hidden min-h-[160px]">
        {points.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-slate-300 text-xs italic">
            충분한 일자별 데이터 정보가 없습니다.
          </div>
        ) : (
          <div className="relative w-full h-full">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              width="100%" 
              height="100%" 
              className="overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Line glow effect */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Area under the line gradient */}
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingY + chartHeight * ratio;
                const value = maxValue - (maxValue * ratio);
                return (
                  <g key={idx}>
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={svgWidth - paddingX} 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={paddingX - 4} 
                      y={y + 3} 
                      fill="#94a3b8" 
                      fontSize="7" 
                      fontWeight="black" 
                      textAnchor="end"
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Area path */}
              {areaPath && (
                <path d={areaPath} fill="url(#areaGrad)" />
              )}

              {/* Main glowing line */}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  filter="url(#glow)"
                />
              )}

              {/* Data points & Interaction Hotspots */}
              {points.map((pt, i) => {
                const isHovered = hoveredIdx === i;
                const dateShort = formatDateKorean(pt.record.dateStr);
                const isToday = i === points.length - 1;
                const isYesterday = i === points.length - 2;

                return (
                  <g key={i}>
                    {/* Glowing highlight ring on hover */}
                    {isHovered && (
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="10" 
                        fill="#10b981" 
                        fillOpacity="0.15" 
                      />
                    )}
                    {/* Inner core circle */}
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={isToday ? "5.5" : isHovered ? "4.5" : "3"} 
                      fill={isToday ? "#10b981" : "#ffffff"} 
                      stroke="#10b981" 
                      strokeWidth={isToday ? "2" : isHovered ? "2.5" : "1.5"}
                      style={{ cursor: 'pointer', transition: 'all 0.1s ease-out' }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                    
                    {/* Bottom Date labels (selectively rendered to avoid crowding) */}
                    {(chartRecords.length < 12 || i % Math.max(1, Math.floor(chartRecords.length / 6)) === 0 || isToday || isYesterday) && (
                      <text 
                        x={pt.x} 
                        y={svgHeight - 4} 
                        fill={isToday ? "#10b981" : isYesterday ? "#64748b" : "#cbd5e1"} 
                        fontSize="7.5" 
                        fontWeight="black" 
                        textAnchor="middle"
                      >
                        {isToday ? "오늘" : isYesterday ? "어제" : dateShort}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIdx !== null && points[hoveredIdx] && (
              <div 
                className="absolute bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl text-[10px] pointer-events-none shadow-xl border border-white/10 flex flex-col gap-0.5 animate-in scale-in fade-in duration-100"
                style={{
                  left: `${Math.min(Math.max((points[hoveredIdx].x / svgWidth) * 100, 10), 90)}%`,
                  top: `${Math.min(Math.max((points[hoveredIdx].y / svgHeight) * 100 - 35, 10), 65)}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 mb-1 font-black uppercase tracking-wider text-slate-400">
                  <Calendar size={10} className="text-emerald-400" />
                  {formatDateKorean(points[hoveredIdx].record.dateStr)}
                </div>
                <div className="font-bold">
                  기록거리: <span className="text-emerald-400 font-extrabold">{points[hoveredIdx].record.distance.toFixed(2)} km</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <p className="text-[10px] font-medium text-slate-400 text-center leading-normal">
        * 그래프는 챌린지 시작일({formatDateKorean('2026-04-22')})부터 현재까지 참여기록을 나타냅니다.
      </p>
    </div>
  );
}
