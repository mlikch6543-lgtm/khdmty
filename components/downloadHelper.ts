export async function downloadOrShareFile(blob: Blob, filename: string): Promise<boolean> {
  // Check if Web Share API is supported for files on the device (mobile browsers/WebViews)
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: `تصدير ملف: ${filename}`
        });
        return true; // Successfully shared
      }
    } catch (err) {
      console.error("Web Share failed, falling back to standard download:", err);
    }
  }

  // Fallback to standard <a> download for desktop and WebViews that don't support file sharing
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Give it a small timeout before revoking to ensure download initiates successfully
  setTimeout(() => URL.revokeObjectURL(url), 300);
  return false;
}
