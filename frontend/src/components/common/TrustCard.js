const TrustCard = ({ icon, title, desc }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center md:flex-row md:items-start md:gap-4 md:text-left">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-[#FFC366]">
        {icon}
      </div>
      <div>
        <h3 className="text-[10px] font-semibold leading-tight text-zinc-900 dark:text-white md:text-sm">{title}</h3>
        <p className="mt-1 text-[9px] leading-relaxed text-zinc-500 dark:text-white/40 md:text-xs">{desc}</p>
      </div>
    </div>
  );
};

export default TrustCard;
