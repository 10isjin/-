import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy,
  Flame,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  Medal,
  Award,
  Crown,
  Timer,
  Target,
  Zap,
  Info,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Classroom, Student, GameScoreItem } from '../types';

interface Props {
  classes: Classroom[];
  students: Student[];
  gameScores?: GameScoreItem[];
  onSaveScore: (scoreData: {
    studentId?: string;
    studentName: string;
    studentNumber?: number;
    classId?: string;
    className?: string;
    score: number;
    totalShots: number;
    madeShots: number;
    perfectCount: number;
    maxCombo: number;
    shotTypesBreakdown?: {
      middleMade: number;
      middleTotal: number;
      layupMade: number;
      layupTotal: number;
    };
  }) => Promise<any>;
}

type ShotVariant = 'middle' | 'layup';

export const GameMode: React.FC<Props> = ({
  classes,
  students,
  gameScores = [],
  onSaveScore
}) => {
  // Game states: 'select-player' | 'ready' | 'playing' | 'game-over'
  const [gameState, setGameState] = useState<'select-player' | 'ready' | 'playing' | 'game-over'>('select-player');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [customStudentName, setCustomStudentName] = useState<string>('');
  const [gameDuration] = useState<number>(60); // 60 seconds fixed only
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isHoldingSweet, setIsHoldingSweet] = useState<boolean>(false);

  // Active round stats
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [totalShots, setTotalShots] = useState<number>(0);
  const [madeShots, setMadeShots] = useState<number>(0);
  const [perfectCount, setPerfectCount] = useState<number>(0);
  const [middleTotal, setMiddleTotal] = useState<number>(0);
  const [middleMade, setMiddleMade] = useState<number>(0);
  const [layupTotal, setLayupTotal] = useState<number>(0);
  const [layupMade, setLayupMade] = useState<number>(0);

  // Leaderboard viewing filter
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [recentRank, setRecentRank] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Current shot settings in game
  const [currentShotType, setCurrentShotType] = useState<ShotVariant>('middle');
  const [shotFeedbackText, setShotFeedbackText] = useState<{ text: string; type: 'perfect' | 'good' | 'miss'; points?: number } | null>(null);

  // Canvas ref & animation loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Physics & Animation state refs (to avoid stale closures in requestAnimationFrame)
  const isHoldingRef = useRef<boolean>(false);
  const holdStartTimeRef = useRef<number>(0);
  const isHoldingSweetRef = useRef<boolean>(false);
  const meterProgressRef = useRef<number>(0); // 0 to 1
  const ballRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    spin: number;
    targetX: number;
    targetY: number;
    willScore: boolean;
    isPerfect: boolean;
    shotType: ShotVariant;
    inHoop: boolean;
    points: number;
    totalFrames: number;
    currentFrame: number;
  }>({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    spin: 0,
    targetX: 0,
    targetY: 0,
    willScore: false,
    isPerfect: false,
    shotType: 'middle',
    inHoop: false,
    points: 0,
    totalFrames: 40,
    currentFrame: 0
  });

  const playerAnimRef = useRef<{
    x: number;
    y: number;
    state: 'idle' | 'dribble' | 'charge' | 'jump' | 'land';
    jumpProgress: number; // 0 to 1
    kneeBend: number; // 0 to 1
    driveProgress: number; // for layup: running towards basket
    armAngle: number;
  }>({
    x: 180,
    y: 350,
    state: 'idle',
    jumpProgress: 0,
    kneeBend: 0,
    driveProgress: 0,
    armAngle: 0
  });

  const netRippleRef = useRef<number>(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number; size: number }>>([]);

  // Synthesized Web Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = useCallback((type: 'charge' | 'swish' | 'bank' | 'miss' | 'cheer' | 'buzzer' | 'click') => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;
      if (type === 'swish') {
        // High crisp swish sound (white noise burst + sine drop)
        const bufferSize = ctx.sampleRate * 0.18;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.Q.setValueAtTime(3, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } else if (type === 'bank') {
        // Backboard thud + swish
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'miss') {
        // Clang rim bounce
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'buzzer') {
        // Buzzer beater horn
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(155, now);
        osc2.frequency.setValueAtTime(160, now);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);
      } else if (type === 'cheer') {
        // Victory fanfare chime
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, High C
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.3, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.3);
        });
      }
    } catch (e) {
      // Audio autoplay restriction catch
    }
  }, [soundEnabled]);

  // Set default selection when classes are available
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const currentClassStudents = students.filter(s => s.classId === selectedClassId);
  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Set default student if class changes
  useEffect(() => {
    if (currentClassStudents.length > 0) {
      if (!selectedStudentId || !currentClassStudents.some(s => s.id === selectedStudentId)) {
        setSelectedStudentId(currentClassStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [selectedClassId, currentClassStudents, selectedStudentId]);

  // Countdown timer when playing
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft <= 0) {
      // Buzzer beater! Round finished
      playSound('buzzer');
      setGameState('game-over');
      handleFinishGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          playSound('buzzer');
          setGameState('game-over');
          handleFinishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeLeft, playSound]);

  // Save score when game ends
  const handleFinishGame = async () => {
    setIsSubmitting(true);
    const chosenClass = classes.find(c => c.id === selectedClassId);
    const studentName = activeStudent ? activeStudent.name : customStudentName.trim() || '익명 슈터';

    try {
      const res = await onSaveScore({
        studentId: activeStudent ? activeStudent.id : undefined,
        studentName,
        studentNumber: activeStudent ? activeStudent.number : undefined,
        classId: chosenClass ? chosenClass.id : undefined,
        className: chosenClass ? chosenClass.name : undefined,
        score: currentScore,
        totalShots,
        madeShots,
        perfectCount,
        maxCombo,
        shotTypesBreakdown: {
          middleMade,
          middleTotal,
          layupMade,
          layupTotal
        }
      });

      if (res && res.rank) {
        setRecentRank(res.rank);
      }

      if (currentScore > 0) {
        playSound('cheer');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start round
  const handleStartGame = () => {
    initAudio();
    setCurrentScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTotalShots(0);
    setMadeShots(0);
    setPerfectCount(0);
    setMiddleTotal(0);
    setMiddleMade(0);
    setLayupTotal(0);
    setLayupMade(0);
    setTimeLeft(gameDuration);
    setCurrentShotType('middle');
    setShotFeedbackText(null);
    setRecentRank(null);
    meterProgressRef.current = 0;
    isHoldingRef.current = false;
    ballRef.current.active = false;
    playerAnimRef.current = {
      x: 170,
      y: 350,
      state: 'idle',
      jumpProgress: 0,
      kneeBend: 0,
      driveProgress: 0,
      armAngle: 0
    };
    setGameState('playing');
  };

  // Shot Meter Mechanics:
  // Middle Shot: optimal hold time ~500ms - 650ms (Knee bend & Apex release)
  // Layup Shot: optimal hold time ~450ms - 600ms (1-2 step & Backboard target kiss)
  const handleButtonDown = () => {
    if (gameState !== 'playing') return;
    if (ballRef.current.active) return; // Cannot shoot until previous shot clears
    if (isHoldingRef.current) return;

    initAudio();
    isHoldingRef.current = true;
    holdStartTimeRef.current = Date.now();
    playerAnimRef.current.state = 'charge';
  };

  const handleButtonUp = () => {
    if (gameState !== 'playing') return;
    if (!isHoldingRef.current) return;
    if (ballRef.current.active) return;

    isHoldingRef.current = false;
    const holdDuration = Date.now() - holdStartTimeRef.current;
    setIsHoldingSweet(false);
    executeShot(holdDuration);
  };

  const executeShot = (holdMs: number) => {
    const shotType = currentShotType;
    let isPerfect = false;
    let isGood = false;
    let points = 0;
    let feedback = '';

    // Generously tuned difficulty so students can easily score and enjoy
    if (shotType === 'middle') {
      setMiddleTotal(prev => prev + 1);
      // Generous Perfect Window: 360ms - 760ms (400ms sweet spot!)
      if (holdMs >= 360 && holdMs <= 760) {
        isPerfect = true;
        points = 3;
        feedback = '🌟 PERFECT CLUTCH! (무릎 반동 & 최고 타점 릴리스)';
      } else if (holdMs >= 160 && holdMs <= 960) {
        // Good Window: 160ms - 359ms & 761ms - 960ms (Scores 2 points!)
        isGood = true;
        points = 2;
        feedback = holdMs < 360
          ? '✨ QUICK SHOT! (빠른 릴리스 득점)'
          : '✨ GOOD IN! (부드러운 포물선 슛)';
      } else if (holdMs < 160) {
        feedback = '❌ EARLY (무릎 딥이 부족하고 너무 성급했습니다)';
      } else {
        feedback = '❌ LATE (타점이 떨어져 림을 벗어났습니다)';
      }
    } else {
      // Layup Shot
      setLayupTotal(prev => prev + 1);
      // Generous Perfect Window: 320ms - 720ms (400ms sweet spot!)
      if (holdMs >= 320 && holdMs <= 720) {
        isPerfect = true;
        points = 2;
        feedback = '🎯 PERFECT LAYUP! (1-2 스텝 & 백보드 겨냥점 명중)';
      } else if (holdMs >= 150 && holdMs <= 940) {
        // Good Window: 150ms - 319ms & 721ms - 940ms (Scores 2 points!)
        isGood = true;
        points = 2;
        feedback = '✨ GOOD LAYUP! (백보드 터치 득점)';
      } else if (holdMs < 150) {
        feedback = '❌ EARLY (스텝과 도약이 덜 연결되었습니다)';
      } else {
        feedback = '❌ LATE (골대 밑으로 너무 깊게 들어갔습니다)';
      }
    }

    setTotalShots(prev => prev + 1);

    const willScore = isPerfect || isGood;
    const hoopX = 640;
    const hoopY = 160;
    const g = 0.44; // Consistent gravity constant

    // Starting coordinates based on player position
    const startX = shotType === 'middle' ? 200 : 380;
    const startY = shotType === 'middle' ? 280 : 240;

    let targetX = hoopX;
    let targetY = hoopY;
    let flightFrames = shotType === 'middle' ? 40 : 28;

    if (willScore) {
      if (shotType === 'layup' && !isPerfect) {
        // Layup bank shot: kisses backboard square slightly above rim
        targetX = hoopX + 16;
        targetY = hoopY - 14;
      } else {
        // Clean direct swish into rim center
        targetX = hoopX;
        targetY = hoopY;
      }
    } else {
      // Clear misses:
      if (holdMs < (shotType === 'middle' ? 160 : 150)) {
        // Early release falls short: bounces off front rim
        flightFrames = 34;
        targetX = hoopX - 35;
        targetY = hoopY + 12;
      } else {
        // Late release overshoots: clanks off backboard
        flightFrames = 36;
        targetX = hoopX + 38;
        targetY = hoopY - 26;
      }
    }

    // Exact discrete Euler trajectory formula:
    // With x(t) = startX + vx * t and y(t) = startY + vy0 * t + 0.5 * g * t * (t - 1)
    // To ensure exact arrival at (targetX, targetY) at frame flightFrames:
    const vx = (targetX - startX) / flightFrames;
    const vy0 = (targetY - startY - 0.5 * g * flightFrames * (flightFrames - 1)) / flightFrames;

    ballRef.current = {
      active: true,
      x: startX,
      y: startY,
      vx,
      vy: vy0,
      rotation: 0,
      spin: -0.14,
      targetX,
      targetY,
      willScore,
      isPerfect,
      shotType,
      inHoop: false,
      points,
      totalFrames: flightFrames,
      currentFrame: 0
    };

    // Animate player jump release
    playerAnimRef.current.state = 'jump';
    playerAnimRef.current.jumpProgress = 0;

    // Trigger visual feedback popup
    if (willScore) {
      const comboBonus = combo >= 2 ? 1 : 0;
      const finalPoints = points + comboBonus;

      setShotFeedbackText({
        text: feedback + (comboBonus ? ` (🔥 ${combo + 1}연속 콤보 +1점!)` : ''),
        type: isPerfect ? 'perfect' : 'good',
        points: finalPoints
      });
    } else {
      setShotFeedbackText({
        text: feedback,
        type: 'miss'
      });
    }

    // Next shot alternates between middle shot and layup
    setTimeout(() => {
      setCurrentShotType(prev => (prev === 'middle' ? 'layup' : 'middle'));
    }, 1100);
  };

  // Keyboard spacebar / Enter control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
        if (gameState === 'playing') {
          e.preventDefault();
          handleButtonDown();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
        if (gameState === 'playing') {
          e.preventDefault();
          handleButtonUp();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Main Canvas 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Court
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Court Background & Parquet
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Hardwood floor line
      const floorY = 380;
      const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
      floorGrad.addColorStop(0, '#78350f');
      floorGrad.addColorStop(0.2, '#92400e');
      floorGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorY, width, height - floorY);

      // Court parquet lines & 3-point key
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = 2;

      // Floor plank lines
      for (let y = floorY + 15; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Key paint zone & free throw arc
      ctx.beginPath();
      ctx.ellipse(640, floorY + 40, 180, 50, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Free throw circle
      ctx.beginPath();
      ctx.arc(420, floorY + 30, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Star court subtle ambient particles
      ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
      for (let i = 0; i < 15; i++) {
        const starX = (i * 55 + (Date.now() * 0.02) % width) % width;
        const starY = (i * 25) % (floorY - 60);
        ctx.fillRect(starX, starY, 2, 2);
      }

      // 2. Draw Basketball Hoop & Backboard
      const hoopX = 640;
      const hoopY = 160;
      const rimRadius = 26;

      // Pole & Base
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(hoopX + 60, height);
      ctx.lineTo(hoopX + 60, hoopY - 30);
      ctx.lineTo(hoopX + 30, hoopY);
      ctx.stroke();

      // Backboard (Glass with white target square)
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.strokeRect(hoopX + 22, hoopY - 80, 10, 110);
      ctx.fillRect(hoopX + 22, hoopY - 80, 10, 110);

      // Target square (백보드 사각형 겨냥점 - 중요한 교육적 요소!)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(hoopX + 22, hoopY - 35, 6, 45);

      // Glowing badge for layup targeting
      if (currentShotType === 'layup' && gameState === 'playing') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(hoopX + 22, hoopY - 35, 6, 45);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('🎯 겨냥점', hoopX + 35, hoopY - 15);
      }
      ctx.restore();

      // Orange Rim
      ctx.save();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(hoopX, hoopY, rimRadius, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Net (Dynamic flex physics)
      const ripple = Math.sin(netRippleRef.current) * 6;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      for (let i = -rimRadius + 2; i <= rimRadius - 2; i += 7) {
        ctx.beginPath();
        ctx.moveTo(hoopX + i, hoopY);
        ctx.quadraticCurveTo(hoopX + i * 0.4 + ripple, hoopY + 28, hoopX + i * 0.2 + ripple * 1.5, hoopY + 50);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Update & Draw Shot Meter while Holding
      if (isHoldingRef.current && gameState === 'playing') {
        const holdDuration = Date.now() - holdStartTimeRef.current;
        const maxMeterTime = currentShotType === 'middle' ? 1100 : 1000;
        const progress = Math.min(1, holdDuration / maxMeterTime);
        meterProgressRef.current = progress;

        // Player squat / Knee bend animation
        playerAnimRef.current.kneeBend = Math.min(1, progress * 1.3);
        if (currentShotType === 'layup') {
          playerAnimRef.current.driveProgress = Math.min(1, progress * 1.5);
        }

        // Draw curved shot meter above player
        const meterX = currentShotType === 'middle' ? 200 : 270 + playerAnimRef.current.driveProgress * 90;
        const meterY = 210;
        const meterW = 120;
        const meterH = 16;

        ctx.save();
        // Background track
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(meterX - meterW / 2, meterY, meterW, meterH, 8);
        ctx.fill();
        ctx.stroke();

        // Generous Good zone (~16% to ~88%)
        const goodStartX = (meterX - meterW / 2) + 0.16 * meterW;
        const goodWidth = 0.72 * meterW;
        ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
        ctx.fillRect(goodStartX, meterY + 2, goodWidth, meterH - 4);

        // Generous Perfect green zone (~35% to ~68%)
        const sweetStartX = (meterX - meterW / 2) + 0.35 * meterW;
        const sweetWidth = 0.33 * meterW;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sweetStartX, meterY + 2, sweetWidth, meterH - 4);

        // Active fill bar
        const fillW = progress * meterW;
        const isCurrentlySweet = progress >= 0.34 && progress <= 0.69;
        const isCurrentlyGood = progress >= 0.16 && progress <= 0.88;
        if (isCurrentlySweet !== isHoldingSweetRef.current) {
          isHoldingSweetRef.current = isCurrentlySweet;
          setIsHoldingSweet(isCurrentlySweet);
        }

        ctx.fillStyle = isCurrentlySweet ? '#4ade80' : isCurrentlyGood ? '#facc15' : '#f97316';
        ctx.beginPath();
        ctx.roundRect(meterX - meterW / 2, meterY + 1, fillW, meterH - 2, 7);
        ctx.fill();

        // Indicator Needle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((meterX - meterW / 2) + fillW - 2, meterY - 4, 4, meterH + 8);

        // Help label
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = isCurrentlySweet ? '#4ade80' : isCurrentlyGood ? '#facc15' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(
          isCurrentlySweet
            ? '★ 손 떼면 클린 슛! (PERFECT) ★'
            : isCurrentlyGood
            ? '★ 릴리스 득점권 ★'
            : currentShotType === 'middle'
            ? '무릎 굽히는 중...'
            : '도약 스텝 중...',
          meterX,
          meterY - 10
        );
        ctx.restore();
      }

      // 4. Draw Animated Basketball Player
      const playerX = currentShotType === 'middle'
        ? 180
        : 180 + (isHoldingRef.current ? playerAnimRef.current.driveProgress * 140 : 0);
      const playerBaseY = floorY;
      const kneeBendOffset = playerAnimRef.current.kneeBend * 14;

      // Handle jump in the air after release
      let jumpYOffset = 0;
      if (playerAnimRef.current.state === 'jump') {
        playerAnimRef.current.jumpProgress += 0.04;
        const j = playerAnimRef.current.jumpProgress;
        if (j < 1) {
          jumpYOffset = Math.sin(j * Math.PI) * 45;
        } else {
          playerAnimRef.current.state = 'idle';
          playerAnimRef.current.kneeBend = 0;
        }
      }

      const currentY = playerBaseY - jumpYOffset + (isHoldingRef.current ? kneeBendOffset : 0);

      // Player Shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      const shadowScale = Math.max(0.4, 1 - jumpYOffset / 60);
      ctx.beginPath();
      ctx.ellipse(playerX, floorY, 26 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Stylized Basketball Player Body
      ctx.save();
      // Legs / Knee bend
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';

      // Left leg
      ctx.beginPath();
      ctx.moveTo(playerX - 6, currentY - 40);
      ctx.lineTo(playerX - 12 - (isHoldingRef.current ? 6 : 0), currentY - 20);
      ctx.lineTo(playerX - 10, currentY);
      ctx.stroke();

      // Right leg (lifted knee if layup jump!)
      const isLayupJump = currentShotType === 'layup' && playerAnimRef.current.state === 'jump';
      ctx.beginPath();
      ctx.moveTo(playerX + 6, currentY - 40);
      if (isLayupJump) {
        // High knee lift (수직 도약 무릎 리프트!)
        ctx.lineTo(playerX + 20, currentY - 50);
        ctx.lineTo(playerX + 15, currentY - 25);
      } else {
        ctx.lineTo(playerX + 10 + (isHoldingRef.current ? 6 : 0), currentY - 20);
        ctx.lineTo(playerX + 12, currentY);
      }
      ctx.stroke();

      // Shoes
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(playerX - 14, currentY - 4, 12, 6);
      if (!isLayupJump) {
        ctx.fillRect(playerX + 8, currentY - 4, 12, 6);
      } else {
        ctx.fillRect(playerX + 12, currentY - 29, 10, 6);
      }

      // Torso / Jersey (Star Golden Jersey)
      const jerseyGrad = ctx.createLinearGradient(playerX, currentY - 75, playerX, currentY - 40);
      jerseyGrad.addColorStop(0, '#f59e0b');
      jerseyGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = jerseyGrad;
      ctx.beginPath();
      ctx.roundRect(playerX - 14, currentY - 75, 28, 35, 5);
      ctx.fill();

      // Jersey Number & Star
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeStudent ? String(activeStudent.number) : '7', playerX, currentY - 52);

      // Head
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(playerX, currentY - 86, 12, 0, Math.PI * 2);
      ctx.fill();

      // Hair & Headband
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(playerX, currentY - 90, 11, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8'; // Blue Headband
      ctx.fillRect(playerX - 11, currentY - 92, 22, 5);

      // Arms & Ball holding
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';

      if (ballRef.current.active) {
        // Follow-through release pose (팔로우 스로우 & 손목 스냅!)
        ctx.beginPath();
        ctx.moveTo(playerX + 8, currentY - 65);
        ctx.lineTo(playerX + 22, currentY - 95);
        ctx.lineTo(playerX + 30, currentY - 100); // wrist flick goose neck
        ctx.stroke();
      } else if (isHoldingRef.current) {
        // Holding set point / dip
        ctx.beginPath();
        ctx.moveTo(playerX - 8, currentY - 65);
        ctx.lineTo(playerX + 6, currentY - 70);
        ctx.lineTo(playerX + 16, currentY - 82);
        ctx.stroke();

        // Ball in hands
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(playerX + 18, currentY - 85, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        // Dribbling idle
        const dribbleY = Math.sin(Date.now() * 0.015) * 12;
        ctx.beginPath();
        ctx.moveTo(playerX + 8, currentY - 65);
        ctx.lineTo(playerX + 18, currentY - 45 + dribbleY);
        ctx.stroke();

        // Dribbling ball
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(playerX + 22, currentY - 20 + dribbleY * 1.5, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();

      // 5. Basketball in Air Physics & Trajectory
      if (ballRef.current.active) {
        const b = ballRef.current;
        b.currentFrame++;
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.44; // Matches trajectory calculation
        b.rotation += b.spin;

        // Sparkle trail
        particlesRef.current.push({
          x: b.x - b.vx * 0.4,
          y: b.y - b.vy * 0.4,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          color: b.isPerfect ? '#facc15' : '#fb923c',
          life: 1,
          size: Math.random() * 3 + 2
        });

        // Hoop interaction check
        const distToHoop = Math.hypot(b.x - hoopX, b.y - hoopY);
        const reachedFlightTarget = b.currentFrame >= b.totalFrames;
        const enteredHoopZone = distToHoop < 28 || (b.x >= hoopX - 12 && b.x <= hoopX + 22 && Math.abs(b.y - hoopY) <= 28);

        if (!b.inHoop && (reachedFlightTarget || enteredHoopZone)) {
          b.inHoop = true;
          if (b.willScore) {
            // Net swish ripple & snap cleanly through hoop center
            b.x = hoopX;
            b.y = hoopY;
            netRippleRef.current = 14;

            if (b.shotType === 'layup' && !b.isPerfect) {
              playSound('bank');
            } else {
              playSound('swish');
            }

            // Confetti / Sparks on basket
            for (let i = 0; i < 20; i++) {
              particlesRef.current.push({
                x: hoopX + (Math.random() - 0.5) * 20,
                y: hoopY + Math.random() * 15,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * -4 - 1,
                color: b.isPerfect ? '#facc15' : '#38bdf8',
                life: 1,
                size: Math.random() * 4 + 2
              });
            }

            // Score addition
            const comboBonus = combo >= 2 ? 1 : 0;
            const awardedPoints = b.points + comboBonus;
            setCurrentScore(prev => prev + awardedPoints);
            setMadeShots(prev => prev + 1);
            setCombo(prev => {
              const nextCombo = prev + 1;
              setMaxCombo(m => Math.max(m, nextCombo));
              return nextCombo;
            });

            if (b.shotType === 'middle') {
              setMiddleMade(prev => prev + 1);
            } else {
              setLayupMade(prev => prev + 1);
            }

            if (b.isPerfect) {
              setPerfectCount(prev => prev + 1);
            }

            // Deflect ball straight down through net
            b.vx = (Math.random() - 0.5) * 0.4;
            b.vy = 4.2;
          } else {
            // Missed! Rim bounce
            playSound('miss');
            setCombo(0);
            b.vx = -4.5;
            b.vy = -5.5;
          }
        }

        // Out of bounds reset
        if (b.y > floorY + 25 || b.x > width + 40 || b.x < -40) {
          b.active = false;
        }

        // Draw Ball
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation);

        // Orange sphere
        const ballGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
        ballGrad.addColorStop(0, '#fb923c');
        ballGrad.addColorStop(1, '#c2410c');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        // Basketball seams
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(11, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      // Net ripple dampening
      if (netRippleRef.current > 0) {
        netRippleRef.current -= 0.35;
      }

      // 6. Draw Particle Effects
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.035;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. On-Screen Current Shot Badge
      if (gameState === 'playing') {
        ctx.save();
        ctx.fillStyle = currentShotType === 'middle' ? 'rgba(56, 189, 248, 0.9)' : 'rgba(234, 179, 8, 0.9)';
        ctx.beginPath();
        ctx.roundRect(20, 20, 140, 32, 8);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(
          currentShotType === 'middle' ? '🏀 미들 점프슛' : '⚡ 돌파 레이업슛',
          90,
          41
        );
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, currentShotType, combo, playSound]);

  // Sort scores: Highest score first, no class distinction!
  const sortedScores = (gameScores || []).slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.madeShots !== a.madeShots) return b.madeShots - a.madeShots;
    if (b.perfectCount !== a.perfectCount) return b.perfectCount - a.perfectCount;
    return a.timestamp - b.timestamp;
  });

  const filteredScores = filterClassId === 'all'
    ? sortedScores
    : sortedScores.filter(s => s.classId === filterClassId);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 relative z-10 text-white">
      {/* Top Banner / Mode Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/90 border border-amber-500/30 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                게임 모드
              </span>
              <span className="text-xs text-slate-400 font-medium">원버튼 아케이드 슛 챌린지</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              버저빛터
              <span className="text-amber-400 text-sm font-semibold hidden sm:inline">BUZZER BEATER (60s)</span>
            </h1>
          </div>
        </div>

        {/* Sound toggle & Quick score info */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? '효과음 켜짐' : '음소거'}</span>
          </button>

          {gameState === 'playing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-bold text-sm">
              <Timer className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Court Section */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl">
        {/* Score & HUD Header during game */}
        {gameState === 'playing' && (
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
            {/* Left: Player info */}
            <div className="bg-slate-900/85 backdrop-blur-md px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border border-slate-700 text-[11px] sm:text-xs">
              <span className="text-slate-400">슈터: </span>
              <span className="font-bold text-amber-300">
                {activeStudent ? `${activeStudent.name}` : customStudentName || '익명 슈터'}
              </span>
            </div>

            {/* Center: Live Score & Combo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-slate-900/90 backdrop-blur-md px-3 sm:px-5 py-1 sm:py-2 rounded-xl sm:rounded-2xl border border-amber-500/40 shadow-lg text-center">
                <div className="text-[9px] sm:text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">SCORE</div>
                <div className="text-xl sm:text-3xl font-black text-amber-400 leading-tight">
                  {currentScore}
                </div>
              </div>

              {combo >= 2 && (
                <div className="bg-gradient-to-r from-orange-500 to-rose-600 text-white font-black px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-xl sm:rounded-2xl shadow-lg flex items-center gap-1 sm:gap-1.5 animate-bounce text-xs sm:text-sm">
                  <Flame className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  <span>{combo} COMBO!</span>
                </div>
              )}
            </div>

            {/* Right: Shots stats & remaining time */}
            <div className="bg-slate-900/85 backdrop-blur-md px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border border-slate-700 text-[11px] sm:text-xs text-right">
              <div className="text-amber-400 font-mono font-bold text-xs sm:text-sm flex items-center justify-end gap-1">
                <Timer className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>{timeLeft}s</span>
              </div>
              <div className="text-slate-300 font-medium hidden sm:block">
                {totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0}% ({madeShots}/{totalShots})
              </div>
            </div>
          </div>
        )}

        {/* Canvas Screen */}
        <canvas
          ref={canvasRef}
          width={800}
          height={440}
          className="w-full h-auto block select-none touch-none aspect-[800/440] object-contain"
        />

        {/* Floating Shot Feedback Overlay */}
        {shotFeedbackText && gameState === 'playing' && (
          <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-base border shadow-xl flex items-center gap-2 ${
                shotFeedbackText.type === 'perfect'
                  ? 'bg-amber-500/90 border-amber-300 text-slate-950 font-black'
                  : shotFeedbackText.type === 'good'
                  ? 'bg-sky-600/90 border-sky-300 text-white'
                  : 'bg-rose-900/90 border-rose-400 text-rose-200'
              }`}
            >
              {shotFeedbackText.text}
            </div>
          </div>
        )}

        {/* Interactive Controls Overlay during Play */}
        {gameState === 'playing' && (
          <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-white font-mono font-bold">SPACE</span>
              <span>또는</span>
              <span className="font-semibold text-amber-300">화면의 슛 버튼을 꾹 누르고 있다가 초록색 영역에서 떼세요!</span>
            </div>

            {/* GIANT ONE-BUTTON TOUCH / CLICK TARGET */}
            <button
              type="button"
              onMouseDown={handleButtonDown}
              onMouseUp={handleButtonUp}
              onTouchStart={handleButtonDown}
              onTouchEnd={handleButtonUp}
              className={`w-full sm:w-80 py-4 sm:py-5 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wide uppercase shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 select-none touch-manipulation ${
                isHoldingRef.current
                  ? isHoldingSweet
                    ? 'bg-gradient-to-r from-emerald-400 to-green-400 text-slate-950 ring-4 ring-emerald-400/60 shadow-emerald-500/50 animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 ring-4 ring-amber-400/50'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
              {isHoldingRef.current
                ? (isHoldingSweet ? '★ 지금 손을 떼세요! (PERFECT) ★' : '손을 떼면 슛!')
                : '슛 버튼 (꾹 누르고 있다가 떼기)'}
            </button>
          </div>
        )}

        {/* START / PLAYER SELECT SCREEN OVERLAY */}
        {gameState === 'select-player' && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="max-w-md w-full my-auto max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
                🏀
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">버저빛터 출전 선수</h2>
                <p className="text-xs text-slate-400 mt-1">
                  명예의 전당 랭킹에 기록될 본인의 학급과 이름을 선택하세요.
                </p>
              </div>

              {/* Class & Student dropdown */}
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">학급 선택</label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">선수(학생) 선택</label>
                  {currentClassStudents.length > 0 ? (
                    <select
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                    >
                      {currentClassStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.number}번 {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="이름 입력 (예: 강민준)"
                      value={customStudentName}
                      onChange={e => setCustomStudentName(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  )}
                </div>

                {/* Fixed 60 seconds time limit */}
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">경기 제한 시간</span>
                  </div>
                  <span className="text-xs font-black text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/30">
                    60초 (버저빛터 챌린지)
                  </span>
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
              >
                <Play className="w-5 h-5 fill-current" />
                슛 챌린지 시작하기!
              </button>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 text-left space-y-1">
                <p className="font-semibold text-amber-300">💡 게임 꿀팁 (체육 수업 연계):</p>
                <p>&bull; <strong>미들 점프슛:</strong> 버튼을 누르면 무릎 반동을 모으고, 초록색 영역에서 손을 떼면 클린 3점슛!</p>
                <p>&bull; <strong>돌파 레이업슛:</strong> 1-2 스텝 도약 타이밍에 맞춰 초록색 영역에서 손을 떼면 레이업 득점!</p>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN OVERLAY */}
        {gameState === 'game-over' && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="max-w-md w-full my-auto max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl space-y-4 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                <Timer className="w-3.5 h-3.5" />
                버저빛터 종료!
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">경기 결과 리포트</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {activeStudent ? `${activeStudent.name} (${activeStudent.number}번)` : customStudentName || '익명 슈터'} 학생의 최종 기록
                </p>
              </div>

              {/* Big Score Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/30 relative overflow-hidden shadow-inner">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">FINAL SCORE</div>
                <div className="text-4xl sm:text-5xl font-black text-amber-400 my-1">{currentScore}점</div>
                {recentRank && (
                  <div className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                    <Trophy className="w-4 h-4" />
                    전교 {recentRank}위 등극!
                  </div>
                )}
              </div>

              {/* Stats breakdown */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">성공률</div>
                  <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                    {totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-slate-500">{madeShots}/{totalShots}성공</div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">PERFECT 클린</div>
                  <div className="text-xs sm:text-sm font-bold text-amber-300 mt-0.5">{perfectCount}회</div>
                  <div className="text-[10px] text-slate-500">최고 타점 릴리스</div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">최대 콤보</div>
                  <div className="text-xs sm:text-sm font-bold text-rose-400 mt-0.5">{maxCombo}연속</div>
                  <div className="text-[10px] text-slate-500">온 파이어</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="flex-1 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  다시 도전하기
                </button>

                <button
                  type="button"
                  onClick={() => setGameState('select-player')}
                  className="px-4 py-3 sm:py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 cursor-pointer"
                >
                  선수 변경
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HALL OF FAME LEADERBOARD (전교 통합 순위표 - 학급 구분 없음!) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-black text-white">
                버저빛터 명예의 전당 <span className="text-amber-400 text-sm font-bold">(전교 통합 랭킹)</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              제한 시간 60초 내 최다 득점을 기록한 학생 순서대로 학급 구분 없이 실시간 집계됩니다.
            </p>
          </div>

          {/* Filter: All classes (default) or by specific class */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">순위 필터:</span>
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="all">🏆 전교 통합 순위 (학급 구분 없음)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} 학생만 보기
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Podium for TOP 3 */}
        {filteredScores.length >= 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {/* 1st Place */}
            {filteredScores[0] && (
              <div className="sm:order-2 p-5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-slate-950 border-2 border-amber-400/60 text-center relative overflow-hidden shadow-xl shadow-amber-500/10">
                <div className="absolute top-2 right-2">
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-md mb-2">
                  1
                </div>
                <div className="text-base font-black text-white">{filteredScores[0].studentName}</div>
                <div className="text-xs text-amber-300 font-medium">
                  {filteredScores[0].className || '일반 슈터'}
                </div>
                <div className="text-3xl font-black text-amber-400 mt-2">
                  {filteredScores[0].score}점
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  성공률 {filteredScores[0].totalShots > 0 ? Math.round((filteredScores[0].madeShots / filteredScores[0].totalShots) * 100) : 0}% &bull; PERFECT {filteredScores[0].perfectCount}회
                </div>
              </div>
            )}

            {/* 2nd Place */}
            {filteredScores[1] && (
              <div className="sm:order-1 p-5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-center relative overflow-hidden shadow-lg">
                <div className="w-9 h-9 mx-auto rounded-full bg-slate-300 text-slate-950 font-black text-base flex items-center justify-center shadow-md mb-2">
                  2
                </div>
                <div className="text-base font-bold text-white">{filteredScores[1].studentName}</div>
                <div className="text-xs text-slate-400">
                  {filteredScores[1].className || '일반 슈터'}
                </div>
                <div className="text-2xl font-black text-slate-200 mt-2">
                  {filteredScores[1].score}점
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  성공률 {filteredScores[1].totalShots > 0 ? Math.round((filteredScores[1].madeShots / filteredScores[1].totalShots) * 100) : 0}% &bull; 콤보 {filteredScores[1].maxCombo}회
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {filteredScores[2] && (
              <div className="sm:order-3 p-5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-center relative overflow-hidden shadow-lg">
                <div className="w-9 h-9 mx-auto rounded-full bg-amber-700 text-amber-100 font-black text-base flex items-center justify-center shadow-md mb-2">
                  3
                </div>
                <div className="text-base font-bold text-white">{filteredScores[2].studentName}</div>
                <div className="text-xs text-slate-400">
                  {filteredScores[2].className || '일반 슈터'}
                </div>
                <div className="text-2xl font-black text-amber-500 mt-2">
                  {filteredScores[2].score}점
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  성공률 {filteredScores[2].totalShots > 0 ? Math.round((filteredScores[2].madeShots / filteredScores[2].totalShots) * 100) : 0}% &bull; 콤보 {filteredScores[2].maxCombo}회
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Scrollable Table */}
        <div className="overflow-x-auto">
          {filteredScores.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
              아직 등록된 경기 점수가 없습니다. 첫 번째 버저빛터 챔피언에 도전해보세요!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="py-3 px-3 w-16 text-center">순위</th>
                  <th className="py-3 px-3">선수 이름</th>
                  <th className="py-3 px-3">소속 학급</th>
                  <th className="py-3 px-3 text-right">점수</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell">성공률</th>
                  <th className="py-3 px-3 text-right hidden md:table-cell">PERFECT</th>
                  <th className="py-3 px-3 text-right hidden md:table-cell">최대 콤보</th>
                  <th className="py-3 px-3 text-right text-slate-500 hidden lg:table-cell">기록 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredScores.map((scoreItem, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <tr
                      key={scoreItem.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isTop3 ? 'bg-amber-400/[0.02]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">{rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                        {scoreItem.studentName}
                        {scoreItem.studentNumber && (
                          <span className="text-xs text-slate-400 font-normal">({scoreItem.studentNumber}번)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {scoreItem.className || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-400 text-base">
                        {scoreItem.score}점
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 hidden sm:table-cell">
                        {scoreItem.totalShots > 0
                          ? `${Math.round((scoreItem.madeShots / scoreItem.totalShots) * 100)}% (${scoreItem.madeShots}/${scoreItem.totalShots})`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300 font-semibold hidden md:table-cell">
                        {scoreItem.perfectCount}회
                      </td>
                      <td className="py-3 px-3 text-right text-rose-400 font-semibold hidden md:table-cell">
                        {scoreItem.maxCombo}연속
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 text-xs hidden lg:table-cell">
                        {new Date(scoreItem.timestamp).toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
