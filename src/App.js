import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';

// --- IMPORTANT: This is the configuration for your Firebase project. ---
const firebaseConfig = {
  apiKey: "AIzaSyCP75qVnnBg_KviuyNf5EPLGQPbFEE7kJc",
  authDomain: "payment-tracker-final.firebaseapp.com",
  projectId: "payment-tracker-final",
  storageBucket: "payment-tracker-final.firebasestorage.app",
  messagingSenderId: "108107433317",
  appId: "1:108107433317:web:9682659d9b99d4e27e4d8c",
  measurementId: "G-TRDDN2FYJ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper function to generate month range ---
const generateMonthRange = (startYear, startMonth, endYear, endMonth) => {
    let months = [];
    let currentDate = new Date(startYear, startMonth - 1, 2); 
    const finalDate = new Date(endYear, endMonth - 1, 2);

    while (currentDate <= finalDate) {
        months.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months;
};

const paymentMonths = generateMonthRange(2025, 8, 2028, 7);
const APP_VERSION = "v2.3.0";

// --- Components ---

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
    
    document.body.style.backgroundImage = "url('https://www.transparenttextures.com/patterns/subtle-palm-leaves.png')";
    document.body.style.backgroundColor = "#f0f4f8";


    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const adminConfigDoc = await getDoc(doc(db, "config", "admins"));
        const adminEmails = adminConfigDoc.exists() ? adminConfigDoc.data().emails : [];
        const adminStatus = adminEmails.includes(currentUser.email);
        setIsAdmin(adminStatus);

        const userDocRef = doc(db, "users", currentUser.email);
        const userDocSnap = await getDoc(userDocRef);
        
        const isPaymentUser = userDocSnap.exists();

        if (isPaymentUser) {
            const userData = userDocSnap.data();
            if (!userData.uid) { // First login, link UID and nickname
                await updateDoc(userDocRef, { 
                    uid: currentUser.uid,
                    nickname: currentUser.displayName || currentUser.email
                });
            }
            setUser({ uid: currentUser.uid, email: currentUser.email, docId: userDocSnap.id, isPaymentUser: true, photoURL: currentUser.photoURL });
            setIsAuthorized(true);
            await addDoc(collection(db, "login_history"), { email: currentUser.email, timestamp: serverTimestamp(), status: "Success" });
        } else if (adminStatus) {
            setUser({ uid: currentUser.uid, email: currentUser.email, isPaymentUser: false, photoURL: currentUser.photoURL });
            setIsAuthorized(true);
            await addDoc(collection(db, "login_history"), { email: currentUser.email, timestamp: serverTimestamp(), status: "Success (Admin)" });
        } else {
            setUser({ uid: currentUser.uid, email: currentUser.email });
            setIsAuthorized(false);
            await addDoc(collection(db, "failed_logins"), { email: currentUser.email, timestamp: serverTimestamp(), status: "Failed: Unauthorized" });
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsAuthorized(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      setAuthError("Failed to log in. Please check your Firebase configuration and security rules.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl font-semibold">Loading...</div>
        </div>
      )
  }

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-white/80 backdrop-blur-md shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {user && <img src={user.photoURL} alt="profile" className="h-10 w-10 rounded-full" />}
            <h1 className="text-3xl font-bold text-gray-800">Payment Tracker</h1>
          </div>
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {user ? (
          isAdmin ? <AdminView user={user} /> : <UserDashboard user={user} isAuthorized={isAuthorized} />
        ) : (
          <div className="text-center bg-white/80 backdrop-blur-md p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-700">Welcome!</h2>
            <p className="text-gray-600 mt-2">Please login with your assigned Gmail account to view your payment status.</p>
            {authError && <p className="text-red-500 mt-4">{authError}</p>}
          </div>
        )}
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
          <p>Payment Tracker {APP_VERSION}</p>
      </footer>
    </div>
  );
}

function AdminView({ user }) {
    return (
        <div className="space-y-8">
            <AdminDashboard />
            {user.isPaymentUser && (
                <>
                    <hr className="border-t-2 border-gray-300 my-8"/>
                    <div>
                        <h2 className="text-3xl font-bold mb-4 text-center">My Personal Dashboard</h2>
                        <UserDashboard user={user} isAuthorized={true} />
                    </div>
                </>
            )}
        </div>
    );
}

function UserDashboard({ user, isAuthorized }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!isAuthorized) {
            setLoading(false);
            return;
        }
        const fetchUserData = async () => {
            setLoading(true);
            const userDocRef = doc(db, "users", user.docId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setUserData(userDocSnap.data());
            }
            setLoading(false);
        };
        fetchUserData();
    }, [user, isAuthorized]);

    if (loading) {
        return <div>Loading user data...</div>;
    }

    if (!isAuthorized) {
        return (
            <div className="text-center bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Access Denied!</strong>
                <span className="block sm:inline"> Your account has not been registered by an administrator. Please contact an admin to get access.</span>
            </div>
        );
    }
    
    if (!userData) {
         return <div>Error loading user data. Please contact an admin.</div>;
    }

    const payments = userData.payments || {};
    const paidCount = Object.values(payments).filter(p => p).length;
    const totalPaid = paidCount * 25;
    const paymentsLeft = paymentMonths.length - paidCount;
    const today = new Date();
    const monthsDueCount = paymentMonths.filter(m => m <= today).length;
    const status = paidCount >= monthsDueCount ? "In Good Standing" : "Behind on Payments";

    return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Welcome, {userData.nickname}!</h2>
      <div className={`p-4 rounded-md mb-6 ${status === "In Good Standing" ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        <h3 className="font-bold text-lg">Payment Status: {status}</h3>
        <p>Total Paid: ${totalPaid.toFixed(2)}</p>
        <p className="font-bold">Total Payments Left: {paymentsLeft}</p>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Payment History</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {paymentMonths.map(month => {
                const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                const isPaid = payments[monthKey];
                const isPastDue = month < new Date() && !isPaid;

                return (
                    <div key={monthKey} className={`p-3 rounded text-center ${isPaid ? 'bg-green-200' : isPastDue ? 'bg-red-200' : 'bg-gray-200'}`}>
                        {month.toLocaleString('default', { month: 'short', year: 'numeric' })}
                        <span className="block text-sm font-bold">{isPaid ? 'Paid' : isPastDue ? 'Due' : 'Upcoming'}</span>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ user, onConfirm, onCancel }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
                <h2 className="font-bold text-xl text-gray-800 mb-4">Are you sure?</h2>
                <p className="text-gray-600 mb-6">
                    You are about to permanently delete the user: <strong className="font-bold">{user.email}</strong>. This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onCancel}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded"
                    >
                        Yes, Delete User
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoginHistory() {
    const [history, setHistory] = useState([]);
    const [failed, setFailed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const successQuery = query(collection(db, "login_history"), orderBy("timestamp", "desc"));
            const failedQuery = query(collection(db, "failed_logins"), orderBy("timestamp", "desc"));

            const [successSnapshot, failedSnapshot] = await Promise.all([
                getDocs(successQuery),
                getDocs(failedQuery)
            ]);

            setHistory(successSnapshot.docs.map(doc => doc.data()));
            setFailed(failedSnapshot.docs.map(doc => doc.data()));
            setLoading(false);
        };
        fetchHistory();
    }, []);

    if (loading) {
        return <p>Loading history...</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-semibold mb-2">Successful Logins</h3>
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-lg shadow-md max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                        {history.map((entry, index) => (
                            <li key={index} className="py-2">
                                <p className="font-semibold">{entry.email}</p>
                                <p className="text-sm text-gray-500">{new Date(entry.timestamp?.toDate()).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-2 text-red-600">Unauthorized Attempts</h3>
                 <div className="bg-white/80 backdrop-blur-md p-4 rounded-lg shadow-md max-h-96 overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                        {failed.map((entry, index) => (
                            <li key={index} className="py-2">
                                <p className="font-semibold">{entry.email}</p>
                                <p className="text-sm text-gray-500">{new Date(entry.timestamp?.toDate()).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [calculatorAmount, setCalculatorAmount] = useState('');
  const [monthsToCheck, setMonthsToCheck] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const hasUnsavedChanges = selectedUser && JSON.stringify(selectedUser.payments || {}) !== JSON.stringify(pendingPayments || {});

  const fetchUsers = async () => {
    const usersCollection = collection(db, "users");
    const userSnapshot = await getDocs(usersCollection);
    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(userList);
  };

  useEffect(() => {
      fetchUsers();
  }, []);
  
  const handleUserSelect = async (userId) => {
      if (!userId) {
          setSelectedUser(null);
          setPendingPayments(null);
          return;
      }
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = { id: userDoc.id, ...userDoc.data() };
      setSelectedUser(userData);
      setPendingPayments(userData.payments || {});
  }

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail) return;
    
    const userDocRef = doc(db, "users", newUserEmail);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
        alert("A user with this email already exists.");
        return;
    }

    await setDoc(userDocRef, {
        email: newUserEmail,
        payments: {},
        uid: null,
        nickname: null // Will be set on first login
    });
    
    setNewUserEmail("");
    alert("User has been added. They can now log in.");
    fetchUsers();
  };

  const handlePaymentChange = (monthKey, isPaid) => {
      setPendingPayments(prev => ({
          ...prev,
          [monthKey]: isPaid
      }));
  };
  
  const handleSaveChanges = async () => {
      if (!hasUnsavedChanges) return;
      const userRef = doc(db, "users", selectedUser.id);
      await updateDoc(userRef, { payments: pendingPayments });
      setSelectedUser(prev => ({...prev, payments: pendingPayments}));
      alert("Changes saved successfully!");
  };

  const handleConfirmDelete = async () => {
      if (!selectedUser) return;
      await deleteDoc(doc(db, "users", selectedUser.id));
      alert(`User ${selectedUser.email} has been deleted.`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setPendingPayments(null);
      fetchUsers();
  };
  
  useEffect(() => {
      const amount = parseFloat(calculatorAmount);
      if (!isNaN(amount) && amount > 0) {
          setMonthsToCheck(Math.floor(amount / 25));
      } else {
          setMonthsToCheck(0);
      }
  }, [calculatorAmount]);

  const groupedMonths = paymentMonths.reduce((acc, month) => {
    const year = month.getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(month);
    return acc;
  }, {});

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-lg shadow-lg">
      {isDeleteModalOpen && (
        <DeleteConfirmationModal 
            user={selectedUser}
            onConfirm={handleConfirmDelete}
            onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Manage Users</h3>
          <form onSubmit={handleAddUser} className="mb-6 space-y-3">
            <h4 className="font-semibold mb-2">Add New User</h4>
            <div>
                <label className="block text-sm font-medium text-gray-700">User's Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full p-2 border rounded"
                  required
                />
            </div>
            <button type="submit" className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              Add User
            </button>
          </form>

          <div>
            <h4 className="font-semibold mb-2">Select User to Manage Payments</h4>
            <select onChange={(e) => handleUserSelect(e.target.value)} className="w-full p-2 border rounded">
                <option value="">-- Select User --</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.nickname || user.email}</option>
                ))}
            </select>
            {selectedUser && (
                <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Delete {selectedUser.nickname || selectedUser.email}
                </button>
            )}
          </div>
          <hr className="my-6"/>
          <div>
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className="w-full mt-3 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
                {showHistory ? 'Hide' : 'View'} Login History
            </button>
          </div>
        </div>

        {/* Payment Management */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          {showHistory ? <LoginHistory /> : (
            <>
              <h3 className="text-xl font-semibold mb-4">Manage Payments</h3>
              {selectedUser ? (
                <div>
                    <p className="mb-4">Managing payments for: <strong>{selectedUser.nickname || selectedUser.email}</strong></p>
                    <div className="bg-blue-100 p-4 rounded-lg mb-6">
                        <h4 className="font-semibold text-blue-800">Payment Calculator</h4>
                        <div className="flex items-center space-x-2 mt-2">
                            <input 
                                type="number"
                                placeholder="Enter amount paid"
                                value={calculatorAmount}
                                onChange={(e) => setCalculatorAmount(e.target.value)}
                                className="p-2 border rounded w-1/2"
                            />
                            <p className="text-blue-700"> = <span className="font-bold text-lg">{monthsToCheck}</span> months to check.</p>
                        </div>
                    </div>

                    {Object.keys(groupedMonths).map(year => (
                        <div key={year} className="mb-4">
                            <h4 className="font-bold text-lg mb-2">{year}</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {groupedMonths[year].map(month => {
                                    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                                    const isPaid = pendingPayments && pendingPayments[monthKey];
                                    return (
                                        <label key={monthKey} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200">
                                            <input 
                                                type="checkbox"
                                                checked={!!isPaid}
                                                onChange={(e) => handlePaymentChange(monthKey, e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{month.toLocaleString('default', { month: 'short' })}</span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    
                    {hasUnsavedChanges && (
                         <button 
                            onClick={handleSaveChanges}
                            className="w-full mt-4 bg-green-600 hover:bg-green-800 text-white font-bold py-3 px-4 rounded sticky bottom-4"
                        >
                            Save Changes
                        </button>
                    )}

                </div>
              ) : (
                <p className="text-gray-500">Please select a user to manage their payments.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

