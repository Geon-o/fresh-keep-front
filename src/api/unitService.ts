import { client } from './client';

/**
 * 1. 내가 등록한 커스텀 단위 목록 조회
 */
export async function getCustomUnits(): Promise<string[]> {
  const response = await client.get<string[]>('/api/units');
  return response.data;
}

/**
 * 2. 새 커스텀 단위 등록 (이미 존재하면 서버에서 무시하고 현재 목록을 그대로 반환)
 */
export async function addCustomUnit(name: string): Promise<string[]> {
  const response = await client.post<string[]>('/api/units', { name });
  return response.data;
}
