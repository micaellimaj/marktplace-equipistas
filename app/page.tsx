"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation" 
import { useAuth } from "@/contexts/AuthContext" 
import { Header } from "@/components/marketplace/header"
import { SidebarFilters, type ProductCategory } from "@/components/marketplace/sidebar-filters"
import { ProductGrid } from "@/components/marketplace/product-grid"
import { Button } from "@/components/ui/button"
import { productsService } from "@/services/productsService"
import { addressesService } from "@/services/addressesService"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface MappedProduct {
  id: string
  name: string
  images: string[]
  price: number
  category: string
  description: string
  city: string
  isOwnProduct: boolean
  seller: {
    name: string
    phone: string
    email: string
    whatsappLink: string
    emailLink: string
  }
}

export default function MarketplacePage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)

  const [activeCategory, setActiveCategory] = useState<ProductCategory>("TODAS")
  const [priceRange, setPriceRange] = useState([0, 500])
  const [searchTerm, setSearchTerm] = useState("")
  
  const [products, setProducts] = useState<MappedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados novos para Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [mounted, isAuthenticated, authLoading, router])

  useEffect(() => {
    async function loadMarketplaceData() {
      if (!mounted || !isAuthenticated) return

      try {
        setLoading(true)
        setError(null)

        let loggedUserId = ""
        const storedAuth = localStorage.getItem("@marketplace:user")
        if (storedAuth) {
          const parsedAuth = JSON.parse(storedAuth)
          loggedUserId = parsedAuth.id || parsedAuth.user?.id || ""
        }

        const [productsData, addressesData] = await Promise.all([
          productsService.getAll(),
          addressesService.getAll()
        ])

        const mapped: MappedProduct[] = productsData.map((product) => {
          const sellerAddresses = addressesData.filter(
            (addr: any) => addr.userId === product.userId
          )

          const lastAddress = sellerAddresses.sort((a: any, b: any) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime()
            const dateB = new Date(b.updatedAt || b.createdAt).getTime()
            return dateB - dateA
          })[0]

          const city = lastAddress ? lastAddress.cidade : "Não informada"
          const isOwnProduct = loggedUserId !== "" && product.userId === loggedUserId

          const rawPhone = product.user?.telefone || ""
          const cleanedPhone = rawPhone.replace(/\D/g, "")
          const whatsappLink = cleanedPhone ? `https://wa.me/55${cleanedPhone}` : "#"
          const emailLink = product.user?.email ? `mailto:${product.user.email}` : "#"

          return {
            id: product.id,
            name: product.nome,
            images: product.imagens && product.imagens.length > 0 
              ? product.imagens 
              : ["https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=400&fit=crop"],
            price: Number(product.preco),
            category: product.categoria,
            description: product.descricao,
            city,
            isOwnProduct,
            seller: {
              name: product.user?.nome || "Vendedor oculto",
              phone: rawPhone || "Não informado",
              email: product.user?.email || "Não informado",
              whatsappLink,
              emailLink
            }
          }
        })

        setProducts(mapped)
      } catch (err) {
        console.error("Erro ao carregar dados do marketplace:", err)
        setError("Não foi possível carregar os produtos do marketplace.")
      } finally {
        setLoading(false)
      }
    }

    if (mounted && !authLoading) {
      loadMarketplaceData()
    }
  }, [mounted, isAuthenticated, authLoading])

  // Volta para a página 1 se o usuário mudar de categoria, preço ou fizer uma nova busca
  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, priceRange, searchTerm])

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando marketplace...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    )
  }

  if (!isAuthenticated) return null

  // Filtros aplicados
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "TODAS" || product.category.toUpperCase() === activeCategory.toUpperCase()
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]
    
    const lowerSearch = searchTerm.toLowerCase().trim()
    const matchesSearch = 
      lowerSearch === "" ||
      product.name.toLowerCase().includes(lowerSearch) ||
      product.seller.name.toLowerCase().includes(lowerSearch) ||
      product.city.toLowerCase().includes(lowerSearch) ||
      product.description.toLowerCase().includes(lowerSearch) ||
      product.category.toLowerCase().includes(lowerSearch) ||
      product.price.toString().includes(lowerSearch)

    return matchesCategory && matchesPrice && matchesSearch
  })

  // Lógica da Paginação
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        
        {/* Mensagem de Boas-Vindas Condicional */}
        {user && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {user.role === "ADMIN" ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Modo Administrador: Olá, <span className="text-blue-600 dark:text-blue-400">{user.nome}</span>! 🛡️
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Painel de supervisão active. Monitore os produtos publicados, verifique os novos cadastros e garanta a integridade da plataforma Entre Equipistas.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  Olá, <span className="text-blue-600 dark:text-blue-400">{user.nome}</span>! 👋
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Seja muito bem-vindo à plataforma Entre Equipistas. O que você está procurando hoje?
                </p>
              </>
            )}
          </div>
        )}
        
        <div className="flex flex-col md:grid md:grid-cols-[280px_1fr] gap-6">
          <SidebarFilters
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          
          <main className="flex-1 flex flex-col justify-between min-h-[400px]">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-card w-full">
                <p className="text-muted-foreground">Nenhum produto corresponde aos filtros ou busca digitada.</p>
              </div>
            ) : (
              <div className="space-y-6 w-full">
                {/* Grid exibe apenas os 15 produtos fatiados da página atual */}
                <ProductGrid products={currentProducts} />

                {/* Componente de Paginação Visual */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl h-9 w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="text-sm font-medium text-muted-foreground px-2">
                      Página <span className="text-foreground font-semibold">{currentPage}</span> de <span className="text-foreground font-semibold">{totalPages}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl h-9 w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}