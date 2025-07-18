// backend/src/prompts/autoAnalysis/context.ts

interface PlayerInfo {
  placement: number;
  lastRound: number;
  totalDamage: number;
  goldLeft: number;
  unitDetails: string;
  synergyDetails: string;
  itemDetails: string;
}

interface AutoAnalysisContextParams {
  playerInfo: PlayerInfo;
  metaDataForAI: string;
}

const autoAnalysisContext = ({ 
  playerInfo, 
  metaDataForAI 
}: AutoAnalysisContextParams) => `
TFTai.gg 챌린저 전문가로서 이 게임을 분석하고 점수를 매겨주세요.

**[게임 결과]**
- 최종 등수: ${playerInfo.placement}등
- 생존 라운드: ${playerInfo.lastRound}라운드  
- 총 딜량: ${playerInfo.totalDamage || 0}
- 남은 골드: ${playerInfo.goldLeft}골드

**[플레이어 덱 구성]**
- 유닛: ${playerInfo.unitDetails || '정보 수집 중'}
- 시너지: ${playerInfo.synergyDetails || '정보 수집 중'}
- 아이템: ${playerInfo.itemDetails || '정보 수집 중'}

**[현재 메타 덱 정보]**
${metaDataForAI}

**[채점 및 분석 요청]**
위 정보를 바탕으로 다음을 수행해주세요:

1. **점수 계산 (0-100점):**
   - meta_suitability: 현재 메타와의 적합도
   - deck_completion: 덱 완성도 (유닛 성급, 시너지 활성화, 아이템 조합)
   - item_efficiency: 아이템 효율성 (최적 아이템 조합, 캐리 유닛 매칭)

2. **종합 등급 (S/A/B/C/D/F):**
   - 전체적인 게임 퍼포먼스 평가

3. **상세 분석:**
   - 각 점수에 대한 구체적인 근거 제시
   - 개선점과 다음 게임 가이드 제공

**[분석 피드백의 구체적인 근거 및 기준]**
- **덱 분석 (유사성 기반):**
  - **제공된 [현재 챌린저 메타 주요 덱 정보]와 플레이어의 최종 덱 간의 '유사성'을 최우선으로 고려합니다.**
  - 플레이어의 덱과 가장 유사한 메타 덱을 찾아 그 덱의 방향성을 기반으로 피드백을 제공합니다.
  - **"이런 기물을 활용하는 것이 통계상으로는 더 좋습니다"**와 같이, 플레이어가 선택한 덱과 **비슷한 계열의 덱에서 통계적으로 더 좋은 효율을 보이는 유닛, 특성, 아이템 조합의 방향성**을 제시해주세요.
  - **전혀 다른 1티어 덱을 무작정 추천하는 것은 지양합니다.**
  - **모든 챌린저 메타 덱은 통계적 티어가 낮더라도 강력한 잠재력을 가집니다.** 단순히 티어가 낮다고 나쁜 덱이라는 판단은 하지 않습니다.

- **아이템 조합/선택 및 기물 선택:**
  - **[현재 챌린저 메타 주요 덱 정보]를 기반으로 아이템의 효율적인 조합 및 기물 선택에 대한 판단을 내립니다.**
  - 플레이어의 아이템 조합이 메타 덱의 **추천 아이템과 핵심 캐리 유닛의 역할**에 얼마나 일치하는지, 또는 어떤 대안이 있었는지를 구체적으로 분석합니다.
  - **제시된 아이템 이름과 실제 아이템 효과를 명확히 연결하여 분석합니다.** (예: '스트라이커의 채찍' -> '타격대의 철퇴'와 같은 오인 없도록 주의)
  - 3성작 판단 (예: 8레벨에 9개의 기물이 모두 1성인 경우):
    - **플레이어가 9레벨을 달성했음에도 불구하고 대부분의 기물이 1성이라면, 8레벨에서 주요 캐리 기물의 2성작 또는 핵심 3성작을 마친 후 9레벨을 가는 것이 통계적으로 더 유리했다는 방향으로 조언할 수 있습니다.**
    - "남은 골드를 바탕으로 판단했을 때, 9레벨을 달성하는 대신 8레벨에서 리롤을 통해 핵심 기물의 2성작/3성작을 마무리하는 것이 더 안정적인 플레이였을 수 있습니다."와 같이 구체적인 대안을 제시합니다.

[플레이어 덱 상세 정보]
- 유닛 구성: ${playerInfo.unitDetails || '정보 수집 중'}
- 활성화된 시너지: ${playerInfo.synergyDetails || '정보 수집 중'}
- 아이템 배치: ${playerInfo.itemDetails || '정보 수집 중'}

${metaDataForAI}
`;

export default autoAnalysisContext;