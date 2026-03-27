const TrustCard = ({ icon, title, desc }) => {
  return (
    <div className="flex flex-col items-center gap-2 text-center md:flex-row md:items-start md:gap-4 md:text-left">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-semibold leading-tight text-zinc-800 md:text-sm">{title}</h3>
        <p className="mt-1 hidden text-xs leading-relaxed text-zinc-400 md:block">{desc}</p>
      </div>
    </div>
  );
};

export default TrustCard;
