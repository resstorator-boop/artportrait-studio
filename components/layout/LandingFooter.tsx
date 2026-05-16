import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-hairline bg-page py-12">
      <div className="mx-auto flex max-w-container flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-heading text-base text-ink">ArtPortrait Studio</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-muted">
          <Link href="/sign-in" className="hover:text-ink">
            Войти
          </Link>
          <Link href="/sign-up" className="hover:text-ink">
            Регистрация
          </Link>
          <a href="#faq" className="hover:text-ink">
            FAQ
          </a>
        </div>
        <p className="font-mono text-[11px] text-muted">
          © {new Date().getFullYear()} ArtPortrait Studio
        </p>
      </div>
    </footer>
  );
}
