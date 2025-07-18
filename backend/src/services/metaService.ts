import Match from '../models/Match';
import { PARTICIPANTS_PER_MATCH } from './constants';

interface PickRateResult {
  champion: string;
  pickCount: number;
  pickRate: number;
}

interface WinRateResult {
  champion: string;
  totalCount: number;
  winCount: number;
  winRate: number;
}

interface MongoAggregationResult {
  _id: string;
  count: number;
  champion: string;
}

interface MongoWinRateResult {
  _id: string;
  totalCount: number;
  winCount: number;
  winRate: number;
  champion: string;
}

export const calculatePickRates = async (): Promise<PickRateResult[]> => {
  const totalMatches = await Match.countDocuments();
  if (totalMatches === 0) return [];
  
  const agg = await Match.aggregate([
    { $unwind: '$participants' },
    { $group: { _id: '$participants.championName', count: { $sum: 1 } } },
    { $project: { _id: 0, champion: '$_id', pickCount: '$count' } }
  ]) as MongoAggregationResult[];
  
  return agg.map(item => ({
    champion: item.champion || item._id,
    pickCount: item.count,
    pickRate: parseFloat(((item.count / (totalMatches * PARTICIPANTS_PER_MATCH)) * 100).toFixed(2))
  }));
};

export const calculateWinRates = async (): Promise<WinRateResult[]> => {
  const agg = await Match.aggregate([
    { $unwind: '$participants' },
    { $group: {
      _id: '$participants.championName',
      totalCount: { $sum: 1 },
      winCount: { $sum: { $cond: ['$participants.win', 1, 0] } }
    }},
    { $project: {
      _id: 0,
      champion: '$_id',
      totalCount: 1,
      winCount: 1,
      winRate: { $round: [{ $multiply: [{ $divide: ['$winCount', '$totalCount'] }, 100] }, 2] }
    }}
  ]) as MongoWinRateResult[];
  
  return agg.map(item => ({
    champion: item.champion || item._id,
    totalCount: item.totalCount,
    winCount: item.winCount,
    winRate: item.winRate
  }));
};

export default {
  calculatePickRates,
  calculateWinRates
};