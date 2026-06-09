import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // 실패 시 최대 2회 재시도
      staleTime: 1000 * 60 * 5, // 5분 동안 캐싱된 데이터 유지 (신선함)
      gcTime: 1000 * 60 * 30, // 30분 후 가비지 컬렉션 (이전의 cacheTime)
      refetchOnWindowFocus: false, // 윈도우 포커스 시 재요청 끄기 (모바일 앱 특성 고려)
      refetchOnReconnect: true, // 오프라인 해제 시 자동 갱신
    },
  },
});
