import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
            TaskIA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Tu semana bajo control inteligente
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8 text-lg">
              Empezar ahora
            </Button>
            <Button variant="outline" size="lg" className="px-8 text-lg">
              Ver demo
            </Button>
          </div>
        </div>

        {/* Paleta de colores */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Paleta TaskIA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Primary</CardTitle>
                <CardDescription>#0f152b</CardDescription>
              </CardHeader>
              <CardContent className="h-32 bg-primary rounded-md" />
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Secondary</CardTitle>
                <CardDescription>#2ec9a7</CardDescription>
              </CardHeader>
              <CardContent className="h-32 bg-secondary rounded-md" />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Muted</CardTitle>
                <CardDescription>Gris suave</CardDescription>
              </CardHeader>
              <CardContent className="h-32 bg-muted rounded-md flex items-center justify-center">
                <span className="text-muted-foreground font-medium">Perfecto</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card</CardTitle>
                <CardDescription>Fondo neutro</CardDescription>
              </CardHeader>
              <CardContent className="h-32 bg-card rounded-md shadow-sm flex items-center justify-center">
                <span className="text-card-foreground font-medium">Listo</span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botones */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Componentes Shadcn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center">
            <div className="space-y-2">
              <Button className="px-8">Primary</Button>
              <Button variant="secondary" className="px-8">Secondary</Button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" className="px-8">Outline</Button>
              <Button variant="ghost" className="px-8">Ghost</Button>
            </div>
            <div className="space-y-2">
              <Button variant="destructive" className="px-8">Danger</Button>
              <Button size="sm" className="px-8">Small</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
