import type { Metadata } from "next";
import { HistoryScreen } from "@/components/history/HistoryScreen";

export const metadata: Metadata = {
  title: "Interview history",
  description: "Your past mock interviews, scores and reports.",
};

export default function HistoryPage() {
  return <HistoryScreen />;
}
