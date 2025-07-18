# 커서 기반 페이지네이션 가이드

## 🎯 개요

TFT Meta Analyzer 백엔드에서 커서 기반 페이지네이션을 도입하여 대용량 데이터 처리 성능을 크게 향상시켰습니다. 기존 offset/limit 방식의 성능 한계를 해결하고, 무한 스크롤과 같은 현대적 UX를 지원합니다.

## 📊 성능 비교

| 방식 | 10,000번째 페이지 | 100,000번째 페이지 | 메모리 사용량 |
|------|------------------|-------------------|---------------|
| **기존 Skip/Limit** | ~500ms | ~5000ms | 높음 |
| **커서 기반** | ~10ms | ~10ms | 낮음 |

## 🚀 지원 API 엔드포인트

### 1. 랭킹 API
```bash
# 기존 (유지)
GET /api/ranking?page=1&limit=50

# 새로운 커서 기반
GET /api/ranking/cursor?cursor=xxx&limit=50&sortField=leaguePoints&sortOrder=-1
```

### 2. 덱 빌더 API
```bash
# 기존 (유지)
GET /api/deckBuilder?page=1&limit=20&sortBy=createdAt&order=desc

# 새로운 커서 기반
GET /api/deckBuilder/cursor?cursor=xxx&limit=20&sortBy=createdAt&order=desc
```

### 3. 통계 API
```bash
# 기존 (유지)
GET /api/stats/items?type=completed&sortBy=winRate&order=desc&limit=50

# 새로운 커서 기반
GET /api/stats/items/cursor?cursor=xxx&type=completed&sortBy=winRate&order=desc&limit=50
GET /api/stats/traits/cursor?cursor=xxx&type=origin&sortBy=winRate&order=desc&limit=50
```

## 📝 API 사용법

### 요청 파라미터

| 파라미터 | 타입 | 설명 | 기본값 |
|----------|------|------|--------|
| `cursor` | string | 페이지 커서 (Base64 인코딩) | 없음 |
| `limit` | number | 페이지당 항목 수 (1-100) | 20 |
| `sortField` | string | 정렬 필드 | API별 기본값 |
| `sortOrder` | string | 정렬 순서 ("1" 또는 "-1") | "-1" |

### 응답 형태

```json
{
  "data": [...], // 실제 데이터
  "pagination": {
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextCursor": "eyJ2YWx1ZSI6MTIzLCJpZCI6IjYxYzc4...",
    "prevCursor": null,
    "totalCount": 50
  },
  "meta": {
    "sortField": "leaguePoints",
    "sortOrder": -1,
    "limit": 50
  }
}
```

## 🔧 사용 예시

### 1. 첫 페이지 조회
```bash
curl "http://localhost:3000/api/ranking/cursor?limit=10"
```

**응답:**
```json
{
  "rankers": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "summonerName": "Challenger1",
      "leaguePoints": 1234,
      "tier": "CHALLENGER"
    }
  ],
  "pagination": {
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextCursor": "eyJ2YWx1ZSI6MTIzNCwiaWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJkaXJlY3Rpb24iOiJmb3J3YXJkIn0=",
    "prevCursor": null,
    "totalCount": 10
  }
}
```

### 2. 다음 페이지 조회
```bash
curl "http://localhost:3000/api/ranking/cursor?cursor=eyJ2YWx1ZSI6MTIzNCwiaWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJkaXJlY3Rpb24iOiJmb3J3YXJkIn0=&limit=10"
```

### 3. 특정 조건으로 통계 조회
```bash
curl "http://localhost:3000/api/stats/items/cursor?type=completed&sortBy=winRate&order=desc&limit=20"
```

## 🎨 프론트엔드 구현 예시

### React 무한 스크롤 구현

