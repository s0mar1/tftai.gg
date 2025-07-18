import DeckGuide from '../models/DeckGuide';
import { ControllerHandler, ApiResponse } from '../types/express';

// @desc    모든 덱 공략 조회
// @route   GET /api/guides
// @access  Public
export const getDeckGuides: ControllerHandler = async (_req, _res, _next) => {
  try {
    const guides = await DeckGuide.find().sort({ createdAt: -1 });
    const response: ApiResponse<any[]> = { 
      success: true, 
      count: guides.length, 
      data: guides 
    };
    _res.status(200).json(response);
  } catch (_err) {
    _next(_err);
  }
};

// @desc    특정 덱 공략 조회
// @route   GET /api/guides/:id
// @access  Public
export const getDeckGuide: ControllerHandler = async (_req, _res, _next) => {
  try {
    const guide = await DeckGuide.findById(_req.params.id);
    if (!guide) {
      return _next(Object.assign(new Error('해당 ID의 공략을 찾을 수 없습니다.'), { statusCode: 404 }));
    }
    const response: ApiResponse<any> = { 
      success: true, 
      data: guide 
    };
    _res.status(200).json(response);
  } catch (_err) {
    _next(_err);
  }
};

// @desc    새 덱 공략 생성
// @route   POST /api/guides
// @access  Private (추후 인증 추가 필요)
export const createDeckGuide: ControllerHandler = async (_req, _res, _next) => {
  try {
    const guide = await DeckGuide.create(_req.body);
    const response: ApiResponse<any> = { 
      success: true, 
      data: guide 
    };
    _res.status(201).json(response);
  } catch (_err) {
    _next(_err);
  }
};