export default function FeatureCard({ image, title, children }) {
  return (
    <div className="flex flex-col group">
      
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-200">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-base font-semibold text-black tracking-tight">
          {title}
        </h3>

        <p className="text-sm text-gray-600 leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}