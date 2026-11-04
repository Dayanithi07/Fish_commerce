import { Link } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  return (
    <div className="container not-found-page">
      <h1>404</h1>
      <p>Page Not Found</p>
      <Link to="/" className="btn-primary">Return Home</Link>
    </div>
  )
}
