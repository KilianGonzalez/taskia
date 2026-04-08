import { Hero } from './Hero'
import { Benefits } from './Benefits'
import { ProductShowcase } from './ProductShowcase'
import { Testimonials } from './Testimonials'
import { Footer } from './Footer'

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Hero />
      <Benefits />
      <ProductShowcase />
      <Testimonials />
      <Footer />
    </main>
  )
}