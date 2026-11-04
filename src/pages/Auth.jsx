import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { DEMO_ADMIN } from '../config.js'
import './Auth.css'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: null }))
    setGeneralError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    if (isLogin) {
      const res = login(formData.email, formData.password)
      if (!res.ok) {
        if (res.error?.details) setErrors(res.error.details)
        else setGeneralError(res.error?.message || 'Login failed')
        return
      }
      if (res.user.role === 'admin') navigate('/admin/products')
      else navigate('/')
    } else {
      const res = signup(formData.name, formData.email, formData.password)
      if (!res.ok) {
        if (res.error?.details) setErrors(res.error.details)
        else setGeneralError(res.error?.message || 'Signup failed')
        return
      }
      navigate('/')
    }
  }

  const fillAdmin = () => {
    setFormData({
      name: '',
      email: DEMO_ADMIN.email,
      password: DEMO_ADMIN.password,
    })
    setIsLogin(true)
  }

  return (
    <div className="container auth-page">
      <div className="auth-card">
        <h2>{isLogin ? 'Sign In to Fishcommerce' : 'Create an Account'}</h2>

        {generalError && <div className="alert-error">{generalError}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'input-error' : ''}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn-primary btn-auth-submit">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => setIsLogin(false)}>
                Register
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => setIsLogin(true)}>
                Sign In
              </button>
            </p>
          )}
        </div>

        <div className="demo-credentials">
          <p>Demo Admin Credentials:</p>
          <code>{DEMO_ADMIN.email} / {DEMO_ADMIN.password}</code>
          <button type="button" onClick={fillAdmin} className="btn-fill-admin">
            Fill Demo Admin
          </button>
        </div>
      </div>
    </div>
  )
}
