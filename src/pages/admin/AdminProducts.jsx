import { useState, useRef } from 'react'
import { Fish, UtensilsCrossed, Camera, Pencil } from 'lucide-react'
import { useProducts } from '../../context/ProductContext.jsx'
import { formatPrice } from '../../utils/money.js'
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js'
import Modal from '../../components/Modal.jsx'
import './AdminProducts.css'

export default function AdminProducts() {
  const { products, toggleAvailability, updateProduct, deleteProduct, addProduct } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const initialFormState = {
    name: '',
    productType: 'fish',
    price: '',
    waterType: 'Freshwater',
    careLevel: 'Beginner',
    temperament: 'Peaceful',
    minTankSize: '10',
    diet: 'Flakes',
    description: '',
    stock: '10',
    isAvailable: true,
  }

  const [newFish, setNewFish] = useState(initialFormState)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})
  const fileInputRef = useRef(null)

  const resetForm = () => {
    setNewFish(initialFormState)
    setEditingProduct(null)
    setImageFile(null)
    setImagePreview(null)
    setErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenAdd = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleStartEdit = (p) => {
    setErrors({})
    setEditingProduct(p)
    setNewFish({
      name: p.name || '',
      productType: p.productType || 'fish',
      price: String(p.price ?? ''),
      waterType: p.waterType || 'Freshwater',
      careLevel: p.careLevel || 'Beginner',
      temperament: p.temperament || 'Peaceful',
      minTankSize: String(p.minTankSize ?? 10),
      diet: p.diet || 'Flakes',
      description: p.description || '',
      stock: String(p.stock ?? 10),
      isAvailable: p.isAvailable !== false,
    })
    setImageFile(null)
    setImagePreview(p.image || null)
    setModalOpen(true)
  }

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file (PNG, JPG, WEBP, SVG).')
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setErrors({})
    setUploading(true)

    try {
      let finalImageUrl = editingProduct?.image || '/images/placeholder.svg'

      if (imageFile) {
        if (isSupabaseConfigured) {
          try {
            const fileExt = imageFile.name.split('.').pop()
            const cleanName = imageFile.name.replace(/[^a-zA-Z0-9]/g, '_')
            const fileName = `${Date.now()}_${cleanName}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, imageFile, {
                cacheControl: '3600',
                upsert: true,
              })

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName)
              finalImageUrl = publicUrlData.publicUrl
            } else {
              console.warn('[Storage upload fallback to Data URL]:', uploadError)
              finalImageUrl = imagePreview || finalImageUrl
            }
          } catch (storageErr) {
            console.warn('[Storage error, using image preview]:', storageErr)
            finalImageUrl = imagePreview || finalImageUrl
          }
        } else {
          finalImageUrl = imagePreview || finalImageUrl
        }
      } else if (imagePreview) {
        finalImageUrl = imagePreview
      }

      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, {
          ...newFish,
          price: Number(newFish.price),
          stock: Number(newFish.stock),
          minTankSize: Number(newFish.minTankSize || 10),
          image: finalImageUrl,
        })

        if (!res.ok) {
          if (res.error?.details) setErrors(res.error.details)
          else alert(res.error?.message || 'Failed to update product')
          return
        }
      } else {
        const res = await addProduct({
          ...newFish,
          image: finalImageUrl,
        })

        if (!res.ok) {
          if (res.error?.details) setErrors(res.error.details)
          else alert(res.error?.message || 'Failed to add product')
          return
        }
      }

      setModalOpen(false)
      resetForm()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="admin-products-page">
      <div className="admin-header-row">
        <div>
          <h1>Product Inventory</h1>
          <p className="admin-subtitle">
            Manage aquatic species, stock levels, pricing, and visibility.
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={handleOpenAdd} className="btn-primary">
            + Add New Species
          </button>
        </div>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-toolbar">
          <div className="bulk-count">
            <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'species' : 'species'} selected
          </div>
          <div className="bulk-buttons">
            <button type="button" onClick={handleBulkShow} className="btn-bulk btn-bulk-show">
              Show Selected
            </button>
            <button type="button" onClick={handleBulkHide} className="btn-bulk btn-bulk-hide">
              Hide Selected
            </button>
            <button type="button" onClick={handleBulkDelete} className="btn-bulk btn-bulk-delete">
              Delete Selected
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="btn-bulk-cancel">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="admin-table-wrap">
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
              <th>Category</th>
              <th>Preview</th>
              <th>Name</th>
              <th>Type / Water</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isSelected = selectedIds.includes(p.id)
              const isFood = p.productType === 'food'
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
                    <span className={`badge ${isFood ? 'badge--custom' : 'badge--water'}`}>
                      {isFood ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UtensilsCrossed size={12} /> Food
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Fish size={12} /> Fish
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <img
                      src={p.image || '/images/placeholder.svg'}
                      alt={p.name}
                      className="product-table-thumb"
                    />
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{isFood ? (p.diet || 'Feed') : p.waterType}</td>
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
                      onClick={() => handleStartEdit(p)}
                      className="btn-action btn-edit"
                      title="Edit product details"
                    >
                      <Pencil size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                      Edit
                    </button>
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

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          resetForm()
        }}
        title={
          editingProduct
            ? (newFish.productType === 'food' ? 'Edit Aquarium Fish Food' : 'Edit Species')
            : (newFish.productType === 'food' ? 'Add Aquarium Fish Food' : 'Add New Species')
        }
      >
        <form onSubmit={handleSave} className="admin-form">
          {/* Category Switcher: Live Fish vs Fish Food */}
          <div className="product-category-switcher">
            <button
              type="button"
              className={`category-pill ${newFish.productType === 'fish' ? 'active' : ''}`}
              onClick={() => setNewFish((prev) => ({ ...prev, productType: 'fish' }))}
            >
              <Fish size={14} style={{ marginRight: '6px' }} /> Live Fish Species
            </button>
            <button
              type="button"
              className={`category-pill ${newFish.productType === 'food' ? 'active' : ''}`}
              onClick={() => setNewFish((prev) => ({ ...prev, productType: 'food' }))}
            >
              <UtensilsCrossed size={14} style={{ marginRight: '6px' }} /> Aquarium Fish Food
            </button>
          </div>

          <div className="form-group">
            <label>{newFish.productType === 'food' ? 'Food Product Name' : 'Species Name'}</label>
            <input
              name="name"
              value={newFish.name}
              onChange={handleInputChange}
              placeholder={newFish.productType === 'food' ? 'e.g. Tropical Spirulina Flakes' : 'e.g. Electric Blue Ram'}
              required
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price (₹)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={newFish.price}
                onChange={handleInputChange}
                placeholder="249"
                required
              />
              {errors.price && <span className="field-error">{errors.price}</span>}
            </div>
            <div className="form-group">
              <label>Initial Stock (Units)</label>
              <input
                name="stock"
                type="number"
                value={newFish.stock}
                onChange={handleInputChange}
                required
              />
              {errors.stock && <span className="field-error">{errors.stock}</span>}
            </div>
          </div>

          {newFish.productType === 'food' ? (
            <div className="form-group">
              <label>Food Form / Type</label>
              <select name="diet" value={newFish.diet} onChange={handleInputChange}>
                <option value="Flakes">Flakes</option>
                <option value="Pellets">Pellets</option>
                <option value="Sinking Wafers">Sinking Wafers</option>
                <option value="Freeze-Dried">Freeze-Dried</option>
                <option value="Granules">Granules</option>
                <option value="Gel Food">Gel Food</option>
              </select>
            </div>
          ) : (
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
          )}

          {/* Interactive Image Upload Section */}
          <div className="form-group">
            <label>{newFish.productType === 'food' ? 'Product Photograph / Packaging' : 'Species Photograph / Artwork'}</label>
            <div className="image-upload-zone">
              {imagePreview ? (
                <div className="image-preview-card">
                  <img src={imagePreview} alt="Upload preview" className="image-preview-thumb" />
                  <div className="image-preview-meta">
                    <span className="image-filename">{imageFile?.name || 'Uploaded image'}</span>
                    <span className="image-filesize">
                      {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="btn-remove-image"
                    >
                      ✕ Remove / Change
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="image-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="dropzone-icon">
                    <Camera size={28} />
                  </div>
                  <div className="dropzone-text">
                    <strong>Click to upload an image</strong> or drag and drop
                  </div>
                  <div className="dropzone-hint">PNG, JPG, WEBP, or SVG (Max 5MB)</div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{newFish.productType === 'food' ? 'Food Description & Ingredients' : 'Species Description & Care Guide'}</label>
            <textarea
              name="description"
              rows={3}
              value={newFish.description}
              onChange={handleInputChange}
              placeholder={newFish.productType === 'food' ? 'Describe nutritional benefits, suitable fish, feeding guide...' : 'Describe temperament, tank setup, feeding habits...'}
              required
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
            disabled={uploading}
          >
            {uploading
              ? 'Uploading Image & Saving...'
              : editingProduct
              ? (newFish.productType === 'food' ? 'Update Fish Food' : 'Update Species')
              : (newFish.productType === 'food' ? 'Save Fish Food' : 'Save Species')}
          </button>
        </form>
      </Modal>
    </div>
  )
}
