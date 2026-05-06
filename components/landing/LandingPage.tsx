import { Hero } from './Hero'
import { Benefits } from './Benefits'
import { ProductShowcase } from './ProductShowcase'
import { Testimonials } from './Testimonials'
import { Footer } from './Footer'

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <Benefits />
      <ProductShowcase />
      <Testimonials />
      <Footer />
    </main>
  )
}
