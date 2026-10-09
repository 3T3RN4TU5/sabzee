import type { Metadata } from "next";
import { InterviewScreen } from "@/components/interview/InterviewScreen";

export const metadata: Metadata = {
  title: "Interview in progress",
  robots: { index: false },
};

export default function InterviewPage() {
  return <InterviewScreen />;
}
