import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Room {
    id: number;
    wordsize: number;
    host: string;
}

function Lobby() {
    const [user, setUser] = useState<{ userId: number; admin: boolean } | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showChangeUsername, setShowChangeUsername] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeletePasswordConfirm, setShowDeletePasswordConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deletePasswordConfirm, setDeletePasswordConfirm] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetch('http://localhost:3000/user/validateToken', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                setUser({ userId: data.userId, admin: data.admin });
                fetchRooms();
            } else {
                localStorage.removeItem('token');
                navigate('/login');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            navigate('/login');
        });
    }, [navigate]);

    const fetchRooms = () => {
        fetch('http://localhost:3000/rounds/active')
        .then(res => res.json())
        .then(data => setRooms(data))
        .catch(console.error);
    };

    const handleChangeUsername = async () => {
        setError('');
        try {
            const res = await fetch('http://localhost:3000/user/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                },
                body: JSON.stringify({ currentPassword, newUsername })
            });
            if (res.ok) {
                setShowChangeUsername(false);
                setNewUsername('');
                setCurrentPassword('');
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const handleChangePassword = async () => {
        setError('');
        try {
            const res = await fetch('http://localhost:3000/user/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            if (res.ok) {
                setShowChangePassword(false);
                setCurrentPassword('');
                setNewPassword('');
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        setError('');
        if (deletePassword !== deletePasswordConfirm) {
            setError('Passwords do not match');
            return;
        }
        try {
            const res = await fetch('http://localhost:3000/user/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                },
                body: JSON.stringify({ password: deletePassword })
            });
            if (res.ok) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error');
        }
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div style={{ position: 'relative' }}>
            <button
                style={{ position: 'absolute', top: 10, right: 10 }}
                onClick={() => setShowSettings(!showSettings)}
            >
                Settings
            </button>
            {showSettings && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'stretch',
                        zIndex: 1000
                    }}
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        style={{
                            width: 320,
                            maxWidth: '100%',
                            background: 'white',
                            padding: 20,
                            boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => setShowChangeUsername(true)}>Change Username</button>
                        <button onClick={() => setShowChangePassword(true)}>Change Password</button>
                        {user.admin && <button onClick={() => navigate('/wordconfig')}>Add Words</button>}
                        <button onClick={() => setShowLogoutConfirm(true)} style={{ backgroundColor: '#ff6b6b', color: 'white' }}>Logout</button>
                        <button onClick={() => setShowDeletePasswordConfirm(true)} style={{ backgroundColor: '#dc3545', color: 'white' }}>Delete Account</button>
                    </div>
                    <button
                        style={{
                            position: 'absolute',
                            right: 375,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '8px 16px',
                            backgroundColor: '#f0f0f0',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                        onClick={() => setShowSettings(false)}
                    >
                        Close
                    </button>
                </div>
            )}
            {showChangeUsername && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowChangeUsername(false)}
                >
                    <div
                        style={{ background: 'white', padding: 20, borderRadius: 10, position: 'relative' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button style={{ position: 'absolute', top: 10, left: 10 }} onClick={() => setShowChangeUsername(false)}>Return</button>
                        <h3>Change Username</h3>
                        <input
                            type="text"
                            placeholder="New Username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <button onClick={handleChangeUsername}>Submit</button>
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                    </div>
                </div>
            )}
            {showChangePassword && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowChangePassword(false)}
                >
                    <div
                        style={{ background: 'white', padding: 20, borderRadius: 10, position: 'relative' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button style={{ position: 'absolute', top: 10, left: 10 }} onClick={() => setShowChangePassword(false)}>Return</button>
                        <h3>Change Password</h3>
                        <input
                            type="password"
                            placeholder="Previous Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button onClick={handleChangePassword}>Submit</button>
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                    </div>
                </div>
            )}
            {showLogoutConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1001
                    }}
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div
                        style={{ background: 'white', padding: 30, borderRadius: 10, textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Are you sure you want to log out?</h3>
                        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button onClick={() => setShowLogoutConfirm(false)}>No</button>
                            <button onClick={handleLogout} style={{ backgroundColor: '#ff6b6b', color: 'white' }}>OK</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeletePasswordConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1001
                    }}
                    onClick={() => setShowDeletePasswordConfirm(false)}
                >
                    <div
                        style={{ background: 'white', padding: 30, borderRadius: 10, minWidth: 400 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>
                            Are you sure you want to <span style={{ color: 'red', fontWeight: 'bold' }}>DELETE YOUR ACCOUNT PERMANENTLY</span>?
                        </h3>
                        <p>Please enter your password twice to confirm:</p>
                        <input
                            type="password"
                            placeholder="Password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }}
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={deletePasswordConfirm}
                            onChange={(e) => setDeletePasswordConfirm(e.target.value)}
                            style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }}
                        />
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowDeletePasswordConfirm(false); setDeletePassword(''); setDeletePasswordConfirm(''); setError(''); }}>Cancel</button>
                            <button onClick={() => { if (deletePassword === deletePasswordConfirm) { setShowDeletePasswordConfirm(false); setShowDeleteConfirm(true); } else { setError('Passwords do not match'); } }} style={{ backgroundColor: '#dc3545', color: 'white' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1001
                    }}
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        style={{ background: 'white', padding: 30, borderRadius: 10, textAlign: 'center', minWidth: 400 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Are you sure you want to delete your account?</h3>
                        <p>You will not be able to recover it once it gets deleted.</p>
                        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button onClick={() => setShowDeleteConfirm(false)}>No</button>
                            <button onClick={handleDeleteAccount} style={{ backgroundColor: '#dc3545', color: 'white' }}>Yes I am Sure</button>
                        </div>
                    </div>
                </div>
            )}
            <h1>Lobby</h1>
            <div>
                <h2>Active Rooms</h2>
                <ul>
                    {rooms.map(room => (
                        <li key={room.id}>
                            Room {room.id} - Host: {room.host} - Word Size: {room.wordsize}
                        </li>
                    ))}
                </ul>
            </div>
            <button style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 0 }}>
                Create New Room
            </button>
        </div>
    );
}

export default Lobby; 

