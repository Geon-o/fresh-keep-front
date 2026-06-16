import { client } from './client';

export interface StorageGuideDto {
  name: string;
  emoji: string;
  category: string;
  tip: string;
  youtubeQuery: string;
  video: {
    title: string;
    channelName: string;
    videoId: string;
    duration: string;
  } | null;
}

/**
 * AI 기반 하이브리드 캐싱 식재료 보관 가이드 검색 API 호출
 */
export const searchStorageGuides = async (query: string, autoGenerate: boolean = true): Promise<StorageGuideDto[]> => {
  const response = await client.get<StorageGuideDto[]>(`/api/guide/search`, {
    params: { query, autoGenerate },
  });
  return response.data;
};
