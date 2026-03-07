import React from "react";

const TrustCard = ({ icon, title, desc }) => {
  return (
    <div className="flex flex-col items-center text-center bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300">

      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-black-500 text-black mb-4 text-xl">
        {icon}
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {title}
      </h3>

      <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
        {desc}
      </p>

    </div>
  );
};

export default TrustCard;