import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient } from '../types';
import { getFridges, getFridgeLayout } from '../api/fridgeService';
import { deserializeMemo, convertServerLocationToLocal } from './memoSerializer';

/**
 * 로그인 여부에 따라 서버(내 모든 냉장고) 또는 로컬 저장소에서 전체 식재료 목록을 불러온다.
 * RefrigeratorVisual 화면처럼 이미 불러온 refrigerators 목록이 없는 곳(예: 설정 화면)에서,
 * 알림을 즉시 재계산하는 등 "지금 전체 식재료가 필요한" 상황에 쓴다.
 */
export async function loadAllIngredients(isLoggedIn: boolean): Promise<Ingredient[]> {
  if (!isLoggedIn) {
    const ingredientsStr = await AsyncStorage.getItem('@ingredients');
    return ingredientsStr ? JSON.parse(ingredientsStr) : [];
  }

  const fridges = await getFridges().catch(() => []);
  const layouts = await Promise.all(fridges.map(f => getFridgeLayout(f.id).catch(() => null)));
  const all: Ingredient[] = [];

  layouts.forEach((layout, index) => {
    if (!layout) return;
    const fridgeId = String(fridges[index].id);

    if (Array.isArray(layout.compartments)) {
      layout.compartments.forEach(comp => {
        comp.ingredients.forEach(ing => {
          const deserialized = deserializeMemo(ing.memo);
          all.push({
            id: String(ing.id),
            name: ing.name,
            location: convertServerLocationToLocal(comp.storageType, comp.name),
            subLocation: deserialized.subLocation as any,
            category: deserialized.category,
            expiryDate: ing.expirationDate,
            quantity: ing.quantity,
            unit: ing.unit,
            memo: deserialized.memo || undefined,
            fridgeId,
          });
        });
      });
    }

    // 구획 미지정("위치 미정") 식재료
    if (Array.isArray(layout.unassignedIngredients)) {
      layout.unassignedIngredients.forEach(ing => {
        const deserialized = deserializeMemo(ing.memo);
        all.push({
          id: String(ing.id),
          name: ing.name,
          location: undefined,
          subLocation: undefined,
          category: deserialized.category,
          expiryDate: ing.expirationDate,
          quantity: ing.quantity,
          unit: ing.unit,
          memo: deserialized.memo || undefined,
          fridgeId,
        });
      });
    }
  });

  return all;
}
