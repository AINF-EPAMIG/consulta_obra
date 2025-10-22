"use client";
import Image from "next/image";

export default function MobileHeader() {
  return (
    <header
      className="w-full py-3 px-4 shadow-md flex justify-center items-center"
      style={{
        background: "linear-gradient(110deg, #3A8144 70%, #49a678 100%)"
      }}
    >
      <div className="relative w-28 h-8 sm:w-32 sm:h-10">
        <Image
          src="/logo_branca.svg"
          alt="Logo EPAMIG"
          fill
          className="object-contain"
          priority
        />
      </div>
    </header>
  );
}
