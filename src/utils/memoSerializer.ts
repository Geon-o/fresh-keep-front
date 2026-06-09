import { IngredientCategory } from '../types';

interface MemoPayload {
  category?: IngredientCategory;
  subLocation?: string;
  memo?: string;
}

/**
 * 프론트엔드의 확장 데이터(카테고리, 세부 선반 위치)를 백엔드 memo 필드에 보존하기 위해 JSON 직렬화합니다.
 */
export function serializeMemo(category: IngredientCategory, subLocation: string, memoText: string): string {
  return JSON.stringify({
    category,
    subLocation,
    memo: memoText.trim(),
  });
}

/**
 * 백엔드 memo 필드로부터 프론트엔드 확장 데이터를 복구합니다.
 * JSON 파싱 실패 시 일반 텍스트 메모로 간주하고 기본값을 할당합니다.
 */
export function deserializeMemo(rawMemo: string | undefined): { category: IngredientCategory; subLocation: string; memo: string } {
  const defaults = { category: 'etc' as IngredientCategory, subLocation: 'shelf_1', memo: '' };
  if (!rawMemo) return defaults;
  
  try {
    const parsed = JSON.parse(rawMemo) as MemoPayload;
    return {
      category: parsed.category || 'etc',
      subLocation: parsed.subLocation || 'shelf_1',
      memo: parsed.memo || '',
    };
  } catch (e) {
    // JSON 파싱 실패 시 일반 텍스트로 복구
    return {
      category: 'etc',
      subLocation: 'shelf_1', // 일반 데이터는 1단으로 배치
      memo: rawMemo,
    };
  }
}

/**
 * 백엔드 StorageType과 Compartment 이름을 프론트엔드 도어 ID로 변환합니다.
 */
export function convertServerLocationToLocal(
  storageType: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMP' | 'SPECIAL',
  name: string
): string {
  const isLeft = name.includes('좌');
  const isRight = name.includes('우');
  
  if (storageType === 'FROZEN') {
    return isLeft || isRight ? `freezer_${isLeft ? 'left' : 'right'}` : 'freezer';
  }
  return isLeft || isRight ? `fridge_${isLeft ? 'left' : 'right'}` : 'fridge';
}
