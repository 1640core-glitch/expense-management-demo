import { ChangeEvent, useState } from 'react';
import { Button, Card, CardBody, CardFooter, CardHeader, Table } from '../../components/ui';
import type { TableColumn } from '../../components/ui/Table/types';
import { ImportError, ImportResult, uploadExpensesCsv } from '../../api/import';
import { notifyApiError, notifySuccess } from '../../lib/toast';

type Step = 'select' | 'preview' | 'result';

const REQUIRED_HEADERS = ['user_id', 'category_id', 'amount', 'expense_date'];
const PREVIEW_ROWS = 10;

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  missingHeaders: string[];
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string) => line.split(',').map((c) => c.trim());
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

export default function AdminImportPage() {
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleNextToPreview = async () => {
    if (!file) return;
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      setPreview({
        headers,
        rows: rows.slice(0, PREVIEW_ROWS),
        totalRows: rows.length,
        missingHeaders,
      });
      setStep('preview');
    } catch (err) {
      console.error('CSVの読み込みに失敗しました', err);
      notifyApiError(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadExpensesCsv(file);
      setResult(res);
      notifySuccess(`${res.inserted}/${res.total} 件を取り込みました`);
      setStep('result');
    } catch (err) {
      console.error('CSVのアップロードに失敗しました', err);
      notifyApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const previewColumns: TableColumn<string[]>[] =
    preview?.headers.map((h, i) => ({
      key: `${h}-${i}`,
      header: h,
      accessor: (row) => row[i] ?? '',
    })) ?? [];

  const errorColumns: TableColumn<ImportError>[] = [
    { key: 'row', header: '行番号', accessor: (r) => r.row, width: 100 },
    { key: 'message', header: 'エラー内容', accessor: (r) => r.message },
  ];

  return (
    <div className="home" style={{ maxWidth: 1000 }}>
      <h1>CSVインポート</h1>

      {step === 'select' && (
        <Card>
          <CardHeader>
            <h2>1. CSVファイルを選択</h2>
          </CardHeader>
          <CardBody>
            <p>必須ヘッダ: {REQUIRED_HEADERS.join(', ')}</p>
            <p>※ dry-run モードはありません。アップロード時に実データに反映されます。</p>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={loading} />
          </CardBody>
          <CardFooter>
            <Button onClick={handleNextToPreview} disabled={!file || loading}>
              プレビューへ
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 'preview' && preview && (
        <Card>
          <CardHeader>
            <h2>2. プレビュー</h2>
          </CardHeader>
          <CardBody>
            <p>合計行数: {preview.totalRows} 行（先頭 {Math.min(PREVIEW_ROWS, preview.totalRows)} 行を表示）</p>
            {preview.missingHeaders.length > 0 ? (
              <p style={{ color: 'red' }}>
                必須ヘッダが不足しています: {preview.missingHeaders.join(', ')}
              </p>
            ) : (
              <p>必須ヘッダ確認: OK</p>
            )}
            <p>※ dry-run モードはありません。実行するとデータが登録されます。</p>
            <Table
              columns={previewColumns}
              data={preview.rows}
              rowKey={(_row, i) => i}
              emptyText="データ行がありません"
            />
          </CardBody>
          <CardFooter>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={handleReset} disabled={loading}>
                戻る
              </Button>
              <Button
                onClick={handleUpload}
                disabled={loading || preview.missingHeaders.length > 0 || preview.totalRows === 0}
              >
                {loading ? 'アップロード中...' : 'アップロード実行'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {step === 'result' && result && (
        <Card>
          <CardHeader>
            <h2>3. 結果</h2>
          </CardHeader>
          <CardBody>
            <p>
              成功: {result.inserted} / {result.total} 件
            </p>
            <p>エラー: {result.errors.length} 件</p>
            <Table
              columns={errorColumns}
              data={result.errors}
              rowKey={(row, i) => `${row.row}-${i}`}
              emptyText="エラーはありません"
            />
          </CardBody>
          <CardFooter>
            <Button onClick={handleReset}>新しいファイルをインポート</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
