import Link from "next/link";

/** Consistent top-of-page back affordance (classroom / exam / job). */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline">
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
