import { client } from './client';
import { FridgeType } from '../types';

export interface ServerFridge {
  id: number;
  name: string;
  type: 'FOUR_DOOR' | 'SIDE_BY_SIDE' | 'TWO_DOOR';
  role: 'OWNER' | 'MEMBER';
  uuid: string;
}

export interface ServerIngredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  dday: number;
  memo?: string;
}

export interface ServerCompartment {
  id: number;
  name: string;
  storageType: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMP' | 'SPECIAL';
  sequenceOrder: number;
  insideShelves?: string;
  doorShelves?: string;
  hasDoorStorage?: boolean;
  ingredients: ServerIngredient[];
}

export interface ServerFridgeLayout {
  fridgeId: number;
  fridgeName: string;
  type: 'FOUR_DOOR' | 'SIDE_BY_SIDE' | 'TWO_DOOR';
  compartments: ServerCompartment[];
}

// UI용 FridgeType과 백엔드 문자열 포맷 상호 변환 유틸
export function convertTypeToBackend(type: FridgeType): 'FOUR_DOOR' | 'SIDE_BY_SIDE' | 'TWO_DOOR' {
  if (type === 'side-by-side') return 'SIDE_BY_SIDE';
  if (type === 'two-door') return 'TWO_DOOR';
  return 'FOUR_DOOR';
}

export function convertTypeToFrontend(backendType: 'FOUR_DOOR' | 'SIDE_BY_SIDE' | 'TWO_DOOR'): FridgeType {
  if (backendType === 'SIDE_BY_SIDE') return 'side-by-side';
  if (backendType === 'TWO_DOOR') return 'two-door';
  return 'four-door';
}

/**
 * 1. 새 냉장고 생성
 */
export async function createFridge(name: string, type: FridgeType): Promise<ServerFridge> {
  const backendType = convertTypeToBackend(type);
  const response = await client.post<ServerFridge>('/api/fridges', {
    name,
    type: backendType,
  });
  return response.data;
}

/**
 * 2. 내 냉장고 목록 조회
 */
export async function getFridges(): Promise<ServerFridge[]> {
  const response = await client.get<ServerFridge[]>('/api/fridges');
  return response.data;
}

/**
 * 3. 냉장고 삭제
 */
export async function deleteFridge(fridgeId: number): Promise<void> {
  await client.delete(`/api/fridges/${fridgeId}`);
}

/**
 * 4. 특정 냉장고 내 구획 목록 및 식재료 일괄 조회 (Layout)
 */
export async function getFridgeLayout(fridgeId: number): Promise<ServerFridgeLayout> {
  const response = await client.get<ServerFridgeLayout>(`/api/fridges/${fridgeId}/layouts`);
  return response.data;
}

/**
 * 5. 냉장고 설정 변경 (타입 등)
 */
export async function updateFridge(fridgeId: number, name: string, type: FridgeType): Promise<ServerFridge> {
  const backendType = convertTypeToBackend(type);
  const response = await client.patch<ServerFridge>(`/api/fridges/${fridgeId}`, {
    name,
    type: backendType,
  });
  return response.data;
}

/**
 * 6. 특정 구획의 선반 설정 및 문쪽 보관실 사용 설정 변경
 */
export async function updateCompartmentShelves(
  fridgeId: number,
  compartmentId: number,
  insideShelves: any[],
  doorShelves: any[],
  hasDoorStorage: boolean
): Promise<void> {
  await client.put(`/api/fridges/${fridgeId}/compartments/${compartmentId}/shelves`, {
    insideShelves: JSON.stringify(insideShelves),
    doorShelves: JSON.stringify(doorShelves),
    hasDoorStorage,
  });
}

