import { useState, useMemo } from 'react'
import { useProducts } from '../context/ProductContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import './Catalog.css'

export default function Catalog() {
  const { availableProducts } = useProducts()
  const [waterFilter, setWaterFilter] = useState('')
  const [careFilter, setCareFilter] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return availableProducts.filter((p) => {
      if (waterFilter && p.waterType !== waterFilter) return false
      if (careFilter && p.careLevel !== careFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesDiet = p.diet.toLowerCase().includes(q)
        const matchesBadge = p.badges?.some((b) => b.toLowerCase().includes(q))
        if (!matchesName && !matchesDiet && !matchesBadge) return false
      }
      return true
    })
  }, [availableProducts, waterFilter, careFilter, search])

  return (
    <div className="container catalog-page">
      <h1>Fish Catalog</h1>
      <FilterBar
        waterFilter={waterFilter}
        setWaterFilter={setWaterFilter}
        careFilter={careFilter}
        setCareFilter={setCareFilter}
        search={search}
        setSearch={setSearch}
      />
      {filtered.length === 0 ? (
        <p className="no-products">No species match your criteria.</p>
      ) : (
        <div className="products-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
