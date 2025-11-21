import { Suspense } from "react";
import RolodexClient from "./RolodexClient";

export default function RolodexPage() {
  return (
    <Suspense fallback={<div className="rolodex-loading">Loading Rolodex…</div>}>
      <RolodexClient />
    </Suspense>
  );
}
