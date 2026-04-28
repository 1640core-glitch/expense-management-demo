import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Category,
  ExpenseInput,
  createExpense,
  getExpense,
  listCategories,
  submitExpense,
  updateExpense,
  getReceiptBlob,
} from '../api/expenses';
import { Template, listTemplates } from '../api/templates';

interface FieldErrors {
  category_id?: string;
  amount?: string;
  expense_date?: string;
  title?: string;
}

export default function ExpenseFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [expenseId, setExpenseId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [expenseDate, setExpenseDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [receiptBlobUrl, setReceiptBlobUrl] = useState<string | null>(null);
  const [receiptMime, setReceiptMime] = useState<string>('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await listCategories();
        if (cancelled) return;
        setCategories(cats);
        try {
          const tpls = await listTemplates();
          if (cancelled) return;
          setTemplates(tpls);
        } catch (err: unknown) {
          console.error('テンプレート一覧の取得に失敗しました', err);
        }
        if (isEdit && id) {
          const exp = await getExpense(Number(id));
          if (cancelled) return;
          if (exp.status !== 'draft') {
            setError('この申請は下書きではないため編集できません。');
          }
          setExpenseId(exp.id);
          setStatus(exp.status);
          setExpenseDate(exp.expense_date);
          setAmount(String(exp.amount));
          setCategoryId(String(exp.category_id));
          setTitle(exp.title ?? '');
          setDescription(exp.description ?? '');
          setExistingReceipt(exp.receipt_path);
          if (exp.receipt_path) {
            try {
              const blob = await getReceiptBlob(exp.id);
              if (cancelled) return;
              const url = URL.createObjectURL(blob);
              setReceiptBlobUrl(url);
              setReceiptMime(blob.type || '');
            } catch (err: unknown) {
              console.error('領収書の取得に失敗しました', err);
            }
          }
        } else {
          const today = new Date().toISOString().slice(0, 10);
          setExpenseDate(today);
        }
      } catch (err: unknown) {
        console.error('読み込みに失敗しました', err);
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          '読み込みに失敗しました';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    return () => {
      if (receiptBlobUrl) URL.revokeObjectURL(receiptBlobUrl);
    };
  }, [receiptBlobUrl]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const t = templates.find((tpl) => String(tpl.id) === templateId);
    if (!t) return;
    setCategoryId(String(t.category_id));
    if (t.amount != null) setAmount(String(t.amount));
    if (t.title) setTitle(t.title);
    if (t.description) setDescription(t.description);
  };

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!categoryId) errs.category_id = 'カテゴリは必須です';
    if (!amount) {
      errs.amount = '金額は必須です';
    } else {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) errs.amount = '金額は0より大きい数値を入力してください';
    }
    if (!expenseDate) errs.expense_date = '申請日は必須です';
    return errs;
  };

  const buildInput = (): ExpenseInput => ({
    category_id: Number(categoryId),
    amount: Number(amount),
    expense_date: expenseDate,
    title: title || undefined,
    description: description || undefined,
    receipt: receipt,
  });

  const persist = async (): Promise<number | null> => {
    const input = buildInput();
    if (isEdit && expenseId !== null) {
      const updated = await updateExpense(expenseId, input);
      return updated.id;
    }
    const created = await createExpense(input);
    setExpenseId(created.id);
    return created.id;
  };

  const handleSaveDraft = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      await persist();
      navigate('/expenses', { replace: true });
    } catch (err: unknown) {
      console.error('保存に失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '保存に失敗しました';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const savedId = await persist();
      if (savedId === null) throw new Error('保存に失敗しました');
      await submitExpense(savedId);
      navigate('/expenses', { replace: true });
    } catch (err: unknown) {
      console.error('申請に失敗しました', err);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '申請に失敗しました';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>読み込み中...</p>
      </div>
    );
  }

  const readOnly = isEdit && status !== 'draft';

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>{isEdit ? '経費申請の編集' : '経費を申請する'}</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSaveDraft}>
        {!readOnly && templates.length > 0 && (
          <>
            <label>テンプレートから入力</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => applyTemplate(e.target.value)}
              disabled={readOnly}
              style={{ width: '100%', padding: '8px 10px', marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }}
            >
              <option value="">選択してください</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </>
        )}

        <label>申請日<span style={{ color: '#b91c1c' }}> *</span></label>
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          disabled={readOnly}
        />
        {fieldErrors.expense_date && <div className="error">{fieldErrors.expense_date}</div>}

        <label>金額<span style={{ color: '#b91c1c' }}> *</span></label>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={readOnly}
        />
        {fieldErrors.amount && <div className="error">{fieldErrors.amount}</div>}

        <label>カテゴリ<span style={{ color: '#b91c1c' }}> *</span></label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={readOnly}
          style={{ width: '100%', padding: '8px 10px', marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }}
        >
          <option value="">選択してください</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {fieldErrors.category_id && <div className="error">{fieldErrors.category_id}</div>}

        <label>用途・タイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={readOnly}
          placeholder="例: 取引先との会食"
        />

        <label>詳細</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={readOnly}
          rows={3}
          style={{ width: '100%', padding: '8px 10px', marginBottom: 12, border: '1px solid #ccc', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }}
        />

        <label>領収書画像（JPEG/PNG/GIF/WebP/PDF, 最大10MB）</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={(e) => setReceipt(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
          disabled={readOnly}
        />
        {existingReceipt && expenseId !== null && (
          <div style={{ fontSize: 13, marginTop: -8, marginBottom: 12 }}>
            <p style={{ margin: '0 0 6px' }}>
              現在の領収書:
              {receiptBlobUrl ? (
                <> <a className="link" href={receiptBlobUrl} target="_blank" rel="noreferrer">別タブで開く</a></>
              ) : (
                <> 読み込み中...</>
              )}
              {!readOnly && '（新しいファイルを選択すると差し替えられます）'}
            </p>
            {receiptBlobUrl && receiptMime.startsWith('image/') && (
              <img src={receiptBlobUrl} alt="領収書プレビュー" style={{ maxWidth: '100%', maxHeight: 320, border: '1px solid #ccc', borderRadius: 4 }} />
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" disabled={submitting || readOnly}>
            {submitting ? '送信中...' : '下書き保存'}
          </button>
          <button
            type="button"
            onClick={() => { void handleSubmitForApproval(); }}
            disabled={submitting || readOnly}
            style={{ background: '#16a34a' }}
          >
            申請する
          </button>
          <div style={{ flex: 1 }} />
          <Link className="link" to="/expenses" style={{ alignSelf: 'center' }}>キャンセル</Link>
        </div>
      </form>
    </div>
  );
}
