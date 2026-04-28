import { Attachment, listAttachments } from './expenses';

export type { Attachment };
export { listAttachments };

// TODO(後続Phase): 個別添付プレビュー API（GET /api/expenses/:id/attachments/:attId）
// が未実装のため、現在は legacy receipt のみ ReceiptPreviewDialog で表示する。
// API 実装後にここへ getAttachmentBlob / attachmentUrl を追加する。
