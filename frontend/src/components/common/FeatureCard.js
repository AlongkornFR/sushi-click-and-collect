export default function FeatureCard({ image, title, children }) {
  return (
    <div className="group flex flex-col rounded-3xl overflow-hidden border border-zinc-100 bg-white shadow-sm hover:shadow-xl transition-shadow duration-500">

      {/* Image */}
      <div className="relative aspect-4/3 overflow-hidden bg-zinc-100">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-108"
        />
        {/* subtle gradient at bottom of image */}
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6 gap-3">
        <h3 className="text-base font-bold text-zinc-900 leading-snug tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-zinc-500 leading-relaxed flex-1">{children}</p>

        {/* Decorative bottom accent */}
        <div className="mt-2 h-px w-10 bg-zinc-900 rounded-full transition-all duration-500 group-hover:w-full group-hover:bg-zinc-200" />
      </div>

    </div>
  );
}
