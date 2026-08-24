import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient, IngredientCategory, ExpiryType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { addIngredient, updateIngredient } from '../api/ingredientService';
import { getCustomUnits, addCustomUnit } from '../api/unitService';
import { serializeMemo } from '../utils/memoSerializer';
import { rebuildAllNotifications } from '../utils/ingredientNotifications';
import { createStyles, CATEGORIES, DEFAULT_UNITS, EXPIRY_TYPE_LABELS } from './CompartmentDetail';
import BarcodeScannerModal from './BarcodeScannerModal';

interface AddIngredientModalProps {
  visible: boolean;
  // 등록 모드에서만 필요 (목록 화면의 선택 단계에서 이미 정해진 값).
  fridgeId?: string;
  compartmentId?: string;
  shelfId?: string;
  serverCompartmentId?: number | null;
  // 지정하면 수정 모드로 동작 (기존 값으로 폼을 채우고, 저장 시 등록 대신 수정 API를 호출).
  editIngredient?: Ingredient;
  onClose: () => void;
  // 수정 성공 시엔 갱신된 식재료를 넘겨 부모가 전체 재조회 없이 로컬 상태만 갱신할 수 있게 한다.
  // 등록 성공 시엔 인자 없이 호출 (부모가 목록을 다시 불러옴).
  onSaved: (updatedIngredient?: Ingredient) => void;
}

