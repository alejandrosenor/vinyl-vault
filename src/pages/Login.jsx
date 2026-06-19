import { useState } from 'react'
import { supabase } from '../services/supabase'
import '../App.css'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function login(e) {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) alert(error.message)

        setLoading(false)
    }

    async function register() {
        if (!email || !password) {
            alert('Mete email y contraseña')
            return
        }

        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email,
            password
        })

        if (error) {
            alert(error.message)
        } else {
            alert('Usuario creado. Ahora inicia sesión.')
        }

        setLoading(false)
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="logo-icon">🎵</div>

                <h1>Tu Estantería de Vinilos</h1>
                <p>Tu colección musical personal</p>

                <form onSubmit={login}>
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit">
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <button className="secondary-login-btn" onClick={register}>
                    Crear cuenta
                </button>
            </div>
        </div>
    )
}

export default Login