// AI 관련 타입 정의
export interface GradeInfo {
  grade: string;
  color: string;
  description: string;
}

export interface AIScores {
  metaFit: number;
  deckCompletion: number;
  itemEfficiency: number;
  total: number;
}

export interface AIComments {
  summary: string;
  scoreAnalysis: {
    metaFit: string;
    deckCompletion: string;
    itemEfficiency: string;
  };
  keyInsights: string[];
  improvements: string[];
  nextSteps: string;
  fullAnalysis: string;
}

export interface AIAnalysisResult {
  scores: AIScores;
  grade: GradeInfo;
  aiComments: AIComments;
  recommendations?: {
    positioning: string[];
    itemPriority: string[];
    synergies: string[];
  };
  comparison?: {
    vsAverage: string;
    vsTopPlayers: string;
  };
}

export interface FinalAnalysisResult {
  success: boolean;
  _error?: string;
  analysis: AIAnalysisResult;
  metadata: {
    analyzedAt: string;
    matchId: string;
    userPuuid: string;
    source: string;
    cacheHit: boolean;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PlayerUnit {
  name: string;
  tier: number;
  items: string[];
}

export interface PlayerTrait {
  name: string;
  numUnits: number;
  style: number;
  tierCurrent: number;
}

export interface PlayerDeck {
  placement: number;
  eliminated: number;
  goldLeft: number;
  totalDamage: number;
  units: PlayerUnit[];
  synergies: PlayerTrait[];
}

export interface AIRequestBody {
  matchId: string;
  userPuuid: string;
}

export interface QnARequestBody {
  question: string;
  history?: ChatMessage[];
}

export interface QnAResponse {
  success: boolean;
  error?: string;
  answer?: string;
  history?: ChatMessage[];
  metadata?: {
    answeredAt: string;
    cacheHit: boolean;
  };
}