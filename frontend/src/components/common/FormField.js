import { cloneElement, isValidElement } from "react";

/**
 * Champ de formulaire accessible (lot H4) : le label est relié au champ,
 * et l'erreur est annoncée et rattachée au champ par aria-describedby.
 * Sans `id`, le comportement reste celui d'avant (label simple).
 */
export default function FormField({ id, label, error, children }) {
  const errorId = id ? `${id}-error` : undefined;
  const field = id && isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })
    : children;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-white/40">
        {label}
      </label>
      {field}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
