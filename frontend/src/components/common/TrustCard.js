const TrustCard = ({ icon, title, desc }) => {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold leading-tight text-zinc-800">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{desc}</p>
      </div>
    </div>
  );
};

export default TrustCard;
