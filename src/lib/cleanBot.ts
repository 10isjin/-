/**
 * Shooting Star CleanBot (클린봇) System
 * Physical Education Class Safe Language Protection Engine
 * 욕설, 비속어, 성적 수치심 유발 표현, 집단 따돌림 및 혐오 표현 100% 사전 차단
 */

export interface CleanBotResult {
  isValid: boolean;
  category?: 'profanity' | 'sexual' | 'hate' | 'slur';
  matchedWord?: string;
  userMessage: string;
}

// 1. 욕설 및 비속어 (Profanity & Abusive Language)
const PROFANITY_PATTERNS = [
  /시[0-9_\-\.\s]*[발벌빨팔]/i,
  /씨[0-9_\-\.\s]*[발벌빨팔]/i,
  /ㅅ[0-9_\-\.\s]*ㅂ/i,
  /ㅆ[0-9_\-\.\s]*ㅂ/i,
  /tl[0-9_\-\.\s]*qkf/i,
  /sibal|ssibal|shibal/i,
  /병[0-9_\-\.\s]*[신씬]/i,
  /ㅂ[0-9_\-\.\s]*ㅅ/i,
  /지[0-9_\-\.\s]*[랄럴]/i,
  /ㅈ[0-9_\-\.\s]*ㄹ/i,
  /개[0-9_\-\.\s]*[새색][끼키]/i,
  /개[0-9_\-\.\s]*자[식숙]/i,
  /닥[0-9_\-\.\s]*[쳐처]/i,
  /미[0-9_\-\.\s]*[친칭]/i,
  /미[0-9_\-\.\s]*친[놈년]/i,
  /꺼[0-9_\-\.\s]*[져저]/i,
  /ㄲ[0-9_\-\.\s]*ㅈ/i,
  /존[0-9_\-\.\s]*[나너]/i,
  /졸[0-9_\-\.\s]*[라러]/i,
  /ㅈ[0-9_\-\.\s]*ㄴ/i,
  /조[0-9_\-\.\s]*[까까]/i,
  /좆|좃|좇/i,
  /씹|썅|섻/i,
  /새[0-9_\-\.\s]*[끼키]/i,
  /뒈[0-9_\-\.\s]*[져저]/i,
  /뒤[0-9_\-\.\s]*[져저]/i,
  /호[0-9_\-\.\s]*[로로][새자]/i,
  /염[0-9_\-\.\s]*병/i,
  /지[0-9_\-\.\s]*미/i,
  /니[0-9_\-\.\s]*[애에][미비]/i,
  /느[0-9_\-\.\s]*[금검][마매]/i,
  /엠[0-9_\-\.\s]*[창챙]/i,
  /애[0-9_\-\.\s]*[미비][창챙]/i
];

// 2. 성적 수치심 유발 및 음란 표현 (Sexual & Vulgar Terms)
const SEXUAL_PATTERNS = [
  /섹[0-9_\-\.\s]*[스쓰]/i,
  /야[0-9_\-\.\s]*[스쓰]/i,
  /sex|sexy|porn/i,
  /자[0-9_\-\.\s]*[지찌]/i,
  /보[0-9_\-\.\s]*[지찌]/i,
  /자[0-9_\-\.\s]*위/i,
  /딸[0-9_\-\.\s]*딸/i,
  /야[0-9_\-\.\s]*[동설]/i,
  /성[0-9_\-\.\s]*[기폭행관계희롱]/i,
  /강[0-9_\-\.\s]*간/i,
  /콘[0-9_\-\.\s]*돔/i,
  /유[0-9_\-\.\s]*[두방]/i,
  /가[0-9_\-\.\s]*슴[0-9_\-\.\s]*만/i,
  /엉[0-9_\-\.\s]*덩[0-9_\-\.\s]*이/i,
  /젖[0-9_\-\.\s]*[꼭탱]/i,
  /원[0-9_\-\.\s]*나[0-9_\-\.\s]*잇/i,
  /따[0-9_\-\.\s]*먹/i,
  /대[0-9_\-\.\s]*딸/i,
  /창[0-9_\-\.\s]*[녀년]/i,
  /걸[0-9_\-\.\s]*레[0-9_\-\.\s]*[년놈]/i,
  /노[0-9_\-\.\s]*[출브]/i,
  /팬[0-9_\-\.\s]*티/i
];

