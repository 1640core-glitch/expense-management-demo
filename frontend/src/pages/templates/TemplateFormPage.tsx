import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TemplateForm from './TemplateForm';
import {
  Template,
  TemplateInput,
  createTemplate,
  listTemplates,
  updateTemplate,
} from '../../api/templates';
import { notifyApiError, notifySuccess } from '../../lib/toast';

export default function TemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Template | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listTemplates();
        if (cancelled) return;
        const found = list.find((t) => t.id === Number(id));
        if (!found) {
          setError('テンプレートが見つかりません');
        } else {
          setInitial(found);
        }
      } catch (err) {
        console.error('テンプレートの取得に失敗しました', err);
        notifyApiError(err);
        setError('読み込みに失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleSubmit = async (input: TemplateInput) => {
    setSubmitting(true);
    try {
      if (isEdit && initial) {
        await updateTemplate(initial.id, input);
        notifySuccess('テンプレートを更新しました');
      } else {
        await createTemplate(input);
        notifySuccess('テンプレートを作成しました');
      }
      navigate('/templates');
    } catch (err) {
      console.error('保存に失敗しました', err);
      notifyApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/templates');
  };

  if (loading) {
    return (
      <div className="container">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1>{isEdit ? 'テンプレートの編集' : 'テンプレートの新規作成'}</h1>
      <TemplateForm
        initial={initial}
        submitting={submitting}
        submitLabel={isEdit ? '更新する' : '作成する'}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
