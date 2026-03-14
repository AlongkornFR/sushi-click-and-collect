export default function FeatureCard({ image, text }) {
  return (
    <div className="flex flex-col">
      
      <div className="bg-gray-200 aspect-square rounded-2xl overflow-hidden">
        <img
          src={image}
          alt="feature"
          className="w-full h-full object-cover"
        />
      </div>

      <p className="mt-4 text-sm text-gray-700 leading-relaxed">
        {text}
      </p>

    </div>
  );
}