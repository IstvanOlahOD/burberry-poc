/**
 * The accuracy-and-returns note.
 *
 * It used to sit at the foot of the right column, under the specification list,
 * which made that column run past the viewport while the left rail stopped dead
 * below three 76px thumbnails. Moving it across balances the two rails and keeps
 * the right column to things you act on — initials, size, filters, history.
 */
export function Details() {
  return (
    <div className="mt-12">
      <h3 className="brand-heading mb-3">Details</h3>
      <p className="brand-label mb-2 text-foreground">
        The image serves as an indication, and the final product may have small
        differences in the shades of color or material.
      </p>
      <p className="brand-label text-foreground">
        Once a product is personalized, it cannot be returned.
      </p>
    </div>
  );
}
