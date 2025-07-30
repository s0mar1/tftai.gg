import { Router } from 'express';
import { ApiResponse } from '../types';
import logger from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

export interface UnitRole {
  id: string;
  name: string;
  description: string;
  icon?: string;
  passive: string;
  champions?: string[]; // API names of champions with this role
}

// 유닛 롤 데이터 (Set 15 기준)
const unitRolesData: UnitRole[] = [
  {
    id: 'tank',
    name: 'Tank',
    description: 'Frontline units that absorb damage',
    passive: 'Generate 2 Mana when taking damage. More likely to be targeted by enemies.',
    champions: [] // 실제 데이터는 Community Dragon API에서 가져와야 함
  },
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'Balanced units with sustain',
    passive: 'Have 8-20% Omnivamp based on game stage (8% at Stage 2, 12% at Stage 3, 16% at Stage 4, 20% at Stage 5+).',
    champions: []
  },
  {
    id: 'assassin',
    name: 'Assassin',
    description: 'High damage backline divers',
    passive: 'Less likely to be targeted by enemies.',
    champions: []
  },
  {
    id: 'caster',
    name: 'Caster',
    description: 'Ability-focused units',
    passive: 'Generate 2 Mana each second.',
    champions: []
  },
  {
    id: 'specialist',
    name: 'Specialist',
    description: 'Unique units with special mechanics',
    passive: 'Generate resources in a unique way specific to each champion.',
    champions: []
  },
  {
    id: 'marksman',
    name: 'Marksman',
    description: 'Ranged physical damage dealers',
    passive: 'Gain 10% Attack Speed after each attack, stacking up to 5 times.',
    champions: []
  }
];

// 롤별 패시브 효과 상세 정보
export interface RolePassiveEffect {
  roleId: string;
  stage?: number;
  effect: {
    type: string;
    value: number | string;
    description: string;
  };
}

const rolePassiveEffects: RolePassiveEffect[] = [
  // Tank
  {
    roleId: 'tank',
    effect: {
      type: 'manaOnDamage',
      value: 2,
      description: 'Gain 2 Mana when taking damage'
    }
  },
  {
    roleId: 'tank',
    effect: {
      type: 'targetPriority',
      value: 'increased',
      description: 'More likely to be targeted'
    }
  },
  // Fighter - Stage별 Omnivamp
  {
    roleId: 'fighter',
    stage: 2,
    effect: {
      type: 'omnivamp',
      value: 8,
      description: '8% Omnivamp at Stage 2'
    }
  },
  {
    roleId: 'fighter',
    stage: 3,
    effect: {
      type: 'omnivamp',
      value: 12,
      description: '12% Omnivamp at Stage 3'
    }
  },
  {
    roleId: 'fighter',
    stage: 4,
    effect: {
      type: 'omnivamp',
      value: 16,
      description: '16% Omnivamp at Stage 4'
    }
  },
  {
    roleId: 'fighter',
    stage: 5,
    effect: {
      type: 'omnivamp',
      value: 20,
      description: '20% Omnivamp at Stage 5+'
    }
  },
  // Assassin
  {
    roleId: 'assassin',
    effect: {
      type: 'targetPriority',
      value: 'decreased',
      description: 'Less likely to be targeted'
    }
  },
  // Caster
  {
    roleId: 'caster',
    effect: {
      type: 'manaRegen',
      value: 2,
      description: 'Generate 2 Mana per second'
    }
  },
  // Marksman
  {
    roleId: 'marksman',
    effect: {
      type: 'attackSpeedStack',
      value: 10,
      description: '+10% Attack Speed per attack (max 5 stacks)'
    }
  }
];

/**
 * @swagger
 * /api/unit-roles:
 *   get:
 *     summary: Get all unit roles
 *     tags: [Unit Roles]
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [ko, en, ja, zh]
 *         description: Language for localized content
 *     responses:
 *       200:
 *         description: Unit roles data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UnitRole'
 */
router.get('/', asyncHandler(async (req, res) => {
  const { language = 'ko' } = req.query;
  
  try {
    // TODO: 실제 구현 시 언어별 번역 처리
    // TODO: Community Dragon API에서 실제 챔피언 롤 데이터 가져오기
    
    logger.info('유닛 롤 데이터 조회 성공', { 
      language,
      count: unitRolesData.length 
    });
    
    const response: ApiResponse<UnitRole[]> = {
      success: true,
      data: unitRolesData
    };
    
    res.json(response);
    return;
  } catch (error) {
    logger.error('유닛 롤 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/unit-roles/{roleId}:
 *   get:
 *     summary: Get specific unit role details
 *     tags: [Unit Roles]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID (tank, fighter, assassin, caster, specialist, marksman)
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [ko, en, ja, zh]
 *         description: Language for localized content
 *     responses:
 *       200:
 *         description: Unit role details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UnitRole'
 */
router.get('/:roleId', asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { language = 'ko' } = req.query;
  
  try {
    const role = unitRolesData.find(r => r.id === roleId);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Unit role not found'
      });
    }
    
    logger.info('유닛 롤 상세 조회 성공', { 
      roleId,
      language
    });
    
    const response: ApiResponse<UnitRole> = {
      success: true,
      data: role
    };
    
    res.json(response);
    return;
  } catch (error) {
    logger.error('유닛 롤 상세 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/unit-roles/{roleId}/effects:
 *   get:
 *     summary: Get role passive effects
 *     tags: [Unit Roles]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *       - in: query
 *         name: stage
 *         schema:
 *           type: number
 *         description: Game stage (for stage-dependent effects like Fighter omnivamp)
 *     responses:
 *       200:
 *         description: Role passive effects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RolePassiveEffect'
 */
router.get('/:roleId/effects', asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { stage } = req.query;
  
  try {
    let effects = rolePassiveEffects.filter(e => e.roleId === roleId);
    
    // stage가 지정된 경우 해당 stage의 효과만 반환
    if (stage && !isNaN(Number(stage))) {
      const stageNum = Number(stage);
      effects = effects.filter(e => !e.stage || e.stage === stageNum);
      
      // Fighter의 경우 stage에 따른 omnivamp 값 결정
      if (roleId === 'fighter' && effects.length === 0) {
        const omnivampValue = stageNum >= 5 ? 20 : 
                            stageNum === 4 ? 16 : 
                            stageNum === 3 ? 12 : 8;
        effects = [{
          roleId: 'fighter',
          stage: stageNum,
          effect: {
            type: 'omnivamp',
            value: omnivampValue,
            description: `${omnivampValue}% Omnivamp at Stage ${stageNum >= 5 ? '5+' : stageNum}`
          }
        }];
      }
    }
    
    logger.info('롤 패시브 효과 조회 성공', { 
      roleId,
      stage,
      count: effects.length
    });
    
    const response: ApiResponse<RolePassiveEffect[]> = {
      success: true,
      data: effects
    };
    
    res.json(response);
    return;
  } catch (error) {
    logger.error('롤 패시브 효과 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

export default router;