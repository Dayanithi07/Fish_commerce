import './FilterBar.css'

export default function FilterBar({ waterFilter, setWaterFilter, careFilter, setCareFilter, search, setSearch }) {
  return (
    <div className="filter-bar">
      <input
        type="search"
        placeholder="Search species, tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="filter-search"
      />
      <div className="filter-selects">
        <select value={waterFilter} onChange={(e) => setWaterFilter(e.target.value)}>
          <option value="">All Water Types</option>
          <option value="Freshwater">Freshwater</option>
          <option value="Saltwater">Saltwater</option>
        </select>
        <select value={careFilter} onChange={(e) => setCareFilter(e.target.value)}>
          <option value="">All Care Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Expert">Expert</option>
        </select>
      </div>
    </div>
  )
}
