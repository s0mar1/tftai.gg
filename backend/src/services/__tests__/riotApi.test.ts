import { jest } from '@jest/globals';
import axios from 'axios';
import { 
  getAccountByRiotId, 
  getSummonerByPuuid, 
  getMatchIdsByPUUID, 
  getMatchDetail,
  getLeagueEntriesByPuuid 
} from '../riotApi';
import { RiotApiError } from '../../utils/errors';

// Spy on axios.get
let axiosGetSpy: jest.SpiedFunction<typeof axios.get>;

describe('RiotApi Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RIOT_API_KEY = 'test-api-key';
    axiosGetSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    axiosGetSpy.mockRestore();
  });

  describe('getAccountByRiotId', () => {
    it('should return account data for valid riot id', async () => {
      const mockAccountData = { puuid: 'test-puuid' };
      axiosGetSpy.mockResolvedValue({ data: mockAccountData });

      const result = await getAccountByRiotId('TestUser', 'KR1', 'asia');
      
      expect(result).toEqual(mockAccountData);
      expect(axiosGetSpy).toHaveBeenCalledWith(
        'https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/TestUser/KR1',
        expect.any(Object)
      );
    });

    test('should throw error on 404', async () => {
      const mockError = { 
        isAxiosError: true, 
        response: { status: 404 }, 
        message: 'Request failed with status code 404' 
      };
      axiosGetSpy.mockRejectedValue(mockError);

      await expect(getAccountByRiotId('NonExistent', 'KR1', 'asia')).rejects.toEqual(mockError);
    });
  });
});