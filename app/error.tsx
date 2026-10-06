"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page empty-state">
      <h1>We hit a bump in the road.</h1>
      <p>
        Your saved reports are still in this browser. Try loading this page
        again.
      </p>
      <button onClick={reset} className="button primary">
        Try again
      </button>
    </div>
  );
}
