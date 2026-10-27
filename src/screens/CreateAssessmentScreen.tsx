import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import moment from 'moment';
import {
  pick,
  types,
  errorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Question, CreateTestPayload } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { CustomButton } from '../assets/components/AppUIComponents';
import {
  FormCard,
  FieldLabel,
  FormInput,
  PickerTile,
  SegmentedControl,
  InfoBanner,
  describeDuration,
} from '../components/FormKit';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { saveCourseAssessment } from '../api/localPostApis';
import { safeParseDate } from '../utils/dateFormatter';
import {
  extractAssessmentQuestions,
  AssessmentSourceFile,
  AnswerSource,
} from '../services/aiServices';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAssessment'>;

// 'lecturer' = typed or confirmed by the lecturer in this builder.
type DraftQuestion = Question & { answerSource?: AnswerSource | 'lecturer' };
type FieldTarget = {
  qid: string;
  field: 'text' | 'option' | 'answer';
  optIdx?: number;
};
type PickerState = { target: 'start' | 'end'; mode: 'date' | 'time' } | null;

const OPTION_LETTERS = 'ABCDEFGH';
const SUPPORTED_MIME = /^(application\/pdf|image\/|text\/plain)/;

const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  {
    label: 'Math',
    symbols: ['×', '÷', '±', '−', '≠', '≈', '≤', '≥', '√', '∛', 'π', '∞', '°', '%', '½', '¼', '¾', '∫', '∂', '∑', '∏', 'Δ', '∇', '∠', '⊥', '∥', '|x|'],
  },
  {
    label: 'x²',
    symbols: ['²', '³', 'ⁿ', '⁻¹', '⁺', '⁻', '⁰', '¹', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '₀', '₁', '₂', '₃', '₄', '₅', 'ₙ', 'ₓ'],
  },
  {
    label: 'Greek',
    symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Ω', 'Σ', 'Φ', 'Γ', 'Λ'],
  },
  {
    label: 'Logic',
    symbols: ['∈', '∉', '⊂', '⊆', '∪', '∩', '∅', '∀', '∃', '¬', '∧', '∨', '⊕', '⇒', '⇔', '≡', '∴', '∵'],
  },
  {
    label: 'Arrows',
    symbols: ['→', '←', '↔', '⇌', '↑', '↓', '⟶', '⇒'],
  },
];

const newQuestion = (): DraftQuestion => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'MCQ',
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  answerSource: 'lecturer',
});

const withTime = (date: Date, hours: number, minutes: number) => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

/** Problems that block publishing a question, or null when it is complete. */
const questionProblem = (q: DraftQuestion): string | null => {
  if (!q.questionText.trim()) return 'Question text is empty';
  if (q.type === 'MCQ') {
    const filled = (q.options ?? []).filter(o => o.trim());
    if (filled.length < 2) return 'Needs at least two options';
    if (new Set(filled.map(o => o.trim())).size !== filled.length)
      return 'Two options are identical';
  }
  if (!q.correctAnswer.trim()) return 'Correct answer not set';
  if (q.type !== 'ShortAnswer') {
    const options = q.type === 'TrueFalse' ? ['True', 'False'] : q.options ?? [];
    if (!options.map(o => o.trim()).includes(q.correctAnswer.trim()))
      return 'Correct answer must be one of the options';
  }
  return null;
};

