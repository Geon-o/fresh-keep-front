import { client } from './client';
import { Memo, MemoType } from '../types';

export interface CreateMemoRequest {
  type: MemoType;
  content: string;
}

export interface UpdateMemoRequest {
  content: string;
}

/**
 * 1. 냉장고 메모 목록 조회
 */
export async function getMemos(fridgeId: number): Promise<Memo[]> {
  const response = await client.get<Memo[]>(`/api/fridges/${fridgeId}/memos`);
  return response.data;
}

/**
 * 2. 메모 등록
 */
export async function createMemo(fridgeId: number, data: CreateMemoRequest): Promise<Memo> {
  const response = await client.post<Memo>(`/api/fridges/${fridgeId}/memos`, data);
  return response.data;
}

/**
 * 3. 메모 수정 (작성자만 가능 — 서버에서 검증)
 */
export async function updateMemo(fridgeId: number, memoId: number, data: UpdateMemoRequest): Promise<Memo> {
  const response = await client.patch<Memo>(`/api/fridges/${fridgeId}/memos/${memoId}`, data);
  return response.data;
}

/**
 * 4. 메모 삭제 (작성자만 가능 — 서버에서 검증)
 */
export async function deleteMemo(fridgeId: number, memoId: number): Promise<void> {
  await client.delete(`/api/fridges/${fridgeId}/memos/${memoId}`);
}

/**
 * 5. 체크리스트 항목 체크/해제 (작성자가 아니어도 같은 냉장고 멤버면 가능)
 */
export async function toggleMemoItem(fridgeId: number, memoId: number, itemId: string): Promise<Memo> {
  const response = await client.patch<Memo>(`/api/fridges/${fridgeId}/memos/${memoId}/items/${itemId}/toggle`);
  return response.data;
}

/**
 * 6. 메모함을 열었음을 서버에 알림 (안읽음 배지 해제용)
 */
export async function markMemosRead(fridgeId: number): Promise<void> {
  await client.post(`/api/fridges/${fridgeId}/memos/read`);
}
