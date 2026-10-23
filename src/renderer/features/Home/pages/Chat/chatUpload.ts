const MEDIA_UPLOAD_URL = 'https://media.vision20.us/v1/upload';

/** Uploads a chat attachment to the media server (same endpoint as mobile). */
export async function uploadAttachment(file: File): Promise<string> {
  const form = new FormData();
  form.append('type', 'messenger');
  form.append('object_id', '0');
  form.append('file', file, file.name);
  const res = await fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      appplatform: navigator.userAgent.includes('Mac') ? 'MacOs' : 'Windows',
    },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  const url = body?.url ?? body?.data?.url;
  if (!res.ok || !url) throw new Error('upload failed');
  return url;
}
