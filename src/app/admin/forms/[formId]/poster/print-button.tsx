'use client';

export function PrintButton() {
  return (
    <button type="button" className="btn btn--primary" onClick={() => window.print()}>
      列印 / 另存 PDF
    </button>
  );
}
