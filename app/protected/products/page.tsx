import { getProducts } from '@/lib/actions/products'
import { AddProductModal } from '@/components/products/AddProductModal'
import { ProductsList } from '@/components/products/ProductsList'

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'} in your catalog
          </p>
        </div>
        {products.length > 0 && <AddProductModal />}
      </div>

      <ProductsList products={products} />
    </div>
  )
}
