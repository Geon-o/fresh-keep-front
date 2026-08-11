export type FridgeType = 'side-by-side' | 'four-door' | 'two-door';

export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export type IngredientCategory =
  | 'meat'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'seafood'
  | 'sauce'
  | 'bakery'
  | 'drink'
  | 'frozen'
  | 'etc';

// 유통기한(SELL_BY) vs 소비기한(USE_BY) 구분
export type ExpiryType = 'SELL_BY' | 'USE_BY';

export interface Ingredient {
  id: string;
  name: string;
  location: string; // e.g. 'fridge_left', 'freezer_left', etc.
  subLocation?: 'shelf_1' | 'shelf_2' | 'shelf_3' | 'pocket_1' | 'pocket_2';
  category: IngredientCategory;
  expiryDate: string; // YYYY-MM-DD
  expiryType?: ExpiryType; // 미지정 시 기존 데이터와의 호환을 위해 SELL_BY(유통기한)로 취급
  quantity: number;
  unit: string;
  memo?: string;
  fridgeId?: string; // 연결된 냉장고 식별 ID
  createdByName?: string;
  createdAt?: string;
  // 실제로 수정된 적이 있을 때만 값이 있다 (수정 이력 없으면 둘 다 undefined)
  updatedByName?: string;
  updatedAt?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
}
