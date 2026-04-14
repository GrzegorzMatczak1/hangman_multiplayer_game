import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
            setError('Cannot register usernames reserved for bots.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        try {
            // Create user
            const createRes = await fetch('http://localhost:3000/user/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            if (!createRes.ok) {
                const errorMsg = await createRes.text();
                setError(errorMsg);
                return;
            }
            // Generate token
            const tokenRes = await fetch('http://localhost:3000/user/generateToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            if (tokenRes.ok) {
                const data = await tokenRes.json();
                localStorage.setItem('token', data.token);
                navigate('/');
            } else {
                setError('Failed to login after registration');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    return (
        <main className="screen-center page-enter">
            <section className="glass auth-card">
                <h2 className="brand-title mb-2">Rejestracja</h2>
                <p className="brand-muted mb-4">Załóż konto i zacznij grę w multiplayer.</p>
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
                    <div>
                        <label className="form-label brand-muted">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="form-control"
                        required
                    />
                    </div>
                    <button type="submit" className="btn btn-primary fw-semibold">Register</button>
                </form>
                {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
                <p className="mt-4 mb-0 brand-muted">Already have an account? <Link to="/login">Login</Link></p>
            </section>
        </main>
    );
}

export default Register;