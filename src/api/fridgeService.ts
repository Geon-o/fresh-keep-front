import { client } from './client';
import { FridgeType } from '../types';

export interface ServerFridge {
  id: number;
  name: string;
  type: 'FOUR_DOOR' | 'SIDE_BY_SIDE' | 'TWO_DOOR';
  role: 'OWNER' | 'MEMBER';
  uuid: string;
  deletionRequested: boolean;
  ownerName?: string;
  memberNames: string[];
}

export interface FridgeDeletionResult {
  deleted: boolean;
}

export interface ServerIngredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  expirationType?: 'SELL_BY' | 'USE_BY';
  dday: number;
  memo?: string;
  createdByName?: string;
  createdAt?: string;
  // 실제로 수정된 적이 있을 때만 값이 온다 (수정 이력 없으면 둘 다 undefined)
  updatedByName?: string;
  updatedAt?: string;
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
  // 구획을 아직 정하지 않은 채 등록된 식재료("위치 미정")
  unassignedIngredients?: ServerIngredient[];
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
 * 3. 냉장고 삭제 요청
 * 혼자 쓰는 냉장고는 즉시 삭제되지만(deleted: true), 다른 멤버와 공유 중이면
 * 삭제 요청만 등록되고(deleted: false) 전원 동의해야 실제로 삭제된다.
 * OWNER가 아닌 멤버가 호출하면 본인 멤버십만 제거(나가기)되며 항상 deleted: false를 반환한다.
 */
export async function deleteFridge(fridgeId: number): Promise<FridgeDeletionResult> {
  const response = await client.delete<FridgeDeletionResult>(`/api/fridges/${fridgeId}`);
  return response.data;
}

/**
 * 3-1. 다른 멤버가 보낸 삭제 요청에 동의. 전원 동의 시 그 시점에 실제로 삭제된다.
 */
export async function approveDeletion(fridgeId: number): Promise<FridgeDeletionResult> {
  const response = await client.post<FridgeDeletionResult>(`/api/fridges/${fridgeId}/deletion/approve`);
  return response.data;
}

/**
 * 3-2. 삭제 요청 거절. 거절 즉시 요청 자체가 취소된다.
 */
export async function rejectDeletion(fridgeId: number): Promise<void> {
  await client.post(`/api/fridges/${fridgeId}/deletion/reject`);
}

/**
 * 3-3. 주인이 본인이 보낸 삭제 요청을 철회.
 */
export async function cancelDeletionRequest(fridgeId: number): Promise<void> {
  await client.post(`/api/fridges/${fridgeId}/deletion/cancel`);
}

/**
 * 4. 특정 냉장고 내 구획 목록 및 식재료 일괄 조회 (Layout)
 */
export async function getFridgeLayout(fridgeId: number): Promise<ServerFridgeLayout> {
  const response = await client.get<ServerFridgeLayout>(`/api/fridges/${fridgeId}/layouts`);
  return response.data;
}

export interface IngredientHistoryEntry {
  id: number;
  actionType: 'CREATED' | 'UPDATED' | 'NAME_CHANGED' | 'TYPE_CHANGED';
  // CREATED/UPDATED일 때는 식재료명, NAME_CHANGED/TYPE_CHANGED일 때는 변경 후 냉장고명이 온다
  ingredientName: string;
  actorName?: string;
  // 등록(CREATED)일 때만 없고, 그 외에는 "필드: 이전값 → 새값" 형식으로 온다
  summary?: string;
  occurredAt: string;
}

/**
 * 4-1. 공유 냉장고의 식재료 등록/수정 및 냉장고 이름/타입 변경 이력 (최신순)
 */
export async function getFridgeHistory(fridgeId: number): Promise<IngredientHistoryEntry[]> {
  const response = await client.get<IngredientHistoryEntry[]>(`/api/fridges/${fridgeId}/history`);
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

const DEFAULT_INSIDE_SHELVES = [
  { id: 'shelf_1', label: '선반 1단' },
  { id: 'shelf_2', label: '선반 2단' },
  { id: 'shelf_3', label: '선반 3단' },
];
const DEFAULT_DOOR_SHELVES = [
  { id: 'pocket_1', label: '선반 1단' },
  { id: 'pocket_2', label: '선반 2단' },
];

export interface CompartmentShelfInfo {
  serverCompartmentId: number | null;
  insideShelves: { id: string; label: string }[];
  doorShelves: { id: string; label: string }[];
  hasDoorStorage: boolean;
}

/**
 * 5-1. 특정 구획(냉장실/냉동실 좌우)의 서버 구획 ID와 선반 구성(내부/문쪽) 조회.
 * 식재료 등록 시 "어느 칸에 넣을지" 선택지를 만드는 데 사용한다.
 */
export async function getCompartmentShelves(fridgeId: string, compartmentId: string): Promise<CompartmentShelfInfo> {
  const layout = await getFridgeLayout(Number(fridgeId));
  const isLeft = compartmentId.includes('left');
  const isRight = compartmentId.includes('right');
  const serverComp = layout.compartments.find(comp => {
    if (compartmentId.startsWith('freezer')) {
      if (comp.storageType !== 'FROZEN') return false;
    } else {
      if (comp.storageType !== 'REFRIGERATED') return false;
    }
    if (isLeft && !comp.name.includes('좌')) return false;
    if (isRight && !comp.name.includes('우')) return false;
    return true;
  }) || layout.compartments[0];

  if (!serverComp) {
    return { serverCompartmentId: null, insideShelves: DEFAULT_INSIDE_SHELVES, doorShelves: DEFAULT_DOOR_SHELVES, hasDoorStorage: true };
  }

  let insideShelves = DEFAULT_INSIDE_SHELVES;
  let doorShelves = DEFAULT_DOOR_SHELVES;
  try {
    if (serverComp.insideShelves) insideShelves = JSON.parse(serverComp.insideShelves);
  } catch (e) {
    console.error('Failed to parse insideShelves', e);
  }
  try {
    if (serverComp.doorShelves) doorShelves = JSON.parse(serverComp.doorShelves);
  } catch (e) {
    console.error('Failed to parse doorShelves', e);
  }
  const hasDoorStorage = serverComp.hasDoorStorage !== undefined && serverComp.hasDoorStorage !== null ? serverComp.hasDoorStorage : true;

  return { serverCompartmentId: serverComp.id, insideShelves, doorShelves, hasDoorStorage };
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

