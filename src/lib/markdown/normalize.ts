export function normalizeLLMMarkdown(src: string) {
    if (!src) return src;
    let s = src;
  
    s = s.replace(/\\\*\\\*/g, '**');
    s = s.replace(/([^\n])\s(\d+\.\s)/g, '$1\n$2');
    s = s.replace(/([^\n])\s\*\s(?!\*)/g, '$1\n* ');
    s = s.replace(/([^\n])\s\*\s(\d+\.\s)/g, '$1\n* $2');
    s = s.replace(/([^\n])\n(\*|\d+\.)/g, '$1\n\n$2');
  
    return s.trim();
  }
  