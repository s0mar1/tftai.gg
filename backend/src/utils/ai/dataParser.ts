import { PlayerDeck } from '../../types/ai';

export function parsePlayerDeck(participant: any): PlayerDeck {
  const safeUnits = participant.units || [];
  const safeSynergies = (participant.traits || []).filter((t: any) => t.style > 0);

  return {
    placement: participant.placement || 0,
    eliminated: participant.eliminated || 0,
    goldLeft: participant.gold_left || 0,
    totalDamage: participant.total_damage_to_players || 0,
    units: safeUnits.map((unit: any) => ({
      name: unit.character_id || 'Unknown',
      tier: unit.tier || 1,
      items: unit.itemNames || []
    })),
    synergies: safeSynergies.map((trait: any) => ({
      name: trait.name || 'Unknown',
      numUnits: trait.num_units || 0,
      style: trait.style || 0,
      tierCurrent: trait.tier_current || 0
    }))
  };
}

export function formatPlayerDataForAI(playerDeck: PlayerDeck): string {
  const unitsText = playerDeck.units.map(unit => 
    `${unit.name} (${unit.tier}성) - 아이템: ${unit.items.join(', ') || '없음'}`
  ).join('\n');

  const synergiesText = playerDeck.synergies.map(trait => 
    `${trait.name} (${trait.tierCurrent}단계, ${trait.numUnits}유닛)`
  ).join('\n');

  return `
=== 플레이어 덱 정보 ===
순위: ${playerDeck.placement}등
골드: ${playerDeck.goldLeft}
총 피해량: ${playerDeck.totalDamage}

유닛 구성:
${unitsText}

시너지 구성:
${synergiesText}
  `.trim();
}

export function formatMetaDecksForAI(metaDecks: any[]): string {
  if (!metaDecks || metaDecks.length === 0) {
    return "현재 메타 덱 정보를 불러올 수 없습니다.";
  }

  return metaDecks.map((deck, index) => {
    const coreUnits = deck.coreUnits?.map((unit: any) => unit.name).join(', ') || '정보 없음';
    const winRate = deck.winRate || 0;
    const pickRate = deck.pickRate || 0;
    const avgPlacement = deck.averagePlacement || 0;

    return `
${index + 1}. ${deck.mainTraitName || '알 수 없는 덱'}
   - 핵심 유닛: ${coreUnits}
   - 승률: ${winRate}%
   - 픽률: ${pickRate}%
   - 평균 순위: ${avgPlacement}등
   - 게임 수: ${deck.totalGames || 0}게임
    `.trim();
  }).join('\n\n');
}

export function parseAIScores(aiResponse: string): { metaFit: number; deckCompletion: number; itemEfficiency: number; total: number } {
  const scoreRegex = /(\w+)\s*[:：]\s*(\d+(?:\.\d+)?)/g;
  const scores: any = {};
  let match;

  while ((match = scoreRegex.exec(aiResponse)) !== null) {
    const [, key, value] = match;
    if (!key || !value) continue;
    const normalizedKey = key.toLowerCase();
    
    if (normalizedKey.includes('meta') || normalizedKey.includes('메타')) {
      scores.metaFit = parseFloat(value);
    } else if (normalizedKey.includes('deck') || normalizedKey.includes('덱') || normalizedKey.includes('완성')) {
      scores.deckCompletion = parseFloat(value);
    } else if (normalizedKey.includes('item') || normalizedKey.includes('아이템') || normalizedKey.includes('효율')) {
      scores.itemEfficiency = parseFloat(value);
    } else if (normalizedKey.includes('total') || normalizedKey.includes('총') || normalizedKey.includes('전체')) {
      scores.total = parseFloat(value);
    }
  }

  // 기본값 설정 및 검증
  const metaFit = isNaN(scores.metaFit) ? 50 : Math.max(0, Math.min(100, scores.metaFit));
  const deckCompletion = isNaN(scores.deckCompletion) ? 50 : Math.max(0, Math.min(100, scores.deckCompletion));
  const itemEfficiency = isNaN(scores.itemEfficiency) ? 50 : Math.max(0, Math.min(100, scores.itemEfficiency));
  
  // 총점 계산 (AI가 제공하지 않은 경우 평균 계산)
  const total = isNaN(scores.total) ? 
    Math.round((metaFit + deckCompletion + itemEfficiency) / 3) : 
    Math.max(0, Math.min(100, scores.total));

  return { metaFit, deckCompletion, itemEfficiency, total };
}