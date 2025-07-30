import { Router } from 'express';
import { PowerSnax, PowerUp, ApiResponse } from '../types';
import logger from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Mock 데이터 (실제로는 Community Dragon API나 데이터베이스에서 가져와야 함)
const mockPowerSnaxData: PowerSnax[] = [
  {
    id: 'power-snax-round-1-3',
    name: 'Early Game Power',
    description: 'Choose a Power Up for your unit at Round 1-3',
    round: '1-3',
    powerUps: [
      {
        id: 'stats-boost-1',
        name: 'Stat Boost',
        description: 'Increases all stats by 10%',
        type: 'stats',
        effects: [
          {
            stat: 'health',
            value: 10,
            description: '+10% Health',
            duration: 'permanent'
          },
          {
            stat: 'damage',
            value: 10,
            description: '+10% Attack Damage',
            duration: 'permanent'
          }
        ]
      },
      {
        id: 'ability-enhance-1',
        name: 'Ability Enhancement',
        description: 'Reduces ability mana cost by 20',
        type: 'ability',
        effects: [
          {
            stat: 'mana',
            value: -20,
            description: '-20 Max Mana',
            duration: 'permanent'
          }
        ]
      },
      {
        id: 'trait-boost-1',
        name: 'Trait Synergy',
        description: 'Unit counts as 2 for their primary trait',
        type: 'trait',
        effects: [
          {
            description: 'Counts as 2 units for primary trait',
            duration: 'permanent'
          }
        ]
      }
    ]
  },
  {
    id: 'power-snax-round-3-6',
    name: 'Mid Game Power',
    description: 'Choose a Power Up for your unit at Round 3-6',
    round: '3-6',
    powerUps: [
      {
        id: 'stats-boost-2',
        name: 'Major Stat Boost',
        description: 'Increases all stats by 25%',
        type: 'stats',
        effects: [
          {
            stat: 'health',
            value: 25,
            description: '+25% Health',
            duration: 'permanent'
          },
          {
            stat: 'damage',
            value: 25,
            description: '+25% Attack Damage',
            duration: 'permanent'
          },
          {
            stat: 'attackSpeed',
            value: 25,
            description: '+25% Attack Speed',
            duration: 'permanent'
          }
        ]
      },
      {
        id: 'special-power-1',
        name: 'Omnivamp',
        description: 'Gain 30% Omnivamp',
        type: 'special',
        effects: [
          {
            description: '30% Omnivamp (heals for 30% of damage dealt)',
            duration: 'permanent'
          }
        ]
      },
      {
        id: 'special-power-2',
        name: 'True Damage',
        description: 'Convert 50% of damage to True Damage',
        type: 'special',
        effects: [
          {
            description: '50% of damage dealt is converted to True Damage',
            duration: 'permanent'
          }
        ]
      }
    ]
  }
];

/**
 * @swagger
 * /api/power-snax:
 *   get:
 *     summary: Get Power Snax options
 *     tags: [Power Snax]
 *     parameters:
 *       - in: query
 *         name: round
 *         schema:
 *           type: string
 *           enum: ['1-3', '3-6']
 *         description: Filter by specific round
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [ko, en, ja, zh]
 *         description: Language for localized content
 *     responses:
 *       200:
 *         description: Power Snax data
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
 *                     $ref: '#/components/schemas/PowerSnax'
 */
router.get('/', asyncHandler(async (req, res) => {
  const { round, language = 'ko' } = req.query;
  
  try {
    let powerSnaxData = [...mockPowerSnaxData];
    
    // 라운드별 필터링
    if (round && typeof round === 'string') {
      powerSnaxData = powerSnaxData.filter(ps => ps.round === round);
    }
    
    // TODO: 실제 구현 시 언어별 번역 처리
    // 현재는 mock 데이터 그대로 반환
    
    logger.info('Power Snax 데이터 조회 성공', { 
      round, 
      language,
      count: powerSnaxData.length 
    });
    
    const response: ApiResponse<PowerSnax[]> = {
      success: true,
      data: powerSnaxData
    };
    
    res.json(response);
    return;
  } catch (error) {
    logger.error('Power Snax 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

/**
 * @swagger
 * /api/power-snax/{powerSnaxId}/power-ups:
 *   get:
 *     summary: Get Power Ups for specific Power Snax
 *     tags: [Power Snax]
 *     parameters:
 *       - in: path
 *         name: powerSnaxId
 *         required: true
 *         schema:
 *           type: string
 *         description: Power Snax ID
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [ko, en, ja, zh]
 *         description: Language for localized content
 *     responses:
 *       200:
 *         description: Power Ups data
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
 *                     $ref: '#/components/schemas/PowerUp'
 */
router.get('/:powerSnaxId/power-ups', asyncHandler(async (req, res) => {
  const { powerSnaxId } = req.params;
  const { language = 'ko' } = req.query;
  
  try {
    const powerSnax = mockPowerSnaxData.find(ps => ps.id === powerSnaxId);
    
    if (!powerSnax) {
      return res.status(404).json({
        success: false,
        error: 'Power Snax not found'
      });
    }
    
    logger.info('Power Ups 조회 성공', { 
      powerSnaxId,
      language,
      count: powerSnax.powerUps.length 
    });
    
    const response: ApiResponse<PowerUp[]> = {
      success: true,
      data: powerSnax.powerUps
    };
    
    res.json(response);
    return;
  } catch (error) {
    logger.error('Power Ups 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}));

export default router;