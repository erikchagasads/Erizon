import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import PlanGate from "@/components/PlanGate";
import { Loader2 } from "lucide-react";
import RelatorioDNAClient from "./RelatorioDNAClient";

function RelatorioDNAFallback() {
  return (
    <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-4xl mx-auto px-6 py-8 flex justify-center py-20">
          <Loader2 size={20} className="animate-spin text-purple-400" />
        </div>
      </div>
    </>
  );
}

export default function RelatorioDNAPage() {
  return (
    <PlanGate minPlan="command" feature="Profit DNA Report">
      <Suspense fallback={<RelatorioDNAFallback />}>
        <RelatorioDNAClient />
      </Suspense>
    </PlanGate>
  );
}
