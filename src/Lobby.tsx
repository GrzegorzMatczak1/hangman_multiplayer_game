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
    const [showPreviousRounds, setShowPreviousRounds] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        let intervalId: number | undefined;

        fetch('http://localhost:3000/user/validateToken', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(async (res) => {
            if (!res.ok) {
                throw new Error('Token validation failed');
            }
            return res.json();
        })
        .then(data => {
            if (data.valid) {
                setUser({ userId: data.userId, admin: data.admin });
                fetchRooms();
                intervalId = window.setInterval(() => fetchRooms(), 120000);
            } else {
                localStorage.removeItem('token');
                navigate('/login');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            navigate('/login');
        });

        return () => {
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [navigate]);

    const fetchRooms = (debugPreviousRounds = showPreviousRounds) => {
        const endpoint = debugPreviousRounds ? 'http://localhost:3000/rounds/inactive' : 'http://localhost:3000/rounds/active';
        setLoadingRooms(true);
        setError('');

        fetch(endpoint)
            .then(async (res) => {
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    setRooms([]);
                    if (res.status === 404) {
                        setError(`No ${debugPreviousRounds ? 'previous' : 'active'} rounds available.`);
                    } else {
                        setError(text || `Error loading rooms: ${res.status}`);
                    }
                    return;
                }
                try {
                    const data = await res.json();
                    setRooms(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error(err);
                    setRooms([]);
                    setError('Unable to parse server response when loading rooms.');
                }
            })
            .catch((err) => {
                console.error(err);
                setRooms([]);
                setError('Unable to load rooms. Please make sure the backend is running.');
            })
            .finally(() => setLoadingRooms(false));
    };

    const handleCreateRoom = async () => {
        if (!user) return;
        try {
            const res = await fetch(`http://localhost:3000/round/create/${user.userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                navigate(`/round/${data.roundId}`);
            } else {
                setError(await res.text());
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const handleJoinRoom = async (roomId: number) => {
        if (!user) return;
        try {
            // First check if round is started
            const roundRes = await fetch(`http://localhost:3000/round/${roomId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                }
            });
            if (roundRes.ok) {
                const roundData = await roundRes.json();
                if (roundData.started && user.userId !== roundData.host) {
                    // Round already started, redirect to results (unless user is host)
                    navigate(`/results/${roomId}`);
                    return;
                }
            }

            // Join the round
            const joinRes = await fetch(`http://localhost:3000/roundinfo/create/${roomId}/${user.userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')!}`
                }
            });
            if (joinRes.ok) {
                navigate(`/round/${roomId}`);
            } else {
                setError(await joinRes.text());
            }
        } catch (err) {
            setError('Network error');
        }
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

    if (!user) {
        return (
            <div className="screen-center">
                <div className="glass p-4 text-center">
                    <div className="spinner-border text-secondary mb-3" role="status" />
                    <p className="mb-0 brand-muted">Loading lobby...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="app-shell page-enter">
            <div className="app-header">
                <div>
                    <h1 className="brand-title mb-1">Lobby</h1>
                    <p className="brand-muted mb-0">Wybierz aktywną rundę lub stwórz własny pokój.</p>
                </div>
                <button className="btn btn-outline-light" onClick={() => setShowSettings(!showSettings)}>
                    Settings
                </button>
            </div>

            {showSettings && (
                <div className="overlay overlay-end" onClick={() => setShowSettings(false)}>
                    <div className="glass settings-panel d-grid gap-2" onClick={(e) => e.stopPropagation()}>
                        <h5 className="brand-title mb-2">Account Settings</h5>
                        <button className="btn btn-outline-light text-start" onClick={() => setShowChangeUsername(true)}>Change Username</button>
                        <button className="btn btn-outline-light text-start" onClick={() => setShowChangePassword(true)}>Change Password</button>
                        {user.admin && <button className="btn btn-secondary text-start" onClick={() => navigate('/wordconfig')}>Word Configuration</button>}
                        <button className="btn btn-warning text-dark text-start" onClick={() => setShowLogoutConfirm(true)}>Logout</button>
                        <button className="btn btn-danger text-start" onClick={() => setShowDeletePasswordConfirm(true)}>Delete Account</button>
                        <button className="btn btn-sm btn-outline-light mt-2" onClick={() => setShowSettings(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {showChangeUsername && (
                <div className="overlay" onClick={() => setShowChangeUsername(false)}>
                    <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
                        <h4 className="brand-title">Change Username</h4>
                        <div className="d-grid gap-2 mt-3">
                        <input
                            className="form-control"
                            type="text"
                            placeholder="New Username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                        />
                        <input
                            className="form-control"
                            type="password"
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        </div>
                        {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-outline-light" onClick={() => setShowChangeUsername(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleChangeUsername}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {showChangePassword && (
                <div className="overlay" onClick={() => setShowChangePassword(false)}>
                    <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
                        <h4 className="brand-title">Change Password</h4>
                        <div className="d-grid gap-2 mt-3">
                        <input
                            className="form-control"
                            type="password"
                            placeholder="Previous Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <input
                            className="form-control"
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        </div>
                        {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-outline-light" onClick={() => setShowChangePassword(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleChangePassword}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {showLogoutConfirm && (
                <div className="overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
                        <h4 className="brand-title">Are you sure you want to log out?</h4>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <button className="btn btn-outline-light" onClick={() => setShowLogoutConfirm(false)}>No</button>
                            <button className="btn btn-warning text-dark" onClick={handleLogout}>Yes, logout</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeletePasswordConfirm && (
                <div className="overlay" onClick={() => setShowDeletePasswordConfirm(false)}>
                    <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
                        <h4 className="brand-title">Delete Account Permanently</h4>
                        <p className="brand-muted">Enter your password twice to confirm.</p>
                        <div className="d-grid gap-2 mt-2">
                        <input
                            className="form-control"
                            type="password"
                            placeholder="Password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                        />
                        <input
                            className="form-control"
                            type="password"
                            placeholder="Confirm Password"
                            value={deletePasswordConfirm}
                            onChange={(e) => setDeletePasswordConfirm(e.target.value)}
                        />
                        </div>
                        {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-outline-light" onClick={() => { setShowDeletePasswordConfirm(false); setDeletePassword(''); setDeletePasswordConfirm(''); setError(''); }}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => { if (deletePassword === deletePasswordConfirm) { setShowDeletePasswordConfirm(false); setShowDeleteConfirm(true); } else { setError('Passwords do not match'); } }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
                        <h4 className="brand-title">Final Confirmation</h4>
                        <p className="brand-muted">Your account cannot be recovered after deletion.</p>
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-outline-light" onClick={() => setShowDeleteConfirm(false)}>No</button>
                            <button className="btn btn-danger" onClick={handleDeleteAccount}>Delete permanently</button>
                        </div>
                    </div>
                </div>
            )}

            <section className="glass p-4">
                <div className="d-flex flex-wrap gap-2 mb-3">
                    <button className="btn btn-primary" onClick={handleCreateRoom}>Create New Room</button>
                </div>

                <div className="btn-group mb-3" role="group" aria-label="Round list toggle">
                    <button
                        className={`btn ${!showPreviousRounds ? 'btn-secondary' : 'btn-outline-light'}`}
                        onClick={() => {
                            setShowPreviousRounds(false);
                            fetchRooms(false);
                        }}
                    >
                        Current Rounds
                    </button>
                    <button
                        className={`btn ${showPreviousRounds ? 'btn-secondary' : 'btn-outline-light'}`}
                        onClick={() => {
                            setShowPreviousRounds(true);
                            fetchRooms(true);
                        }}
                    >
                        Previous Rounds
                    </button>
                </div>

                <h2 className="h4 brand-title mb-3">{showPreviousRounds ? 'Previous Rounds' : 'Active Rooms'}</h2>

                {loadingRooms ? (
                    <div className="d-flex align-items-center gap-2 brand-muted">
                        <div className="spinner-border spinner-border-sm text-secondary" role="status" />
                        Loading rooms...
                    </div>
                ) : rooms.length === 0 ? (
                    <p className="brand-muted mb-0">No rooms available yet.</p>
                ) : (
                    <ul className="list-unstyled mb-0 d-grid gap-2">
                        {rooms.map(room => (
                            <li
                                key={room.id}
                                className="rooms-list-item p-3"
                                onClick={() => showPreviousRounds ? navigate(`/results/${room.id}`) : handleJoinRoom(room.id)}
                            >
                                <div className="fw-semibold">Room #{room.id}</div>
                                <small className="brand-muted">Host: {room.host} | Word Size: {room.wordsize}</small>
                            </li>
                        ))}
                    </ul>
                )}

                {error && <div className="alert alert-danger mt-3 mb-0 py-2">{error}</div>}
            </section>
        </main>
    );
}

export default Lobby; 

