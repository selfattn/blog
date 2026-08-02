export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function readingTime(body: string | undefined): string {
  const cjk = (body?.match(/[一-鿿]/g) || []).length;
  const words = (body?.match(/[a-zA-Z0-9_]+/g) || []).length;
  const minutes = Math.max(1, Math.ceil(cjk / 350 + words / 200));
  return `${minutes} 分钟`;
}
