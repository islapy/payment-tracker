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

// --- App Configuration ---
const MONTHLY_PAYMENT = 562;
const APP_VERSION = "v3.3.0";


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
    
    document.body.style.backgroundImage = "url('https://www.transparenttextures.com/patterns/subtle-palm-leaves.png')";
    document.body.style.backgroundColor = "#f0f4f8";

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const adminConfigDoc = await getDoc(doc(db, "config", "admins"));
        const adminEmails = adminConfigDoc.exists() ? adminConfigDoc.data().emails : [];
        const adminStatus = adminEmails.includes(currentUser.email);
        
        setUser({ email: currentUser.email, photoURL: currentUser.photoURL });
        setIsAdmin(adminStatus);
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
      setAuthError("Failed to log in. Please ensure your Firebase project is correctly configured (API Keys, Authorized Domains, and Firestore Rules).");
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
          isAdmin ? <AdminDashboard /> : 
          <div className="text-center bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Access Denied!</strong>
              <span className="block sm:inline"> You are not an authorized administrator.</span>
          </div>
        ) : (
          <div className="text-center bg-white/80 backdrop-blur-md p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-700">Welcome!</h2>
            <p className="text-gray-600 mt-2">Please login with an authorized admin account.</p>
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

function DeleteConfirmationModal({ user, onConfirm, onCancel }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
                <h2 className="font-bold text-xl text-gray-800 mb-4">Are you sure?</h2>
                <p className="text-gray-600 mb-6">
                    You are about to permanently delete the user: <strong className="font-bold">{user.displayName}</strong>. This action cannot be undone.
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

function DeleteWithdrawalModal({ withdrawal, onConfirm, onCancel }) {
    if (!withdrawal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
                <h2 className="font-bold text-xl text-gray-800 mb-4">Are you sure?</h2>
                <p className="text-gray-600 mb-6">
                    You are about to delete the withdrawal of <strong className="font-bold">₱{withdrawal.amount.toLocaleString()}</strong> from {new Date(withdrawal.timestamp?.toDate()).toLocaleDateString()}. This action cannot be undone.
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
                        Yes, Delete Withdrawal
                    </button>
                </div>
            </div>
        </div>
    );
}

function AllUsersStatus({ users }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">All Users Payment Status</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Months Paid</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Months Missed</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => {
                            const payments = user.payments || {};
                            const paidCount = Object.values(payments).filter(p => p).length;
                            const today = new Date();
                            const dueMonths = paymentMonths.filter(m => m <= today);
                            const missedMonths = dueMonths.filter(m => !payments[`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`]);
                            const status = paidCount >= dueMonths.length ? "In Good Standing" : "Behind";

                            return (
                                <tr key={user.id} className={status === "Behind" ? "bg-red-50" : "bg-green-50"}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.displayName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === "Behind" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{paidCount} / {paymentMonths.length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {missedMonths.length > 0 ? missedMonths.map(m => m.toLocaleString('default', { month: 'short' })).join(', ') : 'None'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FinancialSummary({ users, withdrawals }) {
    const totalCollected = users.reduce((acc, user) => {
        const paidCount = Object.values(user.payments || {}).filter(p => p).length;
        return acc + (paidCount * MONTHLY_PAYMENT);
    }, 0);

    const totalWithdrawn = withdrawals.reduce((acc, withdrawal) => acc + withdrawal.amount, 0);
    const currentBalance = totalCollected - totalWithdrawn;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-semibold mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-sm text-gray-500">Total Collected</p>
                    <p className="text-2xl font-bold text-green-600">₱{totalCollected.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Total Withdrawn</p>
                    <p className="text-2xl font-bold text-red-600">₱{totalWithdrawn.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className="text-2xl font-bold text-blue-600">₱{currentBalance.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [calculatorAmount, setCalculatorAmount] = useState('');
  const [monthsToCheck, setMonthsToCheck] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWithdrawalDeleteModalOpen, setIsWithdrawalDeleteModalOpen] = useState(false);
  const [withdrawalToDelete, setWithdrawalToDelete] = useState(null);
  const [view, setView] = useState('manage'); // 'manage' or 'status'
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  
  const hasUnsavedChanges = selectedUser && JSON.stringify(selectedUser.payments || {}) !== JSON.stringify(pendingPayments || {});

  const fetchAllData = async () => {
    const usersCollection = collection(db, "users");
    const withdrawalsCollection = collection(db, "withdrawals");
    
    const [userSnapshot, withdrawalSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(query(withdrawalsCollection, orderBy("timestamp", "desc")))
    ]);

    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const withdrawalList = withdrawalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    setUsers(userList.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    setWithdrawals(withdrawalList);
  };

  useEffect(() => {
      fetchAllData();
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
    if (!newDisplayName) return;

    await addDoc(collection(db, "users"), {
        displayName: newDisplayName,
        payments: {}
    });
    
    setNewDisplayName("");
    alert("User has been added.");
    fetchAllData();
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
      alert("Changes saved successfully!");
      fetchAllData();
  };

  const handleConfirmDelete = async () => {
      if (!selectedUser) return;
      await deleteDoc(doc(db, "users", selectedUser.id));
      alert(`User ${selectedUser.displayName} has been deleted.`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setPendingPayments(null);
      fetchAllData();
  };
  
  const handleAddWithdrawal = async (e) => {
      e.preventDefault();
      const amount = parseFloat(withdrawalAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount.");
          return;
      }
      await addDoc(collection(db, "withdrawals"), {
          amount: amount,
          timestamp: serverTimestamp()
      });
      setWithdrawalAmount('');
      alert("Withdrawal recorded.");
      fetchAllData();
  };

  const handleDeleteWithdrawal = (withdrawal) => {
      setWithdrawalToDelete(withdrawal);
      setIsWithdrawalDeleteModalOpen(true);
  };

  const handleConfirmWithdrawalDelete = async () => {
      if (!withdrawalToDelete) return;
      await deleteDoc(doc(db, "withdrawals", withdrawalToDelete.id));
      alert("Withdrawal deleted.");
      setIsWithdrawalDeleteModalOpen(false);
      setWithdrawalToDelete(null);
      fetchAllData();
  };
  
  useEffect(() => {
      const amount = parseFloat(calculatorAmount);
      if (!isNaN(amount) && amount > 0) {
          setMonthsToCheck(Math.floor(amount / MONTHLY_PAYMENT));
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
      {isWithdrawalDeleteModalOpen && (
        <DeleteWithdrawalModal
            withdrawal={withdrawalToDelete}
            onConfirm={handleConfirmWithdrawalDelete}
            onCancel={() => setIsWithdrawalDeleteModalOpen(false)}
        />
      )}
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      
      <FinancialSummary users={users} withdrawals={withdrawals} />
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setView('manage')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'manage' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                Manage Users
            </button>
            <button onClick={() => setView('status')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'status' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                All Users Status
            </button>
        </nav>
      </div>

      {view === 'status' && <AllUsersStatus users={users} />}

      {view === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">User Administration</h3>
              <form onSubmit={handleAddUser} className="mb-6 space-y-3">
                <h4 className="font-semibold mb-2">Add New User</h4>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="e.g., John S."
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
                        <option key={user.id} value={user.id}>{user.displayName}</option>
                    ))}
                </select>
                {selectedUser && (
                    <button 
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="w-full mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Delete {selectedUser.displayName}
                    </button>
                )}
              </div>
              
              <hr className="my-6"/>
              
              <h3 className="text-xl font-semibold mb-4">Withdrawals</h3>
              <form onSubmit={handleAddWithdrawal} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Withdrawal Amount (₱)</label>
                    <input
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="e.g., 5000"
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded">
                      Record Withdrawal
                  </button>
              </form>
              <div className="mt-4 max-h-48 overflow-y-auto">
                  <h4 className="font-semibold mb-2">History</h4>
                  <ul className="divide-y divide-gray-200">
                      {withdrawals.map(w => (
                          <li key={w.id} className="py-2 flex justify-between items-center">
                              <div>
                                <p className="font-semibold">₱{w.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{new Date(w.timestamp?.toDate()).toLocaleString()}</p>
                              </div>
                              <button onClick={() => handleDeleteWithdrawal(w)} className="text-red-500 hover:text-red-700 font-bold">
                                  &times;
                              </button>
                          </li>
                      ))}
                  </ul>
              </div>

            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Manage Payments</h3>
              {selectedUser ? (
                <div>
                    <p className="mb-4">Managing payments for: <strong>{selectedUser.displayName}</strong></p>
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
      )}
    </div>
  );
}

export default App;