```javascript
import { useState, useEffect } from 'react';

function useInfiniteScroll(apiEndpoint, initialParams = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    const params = new URLSearchParams({
      ...initialParams,
      ...(nextCursor && { cursor: nextCursor })
    });
    
    try {
      const response = await fetch(`${apiEndpoint}?${params}`);
      const result = await response.json();
      
      setData(prevData => [...prevData, ...result.data]);
      setHasMore(result.pagination.hasNextPage);
      setNextCursor(result.pagination.nextCursor);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMore();
  }, []);

  return { data, loading, hasMore, loadMore };
}

// 사용 예시
function RankingList() {
  const { data, loading, hasMore, loadMore } = useInfiniteScroll(
    '/api/ranking/cursor',
    { limit: 50 }
  );

  return (
    <div>
      {data.map(ranker => (
        <div key={ranker._id}>
          {ranker.summonerName} - {ranker.leaguePoints} LP
        </div>
      ))}
      
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Vue.js 구현 예시

```vue
<template>
  <div>
    <div v-for="item in items" :key="item._id" class="item">
      <!-- 아이템 렌더링 -->
    </div>
    
    <button 
      v-if="hasMore" 
      @click="loadMore" 
      :disabled="loading"
    >
      {{ loading ? 'Loading...' : 'Load More' }}
    </button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      items: [],
      loading: false,
      hasMore: true,
      nextCursor: null
    };
  },
  
  async mounted() {
    await this.loadMore();
  },
  
  methods: {
    async loadMore() {
      if (this.loading || !this.hasMore) return;
      
      this.loading = true;
      
      const params = {
        limit: 20,
        ...(this.nextCursor && { cursor: this.nextCursor })
      };
      
      try {
        const response = await this.$http.get('/api/stats/items/cursor', { params });
        
        this.items.push(...response.data.data);
        this.hasMore = response.data.pagination.hasNextPage;
        this.nextCursor = response.data.pagination.nextCursor;
      } catch (error) {
        console.error('Failed to load items:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

## 🔍 고급 기능

### 1. 복합 정렬 (Compound Sort)
```javascript
// 복합 정렬 사용 예시 (API 확장 시)
const result = await CursorPagination.paginateWithCompoundSort(
  DeckTier.find(),
  {
    sortFields: [
      { field: 'totalGames', order: -1 },
      { field: 'winRate', order: -1 },
      { field: 'averagePlacement', order: 1 }
    ],
    limit: 20
  }
);
```

### 2. 범위 기반 페이지네이션
```javascript
// 점수 범위로 제한된 페이지네이션
const result = await CursorPagination.paginateByRange(
  ItemStats.find(),
  {
    sortField: 'winRate',
    sortOrder: -1,
    rangeStart: 0.5,  // 승률 50% 이상
    rangeEnd: 1.0,    // 승률 100% 이하
    limit: 20
  }
);
```

## ⚠️ 주의사항

### 1. 커서 만료
- 커서는 데이터 변경 시 무효화될 수 있습니다
- 클라이언트는 커서 오류 시 첫 페이지부터 다시 조회해야 합니다

### 2. 정렬 필드 변경
- 정렬 필드를 변경하면 기존 커서는 사용할 수 없습니다
- 새로운 정렬 조건에서는 첫 페이지부터 시작해야 합니다

### 3. 성능 최적화
- 정렬 필드에 적절한 인덱스가 있는지 확인하세요
- 복합 정렬 시 복합 인덱스를 활용하세요

## 🔧 트러블슈팅

### 1. "Invalid cursor format" 오류
```javascript
// 커서 형식 오류 처리
try {
  const result = await fetch('/api/ranking/cursor?cursor=invalid');
} catch (error) {
  if (error.message.includes('Invalid cursor format')) {
    // 첫 페이지부터 다시 시작
    window.location.href = '/ranking';
  }
}
```

### 2. 성능 이슈 디버깅
```javascript
// 성능 모니터링 코드
console.time('cursor-pagination');
const result = await fetch('/api/ranking/cursor?cursor=xxx');
console.timeEnd('cursor-pagination');

// 응답 메타 정보 확인
console.log('Pagination meta:', result.meta);
```

## 📈 모니터링 및 분석

### 1. 성능 메트릭
- 평균 응답 시간
- 인덱스 사용률
- 메모리 사용량

### 2. 사용 패턴 분석
```bash
# 로그 분석 예시
grep "cursor" /var/log/tft-analyzer.log | grep -E "executionTime|totalDocsExamined"
```

## 🚀 마이그레이션 가이드

### 기존 API에서 커서 기반으로 전환

1. **점진적 마이그레이션**
   - 기존 API는 유지하면서 새로운 `/cursor` 엔드포인트 추가
   - 클라이언트는 기능별로 점진적 전환

2. **클라이언트 코드 변경**
   ```javascript
   // 기존
   const response = await fetch('/api/ranking?page=1&limit=50');
   
   // 새로운 방식
   const response = await fetch('/api/ranking/cursor?limit=50');
   ```

3. **에러 처리 강화**
   - 커서 관련 오류 처리 로직 추가
   - 폴백 메커니즘 구현

이 가이드를 통해 새로운 커서 기반 페이지네이션을 효과적으로 활용하여 더 나은 사용자 경험을 제공할 수 있습니다.