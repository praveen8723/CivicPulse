import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page empty-state">
      <h1>This street leads somewhere else.</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="button primary">
        Back to CivicPulse
      </Link>
    </div>
  );
}
