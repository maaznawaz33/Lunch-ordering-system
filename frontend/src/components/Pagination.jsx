// Simple Prev/Next pagination control.
// Renders nothing when there's only one page (nothing to paginate).
//
// Usage:
//   const [page, setPage] = useState(1);
//   const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
//   const visibleItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
//   <Pagination page={page} totalPages={totalPages} onChange={setPage} />
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Prev
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  );
}
