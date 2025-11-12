/**
 * Riot 스타일 툴팁 파서
 * 라이엇 게임즈의 공식 툴팁 형식에 맞춰 데이터를 파싱하고 포맷팅
 */

interface ParsedTooltip {
  name: string;
  type: 'Active' | 'Passive';
  mana?: { start: number; cost: number };
  description: string[];  // 문단별로 분리된 설명
  variables: TooltipVariable[];
}

interface TooltipVariable {
  key: string;
  label: string;
  values: number[];
  isPercent: boolean;
  hasScaling: boolean;
  scalingType?: 'AP' | 'AD' | 'Health';
  formula?: string;
}

/**
 * 라이엇 스타일로 툴팁 텍스트 파싱
 */
export function parseRiotTooltip(ability: any): ParsedTooltip {
  const description = ability.desc || '';
  const variables = ability.variables || [];
  
  // 설명 문단 분리 (더 정교한 규칙)
  const paragraphs = splitIntoParagraphs(description);
  
  // 변수 파싱 및 정렬
  const parsedVariables = parseVariables(variables, description);
  
  return {
    name: ability.name || 'Unknown Ability',
    type: ability.abilityType || 'Active',
    mana: ability.manaCost ? {
      start: ability.manaStart || 0,
      cost: ability.manaCost
    } : undefined,
    description: paragraphs,
    variables: parsedVariables
  };
}

/**
 * 설명을 의미있는 문단으로 분리
 */
function splitIntoParagraphs(description: string): string[] {
  // 빈 줄로 구분
  let paragraphs = description.split(/\n\n+/);
  
  // 특정 키워드 뒤에서 분리
  const splitKeywords = [
    '이후',
    '추가로',
    '대신',
    '만약',
    '경우',
    '때마다'
  ];
  
  paragraphs = paragraphs.flatMap(para => {
    let result = [para];
    
    splitKeywords.forEach(keyword => {
      result = result.flatMap(p => {
        const parts = p.split(new RegExp(`\\.\\s*(?=${keyword})`));
        return parts.map(part => part.trim()).filter(part => part);
      });
    });
    
    return result;
  });
  
  // 플레이스홀더 정리
  return paragraphs.map(para => 
    para.replace(/@(\w+)@/g, (match, varName) => `[${varName}]`)
  );
}

/**
 * 변수 파싱 및 라벨링
 */
function parseVariables(variables: any[], description: string): TooltipVariable[] {
  const labelMap: Record<string, string> = {
    // 기본 데미지 관련
    'Damage': '피해량',
    'BaseDamage': '기본 피해량',
    'BonusDamage': '추가 피해량',
    'SecondaryDamage': '2차 피해량',
    'ThrowDamage': '던지기 피해량',
    'SplashDamage': '광역 피해량',
    'DOTDamage': '지속 피해량',
    
    // 유틸리티
    'Heal': '회복량',
    'HealAmount': '회복량',
    'Shield': '보호막',
    'ShieldAmount': '보호막 흡수량',
    
    // 상태이상
    'StunDuration': '기절 시간',
    'SlowAmount': '둔화율',
    'SlowDuration': '둔화 지속시간',
    'RootDuration': '속박 시간',
    'CharmDuration': '매혹 시간',
    
    // 버프/디버프
    'AttackSpeed': '공격 속도',
    'AttackSpeedBonus': '공격 속도 증가',
    'MoveSpeed': '이동 속도',
    'ArmorReduction': '방어력 감소',
    'MRReduction': '마법 저항력 감소',
    'DamageReduction': '피해 감소',
    
    // 기타
    'Duration': '지속시간',
    'Radius': '범위',
    'Range': '사거리',
    'ExecuteThreshold': '처형 기준값',
    'MaxStacks': '최대 중첩',
    'ChancePercent': '발동 확률'
  };
  
  const parsedVars: TooltipVariable[] = [];
  
  variables.forEach((variable, index) => {
    const varName = variable.name.replace(/@/g, '');
    
    // 설명에서 실제 사용되는 변수만 포함
    if (!description.includes(`@${varName}@`)) {
      return;
    }
    
    // 기본 라벨 결정
    let label = labelMap[varName];
    
    // 숫자가 붙은 변수 처리 (Damage1, Damage2 등)
    if (!label) {
      const baseVarName = varName.replace(/\d+$/, '');
      if (labelMap[baseVarName]) {
        const varNumber = varName.match(/(\d+)$/)?.[1];
        if (varNumber === '1') {
          label = labelMap[baseVarName];
        } else if (varNumber === '2') {
          label = `${labelMap[baseVarName]} (2차)`;
        } else if (varNumber === '3') {
          label = `${labelMap[baseVarName]} (3차)`;
        } else {
          label = `${labelMap[baseVarName]} ${varNumber}`;
        }
      }
    }
    
    // 여전히 라벨이 없으면 변수명 사용
    if (!label) {
      label = varName;
    }
    
    // 백분율 여부 확인
    const isPercent = varName.toLowerCase().includes('percent') ||
                     varName.toLowerCase().includes('ratio') ||
                     varName.toLowerCase().includes('chance') ||
                     varName.toLowerCase().includes('threshold') ||
                     varName.toLowerCase().includes('slow');
    
    // 스케일링 타입 확인
    let hasScaling = false;
    let scalingType: 'AP' | 'AD' | 'Health' | undefined;
    
    if (varName.toLowerCase().includes('ap')) {
      hasScaling = true;
      scalingType = 'AP';
    } else if (varName.toLowerCase().includes('ad')) {
      hasScaling = true;
      scalingType = 'AD';
    } else if (varName.toLowerCase().includes('health') || varName.toLowerCase().includes('hp')) {
      hasScaling = true;
      scalingType = 'Health';
    }
    
    // 값 추출 (1성, 2성, 3성)
    const values = [
      variable.value[1] || 0,
      variable.value[2] || 0,
      variable.value[3] || 0
    ];
    
    parsedVars.push({
      key: varName,
      label,
      values,
      isPercent,
      hasScaling,
      scalingType
    });
  });
  
  // 설명에 나타나는 순서대로 정렬
  parsedVars.sort((a, b) => {
    const posA = description.indexOf(`@${a.key}@`);
    const posB = description.indexOf(`@${b.key}@`);
    return posA - posB;
  });
  
  return parsedVars;
}

/**
 * 특수 케이스 처리 (브라움 예시)
 */
export function formatBraumStyle(ability: any): string {
  const parsed = parseRiotTooltip(ability);
  let result = '';
  
  // 헤더
  result += `${parsed.name}\n`;
  result += `${parsed.type === 'Active' ? '액티브' : '패시브'}\n`;
  result += '|\n';
  
  // 마나
  if (parsed.mana) {
    result += 'mp\n';
    result += `마나: ${parsed.mana.start}/${parsed.mana.cost}\n`;
  }
  
  // 설명
  parsed.description.forEach(para => {
    result += `${para}\n\n`;
  });
  
  // 변수값
  parsed.variables.forEach(variable => {
    const valueStr = variable.values.map(v => 
      variable.isPercent ? `${v}%` : String(v)
    ).join(' / ');
    
    result += `${variable.label}: ${valueStr}\n`;
  });
  
  return result.trim();
}