import { ShotType, FeedbackItem, AiEvaluation, MIDDLE_SHOT_CRITERIA, LAYUP_SHOT_CRITERIA } from '../types';

export function generateClientAiFeedback(
  performerId: string,
  performerName: string,
  shotType: ShotType,
  studentFeedbacks: FeedbackItem[]
): AiEvaluation {
  const criteriaList = shotType === 'middle' ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;

  // Aggregate stats across received peer & teacher feedbacks
  const total = studentFeedbacks.length;
  const goodCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const badCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let totalStars = 0;

  studentFeedbacks.forEach(fb => {
    totalStars += fb.stars || 0;
    if (fb.criteriaResults) {
      Object.entries(fb.criteriaResults).forEach(([cidStr, val]) => {
        const cid = Number(cidStr);
        if (val === 'good') goodCounts[cid] = (goodCounts[cid] || 0) + 1;
        if (val === 'bad') badCounts[cid] = (badCounts[cid] || 0) + 1;
      });
    }
  });

  const avgStars = total > 0 ? totalStars / total : 2;
  const overallGrade: '우수' | '보통' | '노력요함' =
    avgStars >= 2.5 ? '우수' : avgStars >= 1.8 ? '보통' : '노력요함';

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionTips: string[] = [];

  const criteriaAnalysis = criteriaList.map(crit => {
    const goods = goodCounts[crit.id] || 0;
    const bads = badCounts[crit.id] || 0;
    const evaluated = goods + bads;

    let status: '잘함' | '보완필요' | '판단보류' = '판단보류';
    let detail = '';

    if (evaluated === 0) {
      status = '판단보류';
      detail = `아직 동료들의 구체적인 '${crit.shortName}' 항목 평가가 부족합니다. 집중 관찰을 요청해보세요.`;
    } else if (goods >= bads) {
      status = '잘함';
      detail = `동료 ${goods}명이 '${crit.shortName}'(${crit.focusArea}) 동작이 매우 안정적이고 자연스럽다고 평가했습니다.`;
      strengths.push(`${crit.shortName} (${crit.focusArea})`);
    } else {
      status = '보완필요';
      detail = `동료 ${bads}명이 '${crit.shortName}' 동작에서 보완이 필요하다고 보았습니다. (${crit.commonMistake})`;
      weaknesses.push(`${crit.shortName} 보완 요망`);
      actionTips.push(`[${crit.shortName}] ${crit.text} (${crit.focusArea}에 신경 쓰기)`);
    }

    return {
      criterionId: crit.id,
      criterionTitle: crit.shortName,
      status,
      detail
    };
  });

  if (strengths.length === 0) {
    strengths.push('슛을 시도하는 자신감과 적극적인 슛 릴리스 시도');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('실전 수비수를 마주했을 때의 일정한 슛 릴리스 타이밍 유지');
  }
  if (actionTips.length === 0) {
    if (shotType === 'middle') {
      actionTips.push('슛 직전 무릎 굽힘과 림을 향한 팔로우 스로우 팔 뻗음을 한 동작처럼 연결하세요.');
    } else {
      actionTips.push('오른손 레이업 시 오른발-왼발 1-2 스텝 후 백보드 사각형 상단 코너를 부드럽게 맞추세요.');
    }
  }

  const shotName = shotType === 'middle' ? '미들 점프슛' : '돌파 레이업슛';
  const summary = `${performerName} 학생의 ${shotName} 분석 결과: 총 ${total}건의 동료 및 교사 피드백(평균 ${avgStars.toFixed(1)}성)을 종합 분석한 생체역학 코칭 리포트입니다.`;

  return {
    performerId,
    shotType,
    overallGrade,
    summary,
    strengths,
    weaknesses,
    actionTips,
    criteriaAnalysis,
    generatedAt: Date.now()
  };
}
