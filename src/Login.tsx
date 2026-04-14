import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Validate token
            fetch('http://localhost:3000/user/validateToken', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.valid) {
                    navigate('/');
                }
            })
            .catch(() => {
                localStorage.removeItem('token');
            });
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (username.trim().startsWith('BOT_')) {
            setError('Bot accounts cannot log in.');
            return;
        }
        try {
            const res = await fetch('http://localhost:3000/user/generateToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                navigate('/');
            } else {
                const errorMsg = await res.text();
                setError(errorMsg);
            }
        } catch (err) {
            setError('Network error');
        }
    };

    return (
        <main className="screen-center page-enter">
            <section className="glass auth-card">
                <h2 className="brand-title mb-2">Logowanie</h2>
                <p className="brand-muted mb-4">Zaloguj się i dołącz do aktywnych rund.</p>
                <form onSubmit={handleSubmit} className="d-grid gap-3">
                    <div>
                        <label className="form-label brand-muted">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="form-control"
                        required
                    />
                    </div>
                    <div>
                        <label className="form-label brand-muted">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-control"
                        required
                    />
                    </div>
                    <button type="submit" className="btn btn-primary fw-semibold">Login</button>
                </form>
                {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
                <p className="mt-4 mb-0 brand-muted">Don't have an account? <Link to="/register">Register</Link></p>
            </section>
        </main>
    );
}

export default Login;