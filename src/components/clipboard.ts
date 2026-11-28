/*
 * Copy text from a plugin page. The async clipboard first; a web view that refuses it (no permission, not a secure
 * context) gets the old way, a hidden field and execCommand. Returns whether anything was copied. When nothing was and
 * `select` is given, that element's text is selected, so Ctrl/Cmd+C copies it: say so to the user.
 */
export async function copyText(text: string, select?: HTMLElement | null): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* refused: try the old way */ }
  try {
    const field = document.createElement('textarea');
    field.value = text; field.setAttribute('readonly', ''); field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(field); field.select();
    const ok = document.execCommand('copy');
    field.remove();
    if (ok) return true;
  } catch { /* not there either */ }
  const selection = select && getSelection();
  if (select && selection) { const range = document.createRange(); range.selectNodeContents(select); selection.removeAllRanges(); selection.addRange(range); }
  return false;
}
