import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
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

// --- SET YOUR ADMIN PASSWORD HERE ---
const ADMIN_PASSWORD = "PaySchool"; // Change this to a secure password

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Helper function to generate month range ---
const generateMonthRange = (startYear, startMonth, endYear, endMonth) => {
    let months = [];
    // Create dates in a way that avoids timezone issues. Month is 0-indexed (0=Jan, 11=Dec).
    let currentDate = new Date(startYear, startMonth - 1, 2); 
    const finalDate = new Date(endYear, endMonth - 1, 2);

    while (currentDate <= finalDate) {
        months.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months;
};

// Generate months from August 2025 to July 2028
const paymentMonths = generateMonthRange(2025, 8, 2028, 7);

// --- Components ---

function FirestoreRulesErrorModal() {
  const rulesUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`;
  const rulesToCopy = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full">
        <h2 className="font-bold text-2xl text-red-700 mb-4">STOP: Database Permission Error</h2>
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
            <p className="font-bold">This is Not a Code Error</p>
            <p>This is a required, one-time security setup for your new database. By default, Firebase blocks all access. You must manually change the rules to allow the app to connect.</p>
        </div>
        <div className="text-gray-800 space-y-4">
            <p className="font-semibold mb-2">Required Action:</p>
            <ol className="list-decimal list-inside space-y-2 mb-4 border border-gray-300 p-4 rounded-md">
                <li>
                Click this direct link to your database rules page:{' '}
                <a href={rulesUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-600">
                    Go to Firestore Rules
                </a>
                .
                </li>
                <li>Delete everything in the text editor.</li>
                <li>Copy the rules below and paste them into the editor:</li>
                <pre className="list-disc list-inside ml-5 mt-2 p-3 bg-gray-200 text-gray-800 rounded font-mono overflow-x-auto">
                  <code>
                    {rulesToCopy}
                  </code>
                </pre>
                <li>Click the <strong>"Publish"</strong> button.</li>
            </ol>
        </div>
        <button
          onClick={() => window.location.reload(true)}
          className="mt-6 w-full bg-red-600 hover:bg-red-800 text-white font-bold py-3 px-4 rounded text-lg"
        >
          I have updated the rules. Try Again.
        </button>
      </div>
    </div>
  );
}


function LoginScreen({ setLoggedInUser, setIsAdmin, users }) {
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleAdminLogin = () => {
    if (password === ADMIN_PASSWORD) {
      if (rememberMe) {
        localStorage.setItem('adminPassword', password);
      } else {
        localStorage.removeItem('adminPassword');
      }
      setIsAdmin(true);
      setLoggedInUser({ email: 'Admin', nickname: 'Admin' });
      setError('');
    } else {
      setError('Incorrect admin password.');
    }
  };
  
  const handleAdminSubmit = (e) => {
      e.preventDefault();
      handleAdminLogin();
  };

  const handleUserLogin = () => {
    if (selectedUser) {
      const user = users.find(u => u.id === selectedUser);
      setLoggedInUser(user);
      setIsAdmin(false);
      setError('');
    } else {
       setError('Please select your nickname from the list.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        
        <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">View Your Dashboard</h3>
            <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-3 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="">-- Select your nickname --</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.nickname}</option>
                ))}
            </select>
            <button
                onClick={handleUserLogin}
                className="w-full mt-3 bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
            >
                View My Status
            </button>
        </div>

        <hr className="my-6"/>

        <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Admin Login</h3>
            <form onSubmit={handleAdminSubmit}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Admin Password"
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-3 flex items-center">
                    <input 
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                        Remember Password
                    </label>
                </div>
                <button
                    type="submit"
                    className="w-full mt-3 bg-indigo-600 hover:bg-indigo-800 text-white font-bold py-3 px-4 rounded-md transition-colors"
                >
                    Login as Admin
                </button>
            </form>
        </div>
    </div>
  );
}


function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState(false);

  useEffect(() => {
    // This adds the Tailwind CSS script to the document's head
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);

    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
        if (error.code === 'permission-denied') {
            setFirestoreError(true);
        }
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);
  
  const handleLogout = () => {
      setLoggedInUser(null);
      setIsAdmin(false);
  };

  if (firestoreError) {
      return <FirestoreRulesErrorModal />;
  }

  if (loading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-xl font-semibold">Loading Users...</div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Payment Tracker</h1>
          {loggedInUser && (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {!loggedInUser ? (
          <LoginScreen setLoggedInUser={setLoggedInUser} setIsAdmin={setIsAdmin} users={users} />
        ) : isAdmin ? (
          <AdminDashboard users={users} setUsers={setUsers} />
        ) : (
          <UserDashboard user={loggedInUser} />
        )}
      </main>
    </div>
  );
}

function UserDashboard({ user }) {
    const [payments, setPayments] = useState(user.payments || {});
    const [totalPaid, setTotalPaid] = useState(0);
    const [paymentsLeft, setPaymentsLeft] = useState(0);
    const [status, setStatus] = useState("Loading...");

    useEffect(() => {
        const paidCount = Object.values(payments).filter(p => p).length;
        setTotalPaid(paidCount * 25);
        setPaymentsLeft(paymentMonths.length - paidCount);

        const today = new Date();
        const monthsDueCount = paymentMonths.filter(m => m <= today).length;

        if (paidCount >= monthsDueCount) {
            setStatus("In Good Standing");
        } else {
            setStatus("Behind on Payments");
        }
    }, [payments]);

    return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user.nickname}!</h2>
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
                    You are about to permanently delete the user: <strong className="font-bold">{user.nickname}</strong> ({user.email}). This action cannot be undone.
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

function AdminDashboard({ users, setUsers }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserNickname, setNewUserNickname] = useState("");
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
    if (!newUserEmail || !newUserNickname) return;
    
    const userQuery = query(collection(db, "users"), where("email", "==", newUserEmail));
    const querySnapshot = await getDocs(userQuery);
    
    if (!querySnapshot.empty) {
        alert("User with this email already exists.");
        return;
    }

    const newUserRef = doc(collection(db, "users"));
    await setDoc(newUserRef, {
        email: newUserEmail,
        nickname: newUserNickname,
        payments: {} // Initialize with empty payments object
    });
    
    setNewUserEmail("");
    setNewUserNickname("");
    alert("User added successfully!");
    fetchUsers(); // Refresh the user list
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
      alert(`User ${selectedUser.nickname} has been deleted.`);
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
                <label className="block text-sm font-medium text-gray-700">Nickname</label>
                <input
                  type="text"
                  value={newUserNickname}
                  onChange={(e) => setNewUserNickname(e.target.value)}
                  placeholder="e.g., John D."
                  className="w-full p-2 border rounded"
                  required
                />
            </div>
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
                    <option key={user.id} value={user.id}>{user.nickname} ({user.email})</option>
                ))}
            </select>
            {selectedUser && (
                <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Delete {selectedUser.nickname}
                </button>
            )}
          </div>
        </div>

        {/* Payment Management */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Manage Payments</h3>
          {selectedUser ? (
            <div>
                <p className="mb-4">Managing payments for: <strong>{selectedUser.nickname}</strong></p>
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

