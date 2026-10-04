import { MARGARET } from "@/demo/margaret";
import { Landing, QLOO_SAMPLE_COUNT } from "@/features/landing/Landing";
import { loadDemoSampleCues } from "@/server/kit/demoKit";

export default async function Home() {
  const sampleCues = await loadDemoSampleCues(QLOO_SAMPLE_COUNT);
  return <Landing seeds={MARGARET.seeds} sampleCues={sampleCues} />;
}
