import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';

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

// --- Components ---

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const adminConfigDoc = await getDoc(doc(db, "config", "admins"));
        const adminEmails = adminConfigDoc.exists() ? adminConfigDoc.data().emails : [];
        
        // On login, find the user document created by the admin via email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUser.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            // If this is the first login, link the Google UID to the document
            if (!userDoc.data().uid) {
                await updateDoc(doc(db, "users", userDoc.id), { uid: currentUser.uid });
            }
            setUser({ uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName });
        } else {
            // User exists in Google Auth but not in our DB (not pre-registered)
            setUser({ uid: 'unauthorized', email: currentUser.email, displayName: currentUser.displayName });
        }
        
        setIsAdmin(adminEmails.includes(currentUser.email));
      } else {
        setUser(null);
        setIsAdmin(false);
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-xl font-semibold">Loading...</div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Payment Tracker</h1>
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
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Login with Google
            </button>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {user ? (
          isAdmin ? <AdminDashboard /> : <UserDashboard user={user} />
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-700">Welcome!</h2>
            <p className="text-gray-500 mt-2">Please log in to view your payment status.</p>
            {authError && <p className="text-red-500 mt-4">{authError}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

function UserDashboard({ user }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (user.uid === 'unauthorized') {
            setLoading(false);
            return;
        }
        const fetchUserData = async () => {
            setLoading(true);
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setUserData(userDocSnap.data());
            }
            setLoading(false);
        };
        fetchUserData();
    }, [user.uid]);

    if (loading) {
        return <div>Loading user data...</div>;
    }

    if (user.uid === 'unauthorized') {
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user.displayName}!</h2>
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

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [calculatorAmount, setCalculatorAmount] = useState('');
  const [monthsToCheck, setMonthsToCheck] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
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
    
    const userQuery = query(collection(db, "users"), where("email", "==", newUserEmail));
    const querySnapshot = await getDocs(userQuery);
    
    if (!querySnapshot.empty) {
        alert("A user with this email already exists.");
        return;
    }

    const newUserRef = doc(collection(db, "users"));
    await setDoc(newUserRef, {
        email: newUserEmail,
        payments: {}
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
    <div>
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
                    <option key={user.id} value={user.id}>{user.email}</option>
                ))}
            </select>
            {selectedUser && (
                <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Delete {selectedUser.email}
                </button>
            )}
          </div>
        </div>

        {/* Payment Management */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Manage Payments</h3>
          {selectedUser ? (
            <div>
                <p className="mb-4">Managing payments for: <strong>{selectedUser.email}</strong></p>
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
        </div>
      </div>
    </div>
  );
}

export default App;

