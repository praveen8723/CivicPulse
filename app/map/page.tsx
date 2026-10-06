import { Suspense } from "react";
import { CityMapPage } from "@/components/CityMapPage";
export default function Page() {
  return (
    <Suspense fallback={<div className="empty-state">Loading city map…</div>}>
      <CityMapPage />
    </Suspense>
  );
}
