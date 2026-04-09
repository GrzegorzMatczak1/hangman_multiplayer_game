// Update round list every 2 minutes. When user click on a round it will navigate to the game page with the round id as a url parameter.
// When user creates a room it will send a request to the backend to create a new round and then navigate to the game page with the new round id as a url parameter. User that creates the room is the host of the room. When a user joins a room it will send a request to the backend to join the round and then navigate to the game page with the round id as a url parameter. If a user tries to join a room that is already started it will redirect them to the results page of thet round.
// Once the round is finished it will be added to the previous round list. Previous rounds button can be accesed next to the create room button and will switch to Current rounds when clicked. When the user clicks the previous round button the list that displays current rounds will be replaced by the list of previous rounds and vice versa. When previous rounds button is clicked the background color changes, and changes back when current rounds button is clicked. When user clicks on a previous round it will navigate to the results page of that round. 
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
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <button onClick={handleCreateRoom}>Create New Room</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button 
                    onClick={() => {
                        setShowPreviousRounds(false);
                        fetchRooms(false);
                    }}
                    style={{ 
                        backgroundColor: !showPreviousRounds ? '#4CAF50' : '#f0f0f0',
                        color: !showPreviousRounds ? 'white' : 'black'
                    }}
                >
                    Current Rounds
                </button>
                <button 
                    onClick={() => {
                        setShowPreviousRounds(true);
                        fetchRooms(true);
                    }}
                    style={{ 
                        backgroundColor: showPreviousRounds ? '#4CAF50' : '#f0f0f0',
                        color: showPreviousRounds ? 'white' : 'black'
                    }}
                >
                    Previous Rounds
                </button>
            </div>
            <div>
                <h2>{showPreviousRounds ? 'Previous Rounds' : 'Active Rooms'}</h2>
                {loadingRooms ? (
                    <p>Loading rooms...</p>
                ) : rooms.length === 0 ? (
                    <p>No rooms available yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {rooms.map(room => (
                            <li 
                                key={room.id} 
                                style={{ 
                                    padding: 10, 
                                    marginBottom: 10, 
                                    border: '1px solid #ccc', 
                                    borderRadius: 5,
                                    cursor: 'pointer',
                                    backgroundColor: '#f9f9f9'
                                }}
                                onClick={() => showPreviousRounds ? navigate(`/results/${room.id}`) : handleJoinRoom(room.id)}
                            >
                                Room {room.id} - Host: {room.host} - Word Size: {room.wordsize}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default Lobby; 

