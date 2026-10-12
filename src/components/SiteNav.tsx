import Link from "next/link";

type Props = {
  active: "practice" | "hub";
};

export function SiteNav({ active }: Props) {
  return (
    <nav className="site-nav" aria-label="主要導覽">
      <Link href="/" className="site-nav-brand">
        課練<span>遊</span>
      </Link>
      <div className="site-nav-links">
        <Link
          href="/"
          className={active === "practice" ? "nav-link on" : "nav-link"}
        >
          個人練習
        </Link>
        <Link
          href="/hub"
          className={active === "hub" ? "nav-link on" : "nav-link"}
        >
          六級遊戲庫
        </Link>
      </div>
    </nav>
  );
}
