export default function Pagination({ page, total, limit, onPage }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button onClick={() => onPage(1)} disabled={page === 1}>«</button>
      <button onClick={() => onPage(page - 1)} disabled={page === 1}>‹</button>
      {pages[0] > 1 && <span className="page-ellipsis">…</span>}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={p === page ? 'active' : ''}
        >{p}</button>
      ))}
      {pages[pages.length - 1] < totalPages && <span className="page-ellipsis">…</span>}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</button>
      <button onClick={() => onPage(totalPages)} disabled={page === totalPages}>»</button>
      <span className="page-info">Page {page} of {totalPages} ({total} total)</span>
    </div>
  );
}
