import { client } from './client';
import { ServerIngredient } from './fridgeService';

export interface AddIngredientRequest {
  compartmentId: number;
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
  return response.data;
}

/**
 * 2. 식재료 정보 수정 (PATCH)
 */
export async function updateIngredient(ingredientId: number, data: UpdateIngredientRequest): Promise<ServerIngredient> {
  const response = await client.patch<ServerIngredient>(`/api/ingredients/${ingredientId}`, data);
  return response.data;
}

/**
 * 3. 식재료 삭제
 */
export async function deleteIngredient(ingredientId: number): Promise<void> {
  await client.delete(`/api/ingredients/${ingredientId}`);
}
