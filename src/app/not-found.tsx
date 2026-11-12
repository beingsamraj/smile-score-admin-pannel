import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-[#142D52] px-4">
      <h1 className="text-6xl font-bold text-[#142D52] mb-2">404</h1>
      <p className="text-lg text-[#64748B] mb-6">Page not found</p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 bg-[#142D52] text-white rounded-lg text-sm font-semibold hover:bg-[#1e3a66] transition shadow-sm"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
