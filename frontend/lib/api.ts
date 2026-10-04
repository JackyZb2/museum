import { Artifact, Asset, DocumentItem } from '../types';
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${base}/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error('无法连接后端服务，请确认后端已启动。已填写内容保留，请稍后重试。');
  }
  const body = await r.json().catch(() => null);
  if (!body) throw new Error('后端响应格式异常，请稍后重试。');
  if (!r.ok)
    throw new Error(
      body.message ||
        (typeof body.detail === 'string' ? body.detail : '') ||
        '操作失败，请检查输入后重试。',
    );
  return body.data;
}
export const getArtifacts = (search = '') =>
  request<Artifact[]>(`/artifacts${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getArtifact = (id: string) => request<Artifact>(`/artifacts/${id}`);
export const createArtifact = (data: Partial<Artifact>) =>
  request<Artifact>('/artifacts', {
    method: 'POST',
    body: JSON.stringify({ museum_id: 1, ...data }),
  });
export const updateArtifact = (id: string, data: Partial<Artifact>) =>
  request<Artifact>(`/artifacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ museum_id: 1, ...data }),
  });
export const deleteArtifact = (id: number) =>
  request<{ deleted: boolean }>(`/artifacts/${id}`, { method: 'DELETE' });
export async function upload(id: string, file: File, kind: 'assets' | 'documents') {
  const form = new FormData();
  form.append('file', file);
  let r: Response;
  try {
    r = await fetch(`${base}/api/artifacts/${id}/${kind}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error('上传连接失败，请检查后端服务后重试。所选文件未清空。');
  }
  const b = await r.json().catch(() => null);
  if (!b) throw new Error('上传响应异常，请重试。');
  if (!r.ok)
    throw new Error(
      b.message || (typeof b.detail === 'string' ? b.detail : '') || '上传失败，请检查文件。',
    );
  return b.data as Asset | DocumentItem;
}
export const removeAsset = (id: number) => request(`/assets/${id}`, { method: 'DELETE' });
export const removeDocument = (id: number) => request(`/documents/${id}`, { method: 'DELETE' });
export const assetUrl = (path: string) => `${base}/${path.replaceAll('\\', '/')}`;
