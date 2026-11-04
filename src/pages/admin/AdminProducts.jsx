import { useState } from 'react'
import { useProducts } from '../../context/ProductContext.jsx'
import { formatPrice } from '../../utils/money.js'
import Modal from '../../components/Modal.jsx'
import './AdminProducts.css'

export default function AdminProducts() {
  const { products, toggleAvailability, deleteProduct, addProduct, resetToSeed } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
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
        <h2>Product Inventory ({products.length})</h2>
        <div className="admin-actions">
          <button type="button" onClick={resetToSeed} className="btn-secondary">
            Reset to Seed Data
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            + Add New Species
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Water</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
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
            ))}
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
