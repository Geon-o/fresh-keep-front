import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, IngredientCategory, ExpiryType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getFridgeLayout } from '../api/fridgeService';
import { addIngredient } from '../api/ingredientService';
import { getCustomUnits, addCustomUnit } from '../api/unitService';
import { serializeMemo } from '../utils/memoSerializer';
import { rebuildAllNotifications } from '../utils/ingredientNotifications';
import {
  createStyles,
  CATEGORIES,
  DEFAULT_UNITS,
  EXPIRY_TYPE_LABELS,
  DEFAULT_INSIDE_SHELVES,
  DEFAULT_DOOR_SHELVES,
} from './CompartmentDetail';

interface AddIngredientModalProps {
  visible: boolean;
  fridgeId: string;
  compartmentId: string;
  onClose: () => void;
  onSaved: () => void;
}

// 식재료 목록 탭의 + 버튼 흐름 전용: 냉장고/칸을 고른 뒤 등록 폼을 이 화면(목록 화면) 위에 바로 띄운다.
// CompartmentDetail로 이동하지 않으므로, 저장에 필요한 서버 구획 ID/선반 정보만 이 모달이 직접 준비한다.
export default function AddIngredientModal({ visible, fridgeId, compartmentId, onClose, onSaved }: AddIngredientModalProps) {
  const { isLoggedIn } = useAuth();
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const [isPreparing, setIsPreparing] = useState(true);
  const [serverCompartmentId, setServerCompartmentId] = useState<number | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState('');

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<IngredientCategory>('etc');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState('개');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formExpiryType, setFormExpiryType] = useState<ExpiryType>('SELL_BY');
  const [formMemo, setFormMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitCustomInputOpen, setUnitCustomInputOpen] = useState(false);
  const [unitCustomInputValue, setUnitCustomInputValue] = useState('');
  const [expiryTypeDropdownOpen, setExpiryTypeDropdownOpen] = useState(false);
  const unitOptions = Array.from(new Set([...DEFAULT_UNITS, ...customUnits]));

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const addDaysToToday = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  };

  // 모달이 열릴 때마다: 폼 초기화 + 저장에 필요한 서버 구획 ID/기본 선반 조회
  useEffect(() => {
    if (!visible) return;

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
    setIsPreparing(true);

    const prepare = async () => {
      try {
        if (isLoggedIn) {
          const [layout, units] = await Promise.all([
            getFridgeLayout(Number(fridgeId)),
            getCustomUnits().catch(() => []),
          ]);
          setCustomUnits(units);

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

          if (serverComp) {
            setServerCompartmentId(serverComp.id);
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
            setSelectedShelfId(insideShelves[0]?.id || doorShelves[0]?.id || DEFAULT_INSIDE_SHELVES[0].id);
          } else {
            setServerCompartmentId(null);
            setSelectedShelfId(DEFAULT_INSIDE_SHELVES[0].id);
          }
        } else {
          const stored = await AsyncStorage.getItem('@custom_units');
          setCustomUnits(stored ? JSON.parse(stored) : []);

          const configStr = await AsyncStorage.getItem(`@shelf_config_${fridgeId}_${compartmentId}`);
          if (configStr) {
            const config = JSON.parse(configStr);
            const insideShelves = config.insideShelves || DEFAULT_INSIDE_SHELVES;
            const doorShelves = config.doorShelves || DEFAULT_DOOR_SHELVES;
            setSelectedShelfId(insideShelves[0]?.id || doorShelves[0]?.id || DEFAULT_INSIDE_SHELVES[0].id);
          } else {
            setSelectedShelfId(DEFAULT_INSIDE_SHELVES[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to prepare add-ingredient modal', e);
        setSelectedShelfId(DEFAULT_INSIDE_SHELVES[0].id);
      } finally {
        setIsPreparing(false);
      }
    };
    prepare();
  }, [visible, fridgeId, compartmentId, isLoggedIn]);

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

  const handleSave = async () => {
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
      const memoContent = serializeMemo(formCategory, selectedShelfId, formMemo);

      if (isLoggedIn) {
        if (!serverCompartmentId) {
          throw new Error('서버 구획 ID를 로드하지 못했습니다.');
        }
        await addIngredient({
          compartmentId: serverCompartmentId,
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
          subLocation: selectedShelfId as any,
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

      onSaved();
      onClose();
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
            <Text style={styles.modalTitle}>식재료 등록</Text>
            <TouchableOpacity
              style={[styles.modalCloseButton, isSaving && { opacity: 0.5 }]}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
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
                  <Text style={styles.formLabel}>식재료명</Text>
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
                <TouchableOpacity
                  style={[styles.footerButton, styles.buttonSave, isSaving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  activeOpacity={0.7}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.buttonTextSave}>등록 중...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonTextSave}>등록</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
