import { useState } from 'react'
import { useProducts } from '../../context/ProductContext.jsx'
import { formatPrice } from '../../utils/money.js'
import Modal from '../../components/Modal.jsx'
import './AdminProducts.css'

export default function AdminProducts() {
  const { products, toggleAvailability, updateProduct, deleteProduct, addProduct, resetToSeed } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const [newFish, setNewFish] = useState({
    name: '',
    price: '',
    image: '/images/placeholder.svg',
    waterType: 'Freshwater',
    careLevel: 'Beginner',
    temperament: 'Peaceful',
    minTankSize: '10',
    diet: 'Flakes',
    description: '',
    stock: '10',
    isAvailable: true,
  })
  const [errors, setErrors] = useState({})

  // Multi-select helpers
  const allSelected = products.length > 0 && selectedIds.length === products.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map((p) => p.id))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Bulk actions
  const handleBulkHide = () => {
    selectedIds.forEach((id) => {
      updateProduct(id, { isAvailable: false })
    })
    setSelectedIds([])
  }

  const handleBulkShow = () => {
    selectedIds.forEach((id) => {
      updateProduct(id, { isAvailable: true })
    })
    setSelectedIds([])
  }

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      selectedIds.forEach((id) => {
        deleteProduct(id)
      })
      setSelectedIds([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setNewFish((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const res = addProduct(newFish)
    if (!res.ok) {
      if (res.error?.details) setErrors(res.error.details)
      else alert(res.error?.message || 'Failed to add product')
      return
    }
    setModalOpen(false)
    setNewFish({
      name: '',
      price: '',
      image: '/images/placeholder.svg',
      waterType: 'Freshwater',
      careLevel: 'Beginner',
      temperament: 'Peaceful',
      minTankSize: '10',
      diet: 'Flakes',
      description: '',
      stock: '10',
      isAvailable: true,
    })
    setErrors({})
  }

  return (
    <div className="admin-products-page">
      <div className="admin-header-row">
        <div>
          <h2>Product Inventory ({products.length})</h2>
          <p className="admin-subtitle">Manage species listings, live stock, and availability visibility.</p>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={resetToSeed} className="btn-secondary">
            Reset to Seed Data
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            + Add New Species
          </button>
        </div>
      </div>

      {/* Bulk action bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-toolbar">
          <span className="bulk-count">
            <strong>{selectedIds.length}</strong> product{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="bulk-buttons">
            <button type="button" onClick={handleBulkShow} className="btn-bulk btn-bulk-show">
              👁️ Show Selected
            </button>
            <button type="button" onClick={handleBulkHide} className="btn-bulk btn-bulk-hide">
              🚫 Hide Selected
            </button>
            <button type="button" onClick={handleBulkDelete} className="btn-bulk btn-bulk-delete">
              🗑️ Delete Selected
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="btn-bulk-cancel">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all products"
                />
              </th>
              <th>Name</th>
              <th>Water</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isSelected = selectedIds.includes(p.id)
              return (
                <tr key={p.id} className={isSelected ? 'row-selected' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.waterType}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>
                    <span className={`status-tag ${p.isAvailable ? 'available' : 'hidden'}`}>
                      {p.isAvailable ? 'Available' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleAvailability(p.id)}
                      className="btn-action"
                    >
                      {p.isAvailable ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) deleteProduct(p.id)
                      }}
                      className="btn-action btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Species">
        <form onSubmit={handleCreate} className="admin-form">
          <div className="form-group">
            <label>Species Name</label>
            <input name="name" value={newFish.name} onChange={handleInputChange} required />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Price ($)</label>
              <input name="price" type="number" step="0.01" value={newFish.price} onChange={handleInputChange} required />
              {errors.price && <span className="field-error">{errors.price}</span>}
            </div>
            <div className="form-group">
              <label>Initial Stock</label>
              <input name="stock" type="number" value={newFish.stock} onChange={handleInputChange} required />
              {errors.stock && <span className="field-error">{errors.stock}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Water Type</label>
              <select name="waterType" value={newFish.waterType} onChange={handleInputChange}>
                <option value="Freshwater">Freshwater</option>
                <option value="Saltwater">Saltwater</option>
              </select>
            </div>
            <div className="form-group">
              <label>Care Level</label>
              <select name="careLevel" value={newFish.careLevel} onChange={handleInputChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Image URL</label>
            <input name="image" value={newFish.image} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" rows={3} value={newFish.description} onChange={handleInputChange} required />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
            Save Species
          </button>
        </form>
      </Modal>
    </div>
  )
}
