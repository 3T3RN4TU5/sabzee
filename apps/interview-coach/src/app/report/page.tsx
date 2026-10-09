import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportScreen, ReportSkeleton } from "@/components/report/ReportScreen";

export const metadata: Metadata = {
  title: "Interview report",
  robots: { index: false },
};

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton label="Loading report…" />}>
      <ReportScreen />
    </Suspense>
  );
}
