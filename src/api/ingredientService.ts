import { client } from './client';
import { ServerIngredient, invalidateFridgeLayout } from './fridgeService';

export interface AddIngredientRequest {
  fridgeId: number;
  // 없으면 "위치 미정" 상태로 등록된다.
  compartmentId?: number;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string; // YYYY-MM-DD
  expirationType: 'SELL_BY' | 'USE_BY';
  memo?: string;
}

export interface UpdateIngredientRequest {
  compartmentId?: number; // (선택) 다른 칸으로 이동 시
  name?: string;
  quantity?: number;
  unit?: string;
  expirationDate?: string;
  expirationType?: 'SELL_BY' | 'USE_BY';
  memo?: string;
}

/**
 * 1. 식재료 등록
 */
export async function addIngredient(data: AddIngredientRequest): Promise<ServerIngredient> {
  const response = await client.post<ServerIngredient>('/api/ingredients', data);
  await invalidateFridgeLayout(data.fridgeId);
  return response.data;
}

/**
 * 2. 식재료 정보 수정 (PATCH)
 */
export async function updateIngredient(ingredientId: number, data: UpdateIngredientRequest): Promise<ServerIngredient> {
  const response = await client.patch<ServerIngredient>(`/api/ingredients/${ingredientId}`, data);
  // 어느 냉장고의 식재료인지 요청에 없으므로 레이아웃 캐시를 전부 버린다.
  await invalidateFridgeLayout();
  return response.data;
}

/**
 * 3. 식재료 삭제
 */
export async function deleteIngredient(ingredientId: number): Promise<void> {
  await client.delete(`/api/ingredients/${ingredientId}`);
  await invalidateFridgeLayout();
}