// 식재료 목록 탭의 + 버튼(등록) / 카드 수정 버튼(수정) 흐름 전용: 이 화면 위에 바로 폼을 띄운다.
// CompartmentDetail로 이동하지 않는다.
export default function AddIngredientModal({ visible, fridgeId, compartmentId, shelfId, serverCompartmentId, editIngredient, onClose, onSaved }: AddIngredientModalProps) {
  const { isLoggedIn } = useAuth();
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const [isPreparing, setIsPreparing] = useState(true);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<IngredientCategory>('etc');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState('개');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formExpiryType, setFormExpiryType] = useState<ExpiryType>('SELL_BY');
  const [formMemo, setFormMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);

  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitCustomInputOpen, setUnitCustomInputOpen] = useState(false);
  const [unitCustomInputValue, setUnitCustomInputValue] = useState('');
  const [expiryTypeDropdownOpen, setExpiryTypeDropdownOpen] = useState(false);
  const unitOptions = Array.from(new Set([...DEFAULT_UNITS, ...customUnits]));
  const isEdit = !!editIngredient;
  const effectiveShelfId = editIngredient?.subLocation || shelfId || '';

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const addDaysToToday = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  };

  // 등록 폼 필드만 초기값으로 되돌린다 (연속 등록 시 위치/단위 목록은 유지한 채 재사용).
  const resetAddForm = () => {
    setFormName('');
    setFormCategory('etc');
    setFormQuantity(1);
    setFormUnit('개');
    setFormExpiryDate(getTodayString());
    setFormExpiryType('SELL_BY');
    setFormMemo('');
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setUnitCustomInputValue('');
    setExpiryTypeDropdownOpen(false);
  };

  // 모달이 열릴 때마다: 폼 초기화 + 단위 드롭다운에 쓸 커스텀 단위 목록 조회
  useEffect(() => {
    if (!visible) return;

    if (editIngredient) {
      setFormName(editIngredient.name);
      setFormCategory(editIngredient.category);
      setFormQuantity(editIngredient.quantity);
      setFormUnit(editIngredient.unit);
      setFormExpiryDate(editIngredient.expiryDate);
      setFormExpiryType(editIngredient.expiryType || 'SELL_BY');
      setFormMemo(editIngredient.memo || '');
      setCategoryDropdownOpen(false);
      setUnitDropdownOpen(false);
      setUnitCustomInputOpen(false);
      setUnitCustomInputValue('');
      setExpiryTypeDropdownOpen(false);
    } else {
      resetAddForm();
    }
    setIsPreparing(true);

    const prepare = async () => {
      try {
        if (isLoggedIn) {
          const units = await getCustomUnits().catch(() => []);
          setCustomUnits(units);
        } else {
          const stored = await AsyncStorage.getItem('@custom_units');
          setCustomUnits(stored ? JSON.parse(stored) : []);
        }
      } catch (e) {
        console.error('Failed to load custom units', e);
      } finally {
        setIsPreparing(false);
      }
    };
    prepare();
  }, [visible, isLoggedIn, editIngredient?.id]);

  const toggleCategoryDropdown = () => {
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setExpiryTypeDropdownOpen(false);
    setCategoryDropdownOpen(prev => !prev);
  };
  const toggleUnitDropdown = () => {
    setCategoryDropdownOpen(false);
    setExpiryTypeDropdownOpen(false);
    setUnitDropdownOpen(prev => !prev);
  };
  const toggleExpiryTypeDropdown = () => {
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setExpiryTypeDropdownOpen(prev => !prev);
  };

  const handleAddCustomUnit = async () => {
    const trimmed = unitCustomInputValue.trim();
    if (!trimmed) return;
    try {
      if (isLoggedIn) {
        const units = await addCustomUnit(trimmed);
        setCustomUnits(units);
      } else {
        setCustomUnits(prev => {
          const next = prev.includes(trimmed) ? prev : [...prev, trimmed];
          AsyncStorage.setItem('@custom_units', JSON.stringify(next));
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to add custom unit', e);
    }
    setFormUnit(trimmed);
    setUnitCustomInputValue('');
    setUnitCustomInputOpen(false);
    setUnitDropdownOpen(false);
  };

  // 바코드 스캔 결과로 제품명을 자동 채운다. 카테고리/유통기한은 바코드에 담기지 않는 정보라
  // (제품 식별자일 뿐 배치별 날짜를 담을 수 없음) 사용자가 직접 입력해야 한다.
  const handleBarcodeScanned = async (barcode: string) => {
    setScannerVisible(false);
    setIsLookingUpBarcode(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_ko,brands`
      );
      const json = await response.json();
      const name = json?.status === 1
        ? (json.product?.product_name_ko || json.product?.product_name || json.product?.brands)
        : null;

      if (name) {
        setFormName(name);
      } else {
        const message = '등록된 제품 정보를 찾지 못했어요. 이름을 직접 입력해 주세요.';
        if (Platform.OS === 'web') window.alert(message);
        else Alert.alert('알림', message);
      }
    } catch (e) {
      console.error('Barcode lookup failed', e);
      const message = '제품 정보를 불러오지 못했어요. 이름을 직접 입력해 주세요.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('알림', message);
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const handleSave = async (keepOpenForNext: boolean = false) => {
    if (isSavingRef.current) return;

    if (!formName.trim()) {
      if (Platform.OS === 'web') window.alert('식재료 이름을 입력해주세요.');
      else Alert.alert('알림 ⚠️', '식재료 이름을 입력해주세요.');
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formExpiryDate)) {
      if (Platform.OS === 'web') window.alert('날짜 형식을 올바르게 입력해주세요 (YYYY-MM-DD).');
      else Alert.alert('알림 ⚠️', '날짜 형식을 올바르게 입력해주세요 (YYYY-MM-DD).');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const memoContent = serializeMemo(formCategory, effectiveShelfId, formMemo);
      let savedIngredient: Ingredient | undefined;

      if (isEdit && editIngredient) {
        if (isLoggedIn) {
          const updatedIng = await updateIngredient(Number(editIngredient.id), {
            name: formName.trim(),
            quantity: Number(formQuantity),
            unit: formUnit,
            expirationDate: formExpiryDate,
            expirationType: formExpiryType,
            memo: memoContent,
          });
          savedIngredient = {
            ...editIngredient,
            name: updatedIng.name,
            category: formCategory,
            expiryDate: updatedIng.expirationDate,
            expiryType: updatedIng.expirationType || formExpiryType,
            quantity: updatedIng.quantity,
            unit: updatedIng.unit,
            memo: formMemo.trim() || undefined,
            updatedByName: updatedIng.updatedByName,
            updatedAt: updatedIng.updatedAt,
          };
        } else {
          const ingredientsStr = await AsyncStorage.getItem('@ingredients');
          const allIngredients: Ingredient[] = ingredientsStr ? JSON.parse(ingredientsStr) : [];
          const updated = allIngredients.map(item =>
            item.id === editIngredient.id
              ? {
                  ...item,
                  name: formName.trim(),
                  category: formCategory,
                  expiryDate: formExpiryDate,
                  expiryType: formExpiryType,
                  quantity: formQuantity,
                  unit: formUnit,
                  memo: formMemo.trim() || undefined,
                }
              : item
          );
          await AsyncStorage.setItem('@ingredients', JSON.stringify(updated));
          rebuildAllNotifications(updated);
          savedIngredient = updated.find(item => item.id === editIngredient.id);
        }
      } else if (isLoggedIn) {
        if (!fridgeId) {
          throw new Error('냉장고 ID를 로드하지 못했습니다.');
        }
        // compartmentId가 지정된 경우에만 서버 구획 ID가 필수 (없으면 "위치 미정" 등록)
        if (compartmentId && !serverCompartmentId) {
          throw new Error('서버 구획 ID를 로드하지 못했습니다.');
        }
        await addIngredient({
          fridgeId: Number(fridgeId),
          compartmentId: serverCompartmentId || undefined,
          name: formName.trim(),
          quantity: Number(formQuantity),
          unit: formUnit,
          expirationDate: formExpiryDate,
          expirationType: formExpiryType,
          memo: memoContent,
        });
      } else {
        const newIngredient: Ingredient = {
          id: `ing_${Date.now()}`,
          name: formName.trim(),
          location: compartmentId,
          subLocation: (effectiveShelfId || undefined) as any,
          category: formCategory,
          expiryDate: formExpiryDate,
          expiryType: formExpiryType,
          quantity: formQuantity,
          unit: formUnit,
          memo: formMemo.trim() || undefined,
          fridgeId,
        };
        const ingredientsStr = await AsyncStorage.getItem('@ingredients');
        const allIngredients: Ingredient[] = ingredientsStr ? JSON.parse(ingredientsStr) : [];
        const updated = [...allIngredients, newIngredient];
        await AsyncStorage.setItem('@ingredients', JSON.stringify(updated));
        rebuildAllNotifications(updated);
      }

      onSaved(savedIngredient);
      if (keepOpenForNext && !isEdit) {
        resetAddForm();
      } else {
        onClose();
      }
    } catch (e) {
      console.error('Failed to save ingredient', e);
      Alert.alert('오류 ⚠️', '식재료를 저장하지 못했습니다.');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setUnitCustomInputOpen(false);
    setExpiryTypeDropdownOpen(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTopRow}>
              <Text style={styles.modalTitle}>{isEdit ? '식재료 수정' : '식재료 등록'}</Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, isSaving && { opacity: 0.5 }]}
                onPress={handleClose}
                disabled={isSaving}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isPreparing ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.formLabel}>식재료명</Text>
                    {!isEdit && (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        activeOpacity={0.7}
                        onPress={() => setScannerVisible(true)}
                        disabled={isLookingUpBarcode}
                      >
                        {isLookingUpBarcode ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <Ionicons name="barcode-outline" size={16} color={theme.primary} />
                        )}
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>
                          {isLookingUpBarcode ? '조회 중...' : '바코드 스캔'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="예: 서울우유, 구이용 삼겹살"
                    placeholderTextColor="#90A4AE"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>카테고리</Text>
                  <TouchableOpacity style={styles.comboTrigger} activeOpacity={0.7} onPress={toggleCategoryDropdown}>
                    <Text style={styles.comboTriggerText}>
                      {(() => {
                        const selected = CATEGORIES.find(c => c.key === formCategory);
                        return selected ? `${selected.emoji ? selected.emoji + ' ' : ''}${selected.label}` : '선택';
                      })()}
                    </Text>
                    <Text style={styles.comboArrow}>{categoryDropdownOpen ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                  {categoryDropdownOpen && (
                    <View style={styles.comboDropdown}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat.key}
                          style={[styles.comboOption, formCategory === cat.key && styles.comboOptionActive]}
                          onPress={() => { setFormCategory(cat.key); setCategoryDropdownOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.comboOptionText, formCategory === cat.key && styles.comboOptionTextActive]}>
                            {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>수량 및 단위</Text>
                  <View style={styles.quantityUnitRow}>
                    <View style={styles.quantityCounter}>
                      <TouchableOpacity style={styles.counterButton} onPress={() => setFormQuantity(prev => Math.max(1, prev - 1))}>
                        <Text style={styles.counterButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{formQuantity}</Text>
                      <TouchableOpacity style={styles.counterButton} onPress={() => setFormQuantity(prev => prev + 1)}>
                        <Text style={styles.counterButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.comboTrigger, { flex: 1 }]} activeOpacity={0.7} onPress={toggleUnitDropdown}>
                      <Text style={styles.comboTriggerText}>{formUnit || '선택'}</Text>
                      <Text style={styles.comboArrow}>{unitDropdownOpen ? '▴' : '▾'}</Text>
                    </TouchableOpacity>
                  </View>
                  {unitDropdownOpen && (
                    <View style={styles.comboDropdown}>
                      {unitOptions.map(u => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.comboOption, formUnit === u && styles.comboOptionActive]}
                          onPress={() => { setFormUnit(u); setUnitDropdownOpen(false); setUnitCustomInputOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.comboOptionText, formUnit === u && styles.comboOptionTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                      {!unitCustomInputOpen ? (
                        <TouchableOpacity style={styles.comboAddNewRow} activeOpacity={0.7} onPress={() => setUnitCustomInputOpen(true)}>
                          <Text style={styles.comboAddNewRowText}>+ 직접 입력</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.comboCustomRow}>
                          <TextInput
                            style={styles.comboCustomInput}
                            value={unitCustomInputValue}
                            onChangeText={setUnitCustomInputValue}
                            placeholder="새 단위 입력"
                            placeholderTextColor="#90A4AE"
                            autoFocus
                            onSubmitEditing={handleAddCustomUnit}
                          />
                          <TouchableOpacity style={styles.comboCustomAddButton} activeOpacity={0.7} onPress={handleAddCustomUnit}>
                            <Text style={styles.comboCustomAddButtonText}>추가</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <TouchableOpacity style={styles.comboTriggerBorderless} activeOpacity={0.7} onPress={toggleExpiryTypeDropdown}>
                    <Text style={styles.comboTriggerBorderlessText}>{EXPIRY_TYPE_LABELS[formExpiryType]}</Text>
                    <Text style={styles.comboArrow}>{expiryTypeDropdownOpen ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                  {expiryTypeDropdownOpen && (
                    <View style={styles.comboDropdown}>
                      {(Object.keys(EXPIRY_TYPE_LABELS) as ExpiryType[]).map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.comboOption, formExpiryType === type && styles.comboOptionActive]}
                          onPress={() => { setFormExpiryType(type); setExpiryTypeDropdownOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.comboOptionText, formExpiryType === type && styles.comboOptionTextActive]}>
                            {EXPIRY_TYPE_LABELS[type]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>날짜</Text>
                  <TextInput
                    style={styles.input}
                    value={formExpiryDate}
                    onChangeText={setFormExpiryDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#90A4AE"
                    keyboardType="numeric"
                  />
                  <View style={styles.presetRow}>
                    <TouchableOpacity style={styles.presetButton} onPress={() => setFormExpiryDate(addDaysToToday(3))}>
                      <Text style={styles.presetButtonText}>+3일</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetButton} onPress={() => setFormExpiryDate(addDaysToToday(7))}>
                      <Text style={styles.presetButtonText}>+7일</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetButton} onPress={() => setFormExpiryDate(addDaysToToday(30))}>
                      <Text style={styles.presetButtonText}>+30일</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetButton} onPress={() => setFormExpiryDate(addDaysToToday(90))}>
                      <Text style={styles.presetButtonText}>+90일</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>메모 (선택) ({formMemo.length}/20자)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formMemo}
                    onChangeText={setFormMemo}
                    placeholder="보관 시 참고사항을 입력하세요. (최대 20자)"
                    placeholderTextColor="#90A4AE"
                    multiline
                    numberOfLines={2}
                    maxLength={20}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.buttonCancel, isSaving && { opacity: 0.5 }]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  <Text style={styles.buttonTextCancel}>취소</Text>
                </TouchableOpacity>
                {!isEdit && (
                  <TouchableOpacity
                    style={[styles.footerButton, styles.buttonCancel, isSaving && { opacity: 0.5 }]}
                    onPress={() => handleSave(true)}
                    activeOpacity={0.7}
                    disabled={isSaving}
                  >
                    <Text style={styles.buttonTextCancel}>계속 등록</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.footerButton, styles.buttonSave, isSaving && { opacity: 0.7 }]}
                  onPress={() => handleSave(false)}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.buttonTextSave}>{isEdit ? '저장 중...' : '등록 중...'}</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonTextSave}>{isEdit ? '수정 완료' : '등록'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleBarcodeScanned}
      />
    </Modal>
  );
}
