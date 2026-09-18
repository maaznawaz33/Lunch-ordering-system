// Text-based logo ("wordmark") used instead of an image file.
// size="lg" is the large centered version shown on auth pages (login,
// register, etc). The default (no size prop) is the small version used
// in the top navigation bar.
export default function BrandMark({ size }) {
  const className = size === 'lg' ? 'brand-mark brand-mark-lg' : 'brand-mark';
  return (
    <span className={className}>
      <span className="brand-mark-accent">Order</span> Your Lunch
    </span>
  );
}
