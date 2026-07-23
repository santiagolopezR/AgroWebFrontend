import { useState } from 'react'
import { supabase } from './supabaseClient'
import { LogIn } from 'lucide-react'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      onLoginSuccess(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      setError('¡Cuenta creada! Revisa tu email para confirmar.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F2E6] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogIn size={48} className="text-[#1F3D2B]" />
          </div>
          <h1 className="text-3xl font-bold text-[#1F3D2B]">AgroWeb</h1>
          <p className="text-[#6B5D45] mt-2">Gestión Agrícola</p>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="bg-white rounded-lg border-2 border-[#1F3D2B] p-6 shadow-[3px_3px_0_#1F3D2B]">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1F3D2B] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[#D8D2BE] rounded-md focus:border-[#1F3D2B] outline-none"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#1F3D2B] mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[#D8D2BE] rounded-md focus:border-[#1F3D2B] outline-none"
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#FBE4E1] border-2 border-[#C0402A] rounded text-sm text-[#8B2D1F]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1F3D2B] text-white font-bold py-2 rounded-md hover:bg-[#0F2116] disabled:opacity-50 transition"
          >
            {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="w-full mt-3 text-sm text-[#1F3D2B] hover:underline"
          >
            {isSignUp ? '¿Ya tienes cuenta? Entra aquí' : '¿No tienes cuenta? Regístrate'}
          </button>
        </form>
      </div>
    </div>
  )
}