export const CreateAssessmentScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { course, test } = route.params;
  const { pickImageFromCamera, pickProductImages } = useMediaPicker();

  const [savedId, setSavedId] = useState<string | undefined>(
    test?.id || test?._id,
  );
  const [title, setTitle] = useState(test?.title ?? '');
  const [duration, setDuration] = useState(
    test?.duration ? String(test.duration) : '30',
  );
  const [totalMarks, setTotalMarks] = useState(
    test?.totalMarks ? String(test.totalMarks) : '',
  );
  const [start, setStart] = useState<Date | null>(
    safeParseDate(test?.scheduledStart),
  );
  const [end, setEnd] = useState<Date | null>(
    safeParseDate(test?.endTime) ?? safeParseDate(test?.dueDate),
  );
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    (test?.questions ?? []).map(q => ({ ...q, answerSource: 'lecturer' })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [focused, setFocused] = useState<FieldTarget | null>(null);
  const [symbolGroup, setSymbolGroup] = useState(0);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const selectionRef = useRef({ start: 0, end: 0 });
  const dirtyRef = useRef(false);
  const leavingRef = useRef(false);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  // Losing 30 extracted questions to an accidental back press would hurt.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!dirtyRef.current || leavingRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes to this assessment.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation]);

  const stats = useMemo(() => {
    const problems = questions.filter(q => questionProblem(q));
    return {
      total: questions.length,
      ready: questions.length - problems.length,
      problems: problems.length,
      aiSuggested: questions.filter(
        q => q.answerSource === 'ai' && !questionProblem(q),
      ).length,
    };
  }, [questions]);

  const windowMinutes =
    start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
  const effectiveMarks = Number(totalMarks) || questions.length;

  // ---- question editing --------------------------------------------------
  const updateQuestion = (id: string, updates: Partial<DraftQuestion>) => {
    markDirty();
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates } : q)),
    );
  };
  const updateOption = (q: DraftQuestion, optIdx: number, value: string) => {
    const options = [...(q.options ?? [])];
    const previous = options[optIdx];
    options[optIdx] = value;
    // Keep the answer attached to its option while the text is edited.
    const keepsAnswer = q.correctAnswer && q.correctAnswer === previous;
    updateQuestion(q.id, {
      options,
      ...(keepsAnswer ? { correctAnswer: value } : {}),
    });
  };
  const removeOption = (q: DraftQuestion, optIdx: number) => {
    const removed = q.options?.[optIdx];
    updateQuestion(q.id, {
      options: (q.options ?? []).filter((_, i) => i !== optIdx),
      ...(removed === q.correctAnswer ? { correctAnswer: '' } : {}),
    });
  };
  const changeType = (q: DraftQuestion, type: Question['type']) => {
    if (type === q.type) return;
    updateQuestion(q.id, {
      type,
      options:
        type === 'TrueFalse'
          ? ['True', 'False']
          : type === 'MCQ'
            ? q.options?.length && q.type === 'MCQ'
              ? q.options
              : ['', '', '', '']
            : [],
      correctAnswer: '',
      answerSource: 'lecturer',
    });
  };
  const setCorrect = (q: DraftQuestion, answer: string) => {
    if (!answer.trim()) return;
    updateQuestion(q.id, { correctAnswer: answer, answerSource: 'lecturer' });
  };
  const removeQuestion = (q: DraftQuestion, index: number) => {
    const doRemove = () => {
      markDirty();
      setQuestions(prev => prev.filter(item => item.id !== q.id));
      if (editingId === q.id) setEditingId(null);
    };
    if (!q.questionText.trim()) return doRemove();
    Alert.alert('Delete question?', `Question ${index + 1} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doRemove },
    ]);
  };
  const addManualQuestion = () => {
    const q = newQuestion();
    markDirty();
    setQuestions(prev => [...prev, q]);
    setEditingId(q.id);
  };

  // ---- symbol keyboard ---------------------------------------------------
  const valueOf = (target: FieldTarget) => {
    const q = questions.find(item => item.id === target.qid);
    if (!q) return null;
    if (target.field === 'text') return q.questionText;
    if (target.field === 'answer') return q.correctAnswer;
    return q.options?.[target.optIdx ?? 0] ?? '';
  };
  const insertSymbol = (symbol: string) => {
    if (!focused) return;
    const q = questions.find(item => item.id === focused.qid);
    const current = valueOf(focused);
    if (!q || current === null) return;
    const { start: s, end: e } = selectionRef.current;
    const from = Math.min(Math.max(0, s), current.length);
    const to = Math.min(Math.max(from, e), current.length);
    const next = current.slice(0, from) + symbol + current.slice(to);
    selectionRef.current = {
      start: from + symbol.length,
      end: from + symbol.length,
    };
    if (focused.field === 'text') updateQuestion(q.id, { questionText: next });
    else if (focused.field === 'answer')
      updateQuestion(q.id, { correctAnswer: next, answerSource: 'lecturer' });
    else updateOption(q, focused.optIdx ?? 0, next);
  };
  const fieldHandlers = (target: FieldTarget) => ({
    onFocus: () => setFocused(target),
    onBlur: () =>
      setFocused(prev =>
        prev &&
        prev.qid === target.qid &&
        prev.field === target.field &&
        prev.optIdx === target.optIdx
          ? null
          : prev,
      ),
    onSelectionChange: (ev: any) => {
      selectionRef.current = ev.nativeEvent.selection;
    },
  });

  // ---- extraction ----------------------------------------------------------
  const runExtraction = async (files: AssessmentSourceFile[]) => {
    if (files.length === 0) return;
    setShowUploadSheet(false);
    setExtracting(
      files.length > 1
        ? `Reading ${files.length} files...`
        : `Reading ${files[0].name}...`,
    );
    try {
      const extracted = await extractAssessmentQuestions(files);
      if (extracted.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No questions found',
          text2: 'Try a clearer photo or a PDF of the question paper.',
        });
        return;
      }
      markDirty();
      setQuestions(prev => [...prev, ...extracted]);
      const missing = extracted.filter(q => !q.correctAnswer).length;
      Toast.show({
        type: 'success',
        text1: `${extracted.length} question${extracted.length > 1 ? 's' : ''} extracted`,
        text2: missing
          ? `${missing} still need a correct answer. Review before publishing.`
          : 'Review the answers before publishing.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Extraction failed',
        text2: error?.message || 'Please try again.',
      });
    } finally {
      setExtracting(null);
    }
  };

  const pickFiles = async () => {
    try {
      const results = await pick({
        allowMultiSelection: true,
        type: [types.pdf, types.images, types.plainText],
      });
      const files: AssessmentSourceFile[] = [];
      const rejected: string[] = [];
      for (const r of results) {
        const mimeType = r.type || '';
        if (SUPPORTED_MIME.test(mimeType)) {
          files.push({ uri: r.uri, name: r.name || 'file', mimeType });
        } else {
          rejected.push(r.name || 'file');
        }
      }
      if (rejected.length) {
        Toast.show({
          type: 'info',
          text1: 'Some files were skipped',
          text2: 'Use PDF, images or .txt. Export Word files as PDF first.',
        });
      }
      await runExtraction(files);
    } catch (err: any) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        Toast.show({ type: 'error', text1: 'Could not open files' });
      }
    }
  };
  const scanWithCamera = async () => {
    const photo = await pickImageFromCamera();
    if (photo) {
      await runExtraction([
        { uri: photo.uri, name: 'Scanned page', mimeType: 'image/jpeg' },
      ]);
    }
  };
  const pickPhotos = async () => {
    const paths = await pickProductImages(10);
    if (paths?.length) {
      await runExtraction(
        paths.map((uri, i) => ({
          uri,
          name: `Page ${i + 1}`,
          mimeType: 'image/jpeg',
        })),
      );
    }
  };

  // ---- schedule ------------------------------------------------------------
  const onPickerChange = (event: any, selected?: Date) => {
    const current = picker;
    setPicker(null);
    if (!current || event?.type === 'dismissed' || !selected) return;
    markDirty();
    const apply = (prev: Date | null, fallbackHour: number) => {
      const base = prev ?? withTime(new Date(), fallbackHour, 0);
      if (current.mode === 'date') {
        const d = new Date(selected);
        d.setHours(base.getHours(), base.getMinutes(), 0, 0);
        return d;
      }
      return withTime(base, selected.getHours(), selected.getMinutes());
    };
    if (current.target === 'start') {
      const nextStart = apply(start, 9);
      setStart(nextStart);
      // Keep the window sensible: default the end to start + duration.
      if (!end || end <= nextStart) {
        const mins = Math.max(Number(duration) || 30, 5);
        setEnd(new Date(nextStart.getTime() + mins * 60000));
      }
    } else {
      setEnd(apply(end ?? start, 10));
    }
  };
  const pickerValue = () => {
    if (!picker) return new Date();
    const value = picker.target === 'start' ? start : end ?? start;
    return value ?? new Date();
  };

  // ---- save ----------------------------------------------------------------
  const buildPayload = (isPublished: boolean): CreateTestPayload => {
    const now = new Date();
    return {
      id: savedId,
      courseId: course.courseId,
      title: title.trim(),
      duration: Number(duration) || 0,
      totalMarks: effectiveMarks,
      questions: questions.map(({ answerSource, ...q }) => ({
        ...q,
        questionText: q.questionText.trim(),
        correctAnswer: q.correctAnswer.trim(),
        options:
          q.type === 'MCQ'
            ? (q.options ?? []).map(o => o.trim()).filter(Boolean)
            : q.type === 'TrueFalse'
              ? ['True', 'False']
              : [],
      })),
      isPublished,
      status: isPublished ? 'published' : 'draft',
      createdAt: now.toISOString(),
      scheduledStart: start ?? now,
      endTime: end ?? now,
      dueDate: end ?? now,
    };
  };

  const persist = async (isPublished: boolean) => {
    setSaving(isPublished ? 'publish' : 'draft');
    try {
      const result = await saveCourseAssessment(
        course.courseId,
        buildPayload(isPublished),
      );
      if (!result.success) {
        Toast.show({
          type: 'error',
          text1: 'Save failed',
          text2: result.error || 'Check your connection and try again.',
        });
        return;
      }
      const data: any = (result as any).data;
      const id = data?.id || data?._id || data?.assessmentId;
      if (id) setSavedId(id);
      dirtyRef.current = false;
      Toast.show({
        type: 'success',
        text1: isPublished ? 'Assessment published' : 'Draft saved',
        text2: `"${title.trim()}"`,
      });
      if (isPublished) {
        leavingRef.current = true;
        navigation.goBack();
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Network error', text2: error?.message });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveDraft = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Add a title to save a draft' });
      return;
    }
    persist(false);
  };

  const handlePublish = () => {
    const fail = (text1: string, text2?: string) =>
      Toast.show({ type: 'error', text1, text2 });
    if (!title.trim()) return fail('Add a title');
    if (!Number(duration)) return fail('Set the duration in minutes');
    if (!start || !end) return fail('Set when the assessment starts and ends');
    if (end <= start) return fail('Check the schedule', 'It must end after it starts.');
    if (Number(duration) > windowMinutes)
      return fail(
        'Duration is longer than the window',
        `Students only have ${describeDuration(windowMinutes)} between start and end.`,
      );
    if (questions.length === 0) return fail('Add at least one question');
    const firstProblem = questions.findIndex(q => questionProblem(q));
    if (firstProblem >= 0) {
      setEditingId(questions[firstProblem].id);
      return fail(
        `Question ${firstProblem + 1}: ${questionProblem(questions[firstProblem])}`,
        `${stats.problems} question${stats.problems > 1 ? 's' : ''} need attention.`,
      );
    }
    if (stats.aiSuggested > 0) {
      Alert.alert(
        'Unverified answers',
        `${stats.aiSuggested} answer${stats.aiSuggested > 1 ? 's were' : ' was'} suggested automatically and not confirmed by you. Publish anyway?`,
        [
          { text: 'Review', style: 'cancel' },
          { text: 'Publish', onPress: () => persist(true) },
        ],
      );
      return;
    }
    persist(true);
  };

  // ---- render ---------------------------------------------------------------
  const renderAnswerBadge = (q: DraftQuestion) => {
    const problem = questionProblem(q);
    let tone = colors.success;
    let icon = 'verified';
    let label = 'Answer confirmed';
    if (problem) {
      tone = colors.criticalSeverity;
      icon = 'error-outline';
      label = problem;
    } else if (q.answerSource === 'ai') {
      tone = colors.pendingDelivery;
      icon = 'auto-awesome';
      label = 'Suggested answer: tap to confirm';
    } else if (q.answerSource === 'document') {
      label = 'Answer from document';
      icon = 'description';
    }
    return (
      <TouchableOpacity
        disabled={q.answerSource !== 'ai' || !!problem}
        onPress={() => updateQuestion(q.id, { answerSource: 'lecturer' })}
        style={[ui.badge, { backgroundColor: tone + '18' }]}
      >
        <MaterialIcons name={icon} size={14} color={tone} />
        <Text style={[ui.badgeText, { color: tone }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderReadOnly = (q: DraftQuestion) => {
    const options = q.type === 'TrueFalse' ? ['True', 'False'] : q.options ?? [];
    return (
      <>
        <Text selectable style={[ui.qText, { color: colors.textDarker }]}>
          {q.questionText || 'Untitled question'}
        </Text>
        {q.type === 'ShortAnswer' ? (
          <View style={[ui.answerBox, { backgroundColor: colors.background }]}>
            <Text style={[ui.answerLabel, { color: colors.text }]}>Expected answer</Text>
            <Text style={[ui.answerValue, { color: colors.textDarker }]}>
              {q.correctAnswer || '—'}
            </Text>
          </View>
        ) : (
          options.map((opt, oIdx) => {
            const correct = !!opt && opt === q.correctAnswer;
            return (
              <TouchableOpacity
                key={`${q.id}-${oIdx}`}
                onPress={() => setCorrect(q, opt)}
                activeOpacity={0.7}
                style={[
                  ui.optionRead,
                  {
                    borderColor: correct ? colors.success : colors.border + '60',
                    backgroundColor: correct ? colors.success + '14' : colors.background,
                  },
                ]}
              >
                <View
                  style={[
                    ui.optionLetter,
                    { backgroundColor: correct ? colors.success : colors.primary + '15' },
                  ]}
                >
                  <Text
                    style={[
                      ui.optionLetterText,
                      { color: correct ? '#fff' : colors.primary },
                    ]}
                  >
                    {OPTION_LETTERS[oIdx] || oIdx + 1}
                  </Text>
                </View>
                <Text style={[ui.optionReadText, { color: colors.text }]}>{opt || '—'}</Text>
                {correct && (
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </>
    );
  };

  const renderEditor = (q: DraftQuestion) => (
    <>
      <SegmentedControl
        value={q.type}
        onChange={type => changeType(q, type)}
        options={[
          { value: 'MCQ', label: 'Options' },
          { value: 'TrueFalse', label: 'True/False' },
          { value: 'ShortAnswer', label: 'Short' },
        ]}
      />
      <FieldLabel>Question</FieldLabel>
      <FormInput
        multiline
        placeholder="Type the question. Use the symbol bar for signs like √, π, ≤"
        value={q.questionText}
        onChangeText={t => updateQuestion(q.id, { questionText: t })}
        {...fieldHandlers({ qid: q.id, field: 'text' })}
      />
      {q.type === 'ShortAnswer' ? (
        <>
          <FieldLabel hint="used for auto-grading">Correct answer</FieldLabel>
          <FormInput
            icon="check-circle"
            placeholder="Expected answer or key words"
            value={q.correctAnswer}
            onChangeText={t =>
              updateQuestion(q.id, { correctAnswer: t, answerSource: 'lecturer' })
            }
            {...fieldHandlers({ qid: q.id, field: 'answer' })}
          />
        </>
      ) : (
        <>
          <FieldLabel hint="tap the circle to mark correct">Options</FieldLabel>
          {(q.type === 'TrueFalse' ? ['True', 'False'] : q.options ?? []).map(
            (opt, oIdx) => {
              const correct = !!opt && opt === q.correctAnswer;
              return (
                <View key={`${q.id}-e-${oIdx}`} style={ui.optionEditRow}>
                  <TouchableOpacity
                    onPress={() => setCorrect(q, opt)}
                    accessibilityLabel={`Mark option ${OPTION_LETTERS[oIdx]} correct`}
                    style={[
                      ui.radio,
                      { borderColor: correct ? colors.success : colors.border },
                    ]}
                  >
                    {correct && (
                      <View style={[ui.radioInner, { backgroundColor: colors.success }]} />
                    )}
                  </TouchableOpacity>
                  {q.type === 'TrueFalse' ? (
                    <Text style={[ui.tfText, { color: colors.text }]}>{opt}</Text>
                  ) : (
                    <TextInput
                      value={opt}
                      onChangeText={v => updateOption(q, oIdx, v)}
                      placeholder={`Option ${OPTION_LETTERS[oIdx] || oIdx + 1}`}
                      placeholderTextColor={colors.inputTextHolder}
                      style={[
                        ui.optionInput,
                        {
                          color: colors.text,
                          borderColor: correct ? colors.success : colors.border + '80',
                          backgroundColor: colors.background,
                        },
                      ]}
                      {...fieldHandlers({ qid: q.id, field: 'option', optIdx: oIdx })}
                    />
                  )}
                  {q.type === 'MCQ' && (q.options?.length ?? 0) > 2 && (
                    <TouchableOpacity onPress={() => removeOption(q, oIdx)} style={ui.iconBtn}>
                      <MaterialIcons name="close" size={18} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            },
          )}
          {q.type === 'MCQ' && (q.options?.length ?? 0) < OPTION_LETTERS.length && (
            <TouchableOpacity
              onPress={() => updateQuestion(q.id, { options: [...(q.options ?? []), ''] })}
              style={[ui.addOption, { borderColor: colors.primary + '60' }]}
            >
              <MaterialIcons name="add" size={18} color={colors.primary} />
              <Text style={[ui.addOptionText, { color: colors.primary }]}>Add option</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <TouchableOpacity
        onPress={() => setEditingId(null)}
        style={[ui.doneBtn, { backgroundColor: colors.primary + '15' }]}
      >
        <MaterialIcons name="check" size={18} color={colors.primary} />
        <Text style={[ui.doneText, { color: colors.primary }]}>Done editing</Text>
      </TouchableOpacity>
    </>
  );

  const uploadOptions = [
    { icon: 'picture-as-pdf', label: 'PDF or files', sub: 'PDF, images, .txt', onPress: pickFiles },
    { icon: 'document-scanner', label: 'Scan pages', sub: 'Use the camera', onPress: scanWithCamera },
    { icon: 'photo-library', label: 'Photos', sub: 'Up to 10 pages', onPress: pickPhotos },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <PageHeader
        title={test ? 'Edit Assessment' : 'New Assessment'}
        subtitle={course?.courseCode || course?.courseTitle}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={ui.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormCard title="Details" icon="assignment">
            <FieldLabel>Title</FieldLabel>
            <FormInput
              placeholder="e.g. Mid-semester Test 1"
              value={title}
              onChangeText={t => {
                markDirty();
                setTitle(t);
              }}
            />
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Duration (min)</FieldLabel>
                <FormInput
                  icon="timer"
                  keyboardType="number-pad"
                  placeholder="30"
                  value={duration}
                  maxLength={3}
                  onChangeText={t => {
                    markDirty();
                    setDuration(t.replace(/\D/g, ''));
                  }}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Total marks</FieldLabel>
                <FormInput
                  icon="grade"
                  keyboardType="number-pad"
                  placeholder={questions.length ? String(questions.length) : '30'}
                  value={totalMarks}
                  maxLength={4}
                  onChangeText={t => {
                    markDirty();
                    setTotalMarks(t.replace(/\D/g, ''));
                  }}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>
            {questions.length > 0 && (
              <Text style={[ui.hint, { color: colors.text }]}>
                {effectiveMarks} marks over {questions.length} questions ≈{' '}
                {Math.round((effectiveMarks / questions.length) * 100) / 100} each
              </Text>
            )}
          </FormCard>

          <FormCard
            title="Schedule"
            icon="event"
            subtitle={
              windowMinutes > 0
                ? `Open for ${describeDuration(windowMinutes)}`
                : 'When students can start and must finish'
            }
          >
            <FieldLabel>Starts</FieldLabel>
            <View style={[ui.row, { marginBottom: 14 }]}>
              <PickerTile
                icon="calendar-month"
                label="Date"
                value={start ? moment(start).format('ddd, D MMM') : null}
                onPress={() => setPicker({ target: 'start', mode: 'date' })}
              />
              <PickerTile
                icon="schedule"
                label="Time"
                value={start ? moment(start).format('HH:mm') : null}
                onPress={() => setPicker({ target: 'start', mode: 'time' })}
              />
            </View>
            <FieldLabel>Ends</FieldLabel>
            <View style={ui.row}>
              <PickerTile
                icon="event-busy"
                label="Date"
                value={end ? moment(end).format('ddd, D MMM') : null}
                onPress={() => setPicker({ target: 'end', mode: 'date' })}
              />
              <PickerTile
                icon="schedule"
                label="Time"
                value={end ? moment(end).format('HH:mm') : null}
                onPress={() => setPicker({ target: 'end', mode: 'time' })}
              />
            </View>
          </FormCard>

          {questions.length === 0 ? (
            <FormCard>
              <View style={ui.heroCenter}>
                <View style={[ui.heroIcon, { backgroundColor: colors.primary + '15' }]}>
                  <MaterialIcons name="auto-awesome" size={30} color={colors.primary} />
                </View>
                <Text style={[ui.heroTitle, { color: colors.textDarker }]}>
                  Upload your question paper
                </Text>
                <Text style={[ui.heroText, { color: colors.text }]}>
                  We read every question, keep symbols like √, π and H₂O intact,
                  and fill in the correct answers. You review everything before
                  publishing.
                </Text>
              </View>
              <View style={ui.uploadGrid}>
                {uploadOptions.map(option => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={option.onPress}
                    disabled={!!extracting}
                    style={[
                      ui.uploadTile,
                      { borderColor: colors.primary + '50', backgroundColor: colors.background },
                    ]}
                  >
                    <MaterialIcons name={option.icon} size={26} color={colors.primary} />
                    <Text style={[ui.uploadLabel, { color: colors.textDarker }]}>
                      {option.label}
                    </Text>
                    <Text style={[ui.uploadSub, { color: colors.text }]}>{option.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={addManualQuestion} style={ui.manualLink}>
                <Text style={[ui.manualLinkText, { color: colors.primary }]}>
                  Or write questions manually
                </Text>
              </TouchableOpacity>
            </FormCard>
          ) : (
            <>
              <View style={ui.sectionHeader}>
                <Text style={[ui.sectionTitle, { color: colors.textDarker }]}>
                  Questions
                </Text>
                <TouchableOpacity
                  onPress={() => setShowUploadSheet(true)}
                  style={[ui.smallBtn, { borderColor: colors.primary }]}
                >
                  <MaterialIcons name="upload-file" size={16} color={colors.primary} />
                  <Text style={[ui.smallBtnText, { color: colors.primary }]}>
                    Add from file
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={ui.statsRow}>
                <View style={[ui.statChip, { backgroundColor: colors.primary + '12' }]}>
                  <Text style={[ui.statText, { color: colors.primary }]}>
                    {stats.total} total
                  </Text>
                </View>
                <View style={[ui.statChip, { backgroundColor: colors.success + '18' }]}>
                  <Text style={[ui.statText, { color: colors.success }]}>
                    {stats.ready} ready
                  </Text>
                </View>
                {stats.aiSuggested > 0 && (
                  <View style={[ui.statChip, { backgroundColor: colors.pendingDelivery + '18' }]}>
                    <Text style={[ui.statText, { color: colors.pendingDelivery }]}>
                      {stats.aiSuggested} to verify
                    </Text>
                  </View>
                )}
                {stats.problems > 0 && (
                  <View
                    style={[ui.statChip, { backgroundColor: colors.criticalSeverity + '18' }]}
                  >
                    <Text style={[ui.statText, { color: colors.criticalSeverity }]}>
                      {stats.problems} need fixing
                    </Text>
                  </View>
                )}
              </View>
              {stats.aiSuggested > 0 && (
                <InfoBanner
                  icon="auto-awesome"
                  color={colors.pendingDelivery}
                  text="Orange answers were worked out automatically because the paper had no answer key. Tap an option to change it, or tap the badge to confirm."
                />
              )}

              {questions.map((q, index) => {
                const editing = editingId === q.id;
                const problem = questionProblem(q);
                return (
                  <View
                    key={q.id}
                    style={[
                      ui.qCard,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: editing
                          ? colors.primary
                          : problem
                            ? colors.criticalSeverity + '80'
                            : colors.border + '40',
                      },
                    ]}
                  >
                    <View style={ui.qHeader}>
                      <View style={[ui.qNumber, { backgroundColor: colors.primary }]}>
                        <Text style={ui.qNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={[ui.qType, { color: colors.text }]}>
                        {q.type === 'MCQ'
                          ? 'Multiple choice'
                          : q.type === 'TrueFalse'
                            ? 'True / False'
                            : 'Short answer'}
                      </Text>
                      {!editing && (
                        <TouchableOpacity
                          onPress={() => setEditingId(q.id)}
                          style={ui.iconBtn}
                          accessibilityLabel={`Edit question ${index + 1}`}
                        >
                          <MaterialIcons name="edit" size={19} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => removeQuestion(q, index)}
                        style={ui.iconBtn}
                        accessibilityLabel={`Delete question ${index + 1}`}
                      >
                        <MaterialIcons name="delete-outline" size={20} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    {editing ? renderEditor(q) : renderReadOnly(q)}
                    {!editing && renderAnswerBadge(q)}
                  </View>
                );
              })}

              <TouchableOpacity
                onPress={addManualQuestion}
                style={[ui.addQuestion, { borderColor: colors.primary + '60' }]}
              >
                <MaterialIcons name="add" size={20} color={colors.primary} />
                <Text style={[ui.addOptionText, { color: colors.primary }]}>
                  Add question manually
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {focused ? (
          <View
            style={[
              ui.symbolBar,
              { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border + '40' },
            ]}
          >
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ui.symbolTabs}
            >
              {SYMBOL_GROUPS.map((group, i) => (
                <TouchableOpacity
                  key={group.label}
                  onPress={() => setSymbolGroup(i)}
                  style={[
                    ui.symbolTab,
                    symbolGroup === i && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      ui.symbolTabText,
                      { color: symbolGroup === i ? colors.btnTextColor : colors.text },
                    ]}
                  >
                    {group.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ui.symbolRow}
            >
              {SYMBOL_GROUPS[symbolGroup].symbols.map(symbol => (
                <TouchableOpacity
                  key={symbol}
                  onPress={() => insertSymbol(symbol === '|x|' ? '||' : symbol)}
                  style={[ui.symbolKey, { backgroundColor: colors.background }]}
                >
                  <Text style={[ui.symbolText, { color: colors.textDarker }]}>{symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View
            style={[
              ui.footer,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: colors.background,
                borderTopColor: colors.border + '40',
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={!!saving}
              style={[ui.draftBtn, { borderColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            >
              {saving === 'draft' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[ui.draftText, { color: colors.primary }]}>Save draft</Text>
              )}
            </TouchableOpacity>
            <CustomButton
              title="Publish"
              iconName="send"
              onPress={handlePublish}
              isLoading={saving === 'publish'}
              disabled={!!saving}
              style={{ flex: 1, width: 'auto' }}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={showUploadSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadSheet(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={ui.sheetOverlay}
          onPress={() => setShowUploadSheet(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              ui.sheet,
              { backgroundColor: colors.backgroundSecondary, paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Text style={[ui.sheetTitle, { color: colors.textDarker }]}>
              Add more questions
            </Text>
            <Text style={[ui.heroText, { color: colors.text, textAlign: 'left', marginBottom: 14 }]}>
              New questions are added after question {questions.length}.
            </Text>
            <View style={ui.uploadGrid}>
              {uploadOptions.map(option => (
                <TouchableOpacity
                  key={option.label}
                  onPress={option.onPress}
                  style={[
                    ui.uploadTile,
                    { borderColor: colors.primary + '50', backgroundColor: colors.background },
                  ]}
                >
                  <MaterialIcons name={option.icon} size={26} color={colors.primary} />
                  <Text style={[ui.uploadLabel, { color: colors.textDarker }]}>{option.label}</Text>
                  <Text style={[ui.uploadSub, { color: colors.text }]}>{option.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!extracting} transparent animationType="fade">
        <View style={ui.sheetOverlayCenter}>
          <View style={[ui.extractCard, { backgroundColor: colors.backgroundSecondary }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[ui.extractTitle, { color: colors.textDarker }]}>
              Extracting questions
            </Text>
            <Text style={[ui.heroText, { color: colors.text }]} numberOfLines={2}>
              {extracting}
            </Text>
            <Text style={[ui.uploadSub, { color: colors.text, marginTop: 8 }]}>
              Long papers can take up to a minute.
            </Text>
          </View>
        </View>
      </Modal>

      {picker && (
        <DateTimePicker
          value={pickerValue()}
          mode={picker.mode}
          is24Hour
          display="default"
          minimumDate={picker.mode === 'date' ? new Date() : undefined}
          onChange={onPickerChange}
        />
      )}
    </SafeAreaView>
  );
};

const ui = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10 },
  hint: { fontSize: 12, marginTop: 10, opacity: 0.75 },
  heroCenter: { alignItems: 'center', paddingVertical: 6 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.85,
  },
  uploadGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  uploadTile: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  uploadLabel: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  uploadSub: { fontSize: 11, marginTop: 2, opacity: 0.7, textAlign: 'center' },
  manualLink: { alignSelf: 'center', paddingVertical: 14, marginTop: 4 },
  manualLinkText: { fontSize: 13.5, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallBtnText: { fontSize: 12.5, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  statChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statText: { fontSize: 12, fontWeight: '700' },
  qCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qNumber: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qNumberText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  qType: { flex: 1, fontSize: 12, fontWeight: '600', opacity: 0.75 },
  iconBtn: { padding: 6 },
  qText: { fontSize: 15, lineHeight: 22, fontWeight: '600', marginBottom: 10 },
  optionRead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: { fontSize: 12, fontWeight: '800' },
  optionReadText: { flex: 1, fontSize: 14, lineHeight: 20 },
  answerBox: { borderRadius: 12, padding: 12 },
  answerLabel: { fontSize: 11, fontWeight: '700', opacity: 0.7 },
  answerValue: { fontSize: 14, fontWeight: '600', marginTop: 3 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  optionEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  tfText: { flex: 1, fontSize: 14.5, fontWeight: '600', paddingVertical: 10 },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 2,
  },
  addOptionText: { fontSize: 13.5, fontWeight: '700' },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  doneText: { fontSize: 13.5, fontWeight: '700' },
  addQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  draftBtn: {
    flex: 0.7,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftText: { fontSize: 14, fontWeight: '700' },
  symbolBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  symbolTabs: { gap: 6, paddingHorizontal: 10, paddingBottom: 6 },
  symbolTab: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  symbolTabText: { fontSize: 12, fontWeight: '700' },
  symbolRow: { gap: 6, paddingHorizontal: 10 },
  symbolKey: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  symbolText: { fontSize: 18, fontWeight: '600' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  extractCard: {
    width: '82%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  extractTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
});

export default CreateAssessmentScreen;
