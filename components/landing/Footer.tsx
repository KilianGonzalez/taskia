import { Instagram, Twitter, Youtube } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Características', href: '#features' },
      { label: 'Precios', href: '#pricing' },
      { label: 'Testimonios', href: '#testimonials' },
      { label: 'FAQ', href: '#faq' },
    ],
    legal: [
      { label: 'Privacidad', href: '#privacy' },
      { label: 'Términos de uso', href: '#terms' },
      { label: 'Cookies', href: '#cookies' },
    ],
    support: [
      { label: 'Contacto', href: '#contact' },
      { label: 'Ayuda', href: '#help' },
      { label: 'Blog', href: '#blog' },
    ],
  }

  return (
    <footer className="bg-[#1D2155] text-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4EC4A9] to-[#20589A]">
                  <span className="text-lg font-bold text-white">T</span>
                </div>
                <h3 className="text-xl font-semibold">TaskIA</h3>
              </div>

              <p className="mb-6 max-w-sm leading-relaxed text-white/80">
                El planificador inteligente que ayuda a estudiantes a organizar su
                semana sin estrés. Con IA que entiende tu ritmo.
              </p>

              <div className="flex gap-3">
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-all hover:bg-white/20"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" strokeWidth={2} />
                </a>

                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-all hover:bg-white/20"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" strokeWidth={2} />
                </a>

                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-all hover:bg-white/20"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" strokeWidth={2} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Producto</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/80 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/80 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Soporte</h4>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/80 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-white/70">
              © {currentYear} TaskIA. Todos los derechos reservados.
            </p>

            <div className="flex items-center gap-6 text-sm">
              <a href="#privacy" className="text-white/70 transition-colors hover:text-white">
                Privacidad
              </a>
              <a href="#terms" className="text-white/70 transition-colors hover:text-white">
                Términos
              </a>
              <a href="#contact" className="text-white/70 transition-colors hover:text-white">
                Contacto
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}