// 3. 인신공격, 괴롭힘 및 혐오 표현 (Hate & Bullying Speech)
const HATE_PATTERNS = [
  /장[0-9_\-\.\s]*[애애][우인]/i,
  /병[0-9_\-\.\s]*자/i,
  /찐[0-9_\-\.\s]*[따따]/i,
  /왕[0-9_\-\.\s]*[따따]/i,
  /자[0-9_\-\.\s]*살[0-9_\-\.\s]*해/i,
  /살[0-9_\-\.\s]*인/i,
  /극[0-9_\-\.\s]*단[0-9_\-\.\s]*적/i,
  /칼[0-9_\-\.\s]*빵/i,
  /피[0-9_\-\.\s]*떡/i,
  /틀[0-9_\-\.\s]*딱/i,
  /한[0-9_\-\.\s]*[남녀]충/i,
  /급[0-9_\-\.\s]*식[0-9_\-\.\s]*충/i
];

/**
 * Text normalization to prevent obfuscation bypasses:
 * - removes dots, dashes, underscores, and invisible characters
 * - normalizes multiple spaces
 */
export function normalizeCleanText(text: string): string {
  if (!text) return '';
  // Whitelist safe physical education basketball terminology to prevent accidental false positives (e.g. '릴리즈 시 팔로우 스루')
  const safeText = text
    .replace(/팔로우\s*스[루로우]+/g, '___followthru___')
    .replace(/팔로우/g, '___follow___')
    .replace(/팔꿈치/g, '___elbow___')
    .replace(/시\s*팔(?=[을에과도은는])/g, '시___arm___');

  return safeText
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width spaces
    .replace(/[._\-~`!@#$%^&*()+=[\]{}|;:'",<>/?\\]/g, '') // symbols between characters
    .replace(/\s+/g, ''); // all whitespace for compact analysis
}

/**
 * CleanBot validation test
 */
export function checkCleanBot(text: string): CleanBotResult {
  if (!text || typeof text !== 'string') {
    return { isValid: true, userMessage: '' };
  }

  const raw = text.trim();
  const safeRaw = raw
    .replace(/팔로우\s*스[루로우]+/g, '___followthru___')
    .replace(/팔로우/g, '___follow___')
    .replace(/팔꿈치/g, '___elbow___')
    .replace(/시\s*팔(?=[을에과도은는])/g, '시___arm___');
  const normalized = normalizeCleanText(safeRaw);

  // Check 1: Sexual terms (Highest Priority)
  for (const pattern of SEXUAL_PATTERNS) {
    if (pattern.test(safeRaw) || pattern.test(normalized)) {
      return {
        isValid: false,
        category: 'sexual',
        userMessage: '🚫 [클린봇 감지] 성적 수치심을 유발하거나 부적절한 표현이 포함되어 등록할 수 없습니다. 바르고 고운 체육 수업 언어를 사용해주세요.'
      };
    }
  }

  // Check 2: Profanity & swear words
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(safeRaw) || pattern.test(normalized)) {
      return {
        isValid: false,
        category: 'profanity',
        userMessage: '🚫 [클린봇 감지] 욕설이나 비속어가 포함되어 등록할 수 없습니다. 친구를 격려하고 응원하는 바른 말을 사용해주세요.'
      };
    }
  }

  // Check 3: Hate & severe bullying speech
  for (const pattern of HATE_PATTERNS) {
    if (pattern.test(raw) || pattern.test(normalized)) {
      return {
        isValid: false,
        category: 'hate',
        userMessage: '🚫 [클린봇 감지] 친구를 비하하거나 모욕하는 혐오 표현이 감지되어 등록할 수 없습니다. 서로를 존중하는 피드백을 남겨주세요.'
      };
    }
  }

  return { isValid: true, userMessage: '' };
}

/**
 * Safe Masking function: replaces any detected inappropriate substrings with ***
 */
export function maskCleanText(text: string): string {
  if (!text) return '';
  let result = text;

  const allPatterns = [...SEXUAL_PATTERNS, ...PROFANITY_PATTERNS, ...HATE_PATTERNS];
  for (const pattern of allPatterns) {
    result = result.replace(pattern, '***');
  }

  return result;
}
