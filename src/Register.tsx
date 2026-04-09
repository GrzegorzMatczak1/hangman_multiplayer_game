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
        <div>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Confirm Password:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Register</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
}

export default Register;