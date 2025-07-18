/**
 * tooltipParser.ts: Community Dragon TFT 데이터 파싱을 위한 핵심 엔진
 * 이 모듈은 챔피언에 독립적인 범용 파싱 유틸리티를 제공합니다.
 * - 플레이스홀더(@Var@)를 실제 값으로 대체
 * - AD, AP, 체력 등 능력치 기반 스케일링 계산
 * - 별 레벨에 따른 값 포맷팅 (예: "100 / 150 / 200")
 */

/**
 * 플레이스홀더를 찾기 위한 정규식. @Var@ 및 {@Var@} 형식을 처리합니다.
 */
const PLACEHOLDER_REGEX = /\{?@[a-zA-Z0-9]+@\}?/g;

// 변수 타입
interface Variable {
  name: string;
  value: number[];
}

// 챔피언 능력치 타입
interface ChampionStats {
  health: number;
  damage: number;
  ap: number;
  armor: number;
  attackSpeed: number;
  mana: number;
  [key: string]: number; // 추가 능력치 허용
}

// 구조화된 값 타입
interface StructuredValue {
  label: string;
  value: string;
  scaling: 'AP' | 'AD' | null;
}

// 스케일링 타입
type ScalingType = 'AP' | 'AD' | 'Health' | null;

/**
 * 변수 배열을 이름으로 쉽게 찾을 수 있는 맵으로 변환합니다.
 * @param variables - 챔피언 능력의 variables 배열
 * @returns 변수 이름을 키로 하는 맵
 */
export function buildVariableMap(variables: Variable[]): Map<string, Variable> {
    const map = new Map<string, Variable>();
    if (!variables) return map;
    
    variables.forEach(variable => {
        // '@' 문자를 제거하여 순수한 이름으로 저장 (예: '@Damage@' -> 'Damage')
        const cleanName = variable.name.replace(/@/g, '');
        map.set(cleanName.toLowerCase(), variable);
    });
    return map;
}

/**
 * 별 레벨에 따라 값을 포맷팅합니다. (예: [100, 150, 200] -> "100 / 150 / 200")
 * 값이 백분율인지 확인하여 '%'를 추가합니다.
 * @param values - 별 레벨별 값 배열
 * @param isPercent - 값이 백분율인지 여부
 * @returns 포맷팅된 문자열
 */
export function formatValuesByStar(values: number[], isPercent: boolean = false): string {
    if (!Array.isArray(values) || values.length === 0) {
        return isPercent ? '0%' : '0';
    }
    // 0번째 인덱스는 무시하고, 1, 2, 3성 값만 사용 (필요에 따라 조정 가능)
    const relevantValues = values.slice(1);
    return relevantValues.map(v => `${Math.round(v * 100) / 100}${isPercent ? '%' : ''}`).join(' / ');
}

/**
 * 스킬 설명에서 플레이스홀더를 계산된 값으로 대체합니다.
 * @param description - @Var@ 플레이스홀더를 포함한 원시 스킬 설명
 * @param varMap - 변수 맵
 * @param championStats - 챔피언의 기본 능력치
 * @returns 플레이스홀더가 대체된 최종 스킬 설명
 */
export function replacePlaceholders(
    description: string, 
    varMap: Map<string, Variable>, 
    _championStats: ChampionStats
): string {
    if (!description) return '';

    return description.replace(PLACEHOLDER_REGEX, (match) => {
        const varName = match.replace(/[{}@]/g, '').toLowerCase();
        const variable = varMap.get(varName);

        if (!variable) {
            console.warn(`Warning: Variable ${match} not found in varMap.`);
            return `[?]`; // 변수를 찾을 수 없을 때의 폴백
        }

        // TODO: 더 복잡한 스케일링 로직을 위해 calculateValue 함수와 연동 필요
        // 현재는 단순 값 포맷팅만 수행
        const isPercent = varName.includes('percent') || varName.includes('ratio');
        return formatValuesByStar(variable.value, isPercent);
    });
}

/**
 * 툴팁 생성을 위한 모든 변수 정보를 구조화된 형식으로 추출합니다.
 * @param variables - 챔피언 능력의 variables 배열
 * @param description - 스킬 설명
 * @returns 각 변수에 대한 라벨과 포맷팅된 값을 포함하는 객체 배열
 */
export function getStructuredValues(variables: Variable[], description: string): StructuredValue[] {
    const structured: StructuredValue[] = [];
    if (!variables) return structured;

    const labelMap: Record<string, string> = {
        Damage: '피해량',
        Heal: '체력 회복량',
        Shield: '보호막 흡수량',
        Duration: '지속 시간',
        StunDuration: '기절 지속 시간',
        AttackSpeed: '공격 속도',
        ADRatio: '공격력 계수',
        APRatio: '주문력 계수',
        Health: '체력',
    };

    variables.forEach(variable => {
        const cleanName = variable.name.replace(/@/g, '');
        // 설명에 해당 변수가 실제로 사용되었는지 확인하여 연관성 있는 데이터만 추출
        if (description && description.includes(variable.name)) {
            const isPercent = cleanName.toLowerCase().includes('percent') || cleanName.toLowerCase().includes('ratio');
            const scaling: ScalingType = cleanName.toLowerCase().includes('ap') ? 'AP' : 
                                       (cleanName.toLowerCase().includes('ad') ? 'AD' : null);
            
            structured.push({
                label: labelMap[cleanName] || cleanName, // 미리 정의된 라벨 사용, 없으면 변수명 그대로
                value: formatValuesByStar(variable.value, isPercent),
                scaling
            });
        }
    });
    return structured;
}