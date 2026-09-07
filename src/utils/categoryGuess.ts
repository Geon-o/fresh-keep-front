import AsyncStorage from '@react-native-async-storage/async-storage';
import { IngredientCategory } from '../types';

// 재료 이름에 흔히 포함되는 키워드로 카테고리를 추정한다. 사전에 없거나 애매한
// 이름은 추측하지 않고 null을 반환해서, 사용자가 직접 고르게 둔다 (틀린 추측보다 안전).
const CATEGORY_KEYWORDS: [IngredientCategory, string[]][] = [
  ['vegetable', ['양파', '당근', '감자', '고구마', '오이', '호박', '상추', '배추', '무', '대파', '쪽파', '마늘', '생강', '시금치', '브로콜리', '버섯', '고추', '깻잎', '콩나물', '숙주', '옥수수', '가지', '토마토', '피망', '파프리카', '양배추']],
  ['fruit', ['사과', '바나나', '포도', '딸기', '수박', '참외', '복숭아', '배', '귤', '오렌지', '키위', '망고', '자두', '체리', '멜론', '블루베리', '레몬', '자몽', '석류']],
  ['meat', ['돼지고기', '소고기', '닭고기', '삼겹살', '목살', '안심', '등심', '다짐육', '베이컨', '소시지', '햄', '닭가슴살', '닭다리', '갈비', '차돌박이']],
  ['seafood', ['고등어', '갈치', '오징어', '새우', '조개', '굴', '멸치', '명태', '연어', '참치', '문어', '낙지', '게', '전복', '조기']],
  ['dairy', ['우유', '치즈', '요거트', '버터', '생크림', '두유', '연유']],
  ['frozen', ['냉동만두', '아이스크림', '냉동피자', '냉동새우', '냉동볶음밥']],
  ['bakery', ['식빵', '바게트', '크루아상', '베이글', '빵', '모닝빵']],
  ['drink', ['콜라', '사이다', '주스', '생수', '탄산수', '맥주', '소주', '와인', '커피']],
  ['sauce', ['간장', '고추장', '된장', '케첩', '마요네즈', '식초', '올리브유', '참기름', '소금', '설탕', '후추', '굴소스']],
];

function guessCategoryByKeyword(name: string): IngredientCategory | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => trimmed.includes(k))) return category;
  }
  return null;
}

const OVERRIDE_KEY_PREFIX = '@category_override:';
const overrideKey = (name: string) => `${OVERRIDE_KEY_PREFIX}${name.trim()}`;

// 사용자가 자동 추천 카테고리를 수동으로 바꾼 이력을 이름 단위로 기억해서,
// 다음에 같은 이름을 등록할 땐 사전보다 이 기록을 우선한다.
export async function saveCategoryOverride(name: string, category: IngredientCategory): Promise<void> {
  if (!name.trim()) return;
  try {
    await AsyncStorage.setItem(overrideKey(name), category);
  } catch (e) {
    // 저장 실패해도 카테고리 선택 자체를 막을 이유는 없다.
    console.error('Failed to save category override', e);
  }
}

export async function guessCategory(name: string): Promise<IngredientCategory | null> {
  if (!name.trim()) return null;
  try {
    const override = await AsyncStorage.getItem(overrideKey(name));
    if (override) return override as IngredientCategory;
  } catch (e) {
    console.error('Failed to read category override', e);
  }
  return guessCategoryByKeyword(name);
}
