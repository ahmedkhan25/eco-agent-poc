import dynamic from "next/dynamic";

const EcoHeartMap = dynamic(() => import("./map-container"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{
        backgroundColor: "#f6f3ee",
        backgroundImage: "radial-gradient(circle, #c1c8c2 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex flex-col items-center gap-3 opacity-60">
        <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[#414844] font-medium">
          Loading map...
        </span>
      </div>
    </div>
  ),
});

export default EcoHeartMap;
