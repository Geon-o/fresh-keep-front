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

export interface Ingredient {
  id: string;
  name: string;
  location: string; // e.g. 'fridge_left', 'freezer_left', etc.
  subLocation?: 'shelf_1' | 'shelf_2' | 'shelf_3' | 'pocket_1' | 'pocket_2';
  category: IngredientCategory;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  memo?: string;
  fridgeId?: string; // 연결된 냉장고 식별 ID
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
}
