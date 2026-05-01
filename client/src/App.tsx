import { useEffect, useState } from 'react'
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType } from './lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore'
import { LogIn, LogOut, Plus, Trash2, StickyNote } from 'lucide-react'
import { ErrorBoundary } from 'react-error-boundary'

interface Note {
  id: string;
  content: string;
  userId: string;
  createdAt: any;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  let errorMessage = "An unexpected error occurred.";
  try {
    const parsedError = JSON.parse(error.message);
    if (parsedError.error) {
      errorMessage = `Firestore Error: ${parsedError.error} (Op: ${parsedError.operationType})`;
    }
  } catch (e) {
    errorMessage = error.message;
  }

  return (
    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
      <h2 className="font-bold mb-2">Something went wrong:</h2>
      <pre className="text-sm whitespace-pre-wrap mb-4">{errorMessage}</pre>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

function NotesApp({ user }: { user: User }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, `users/${user.uid}/notes`)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData: Note[] = []
      snapshot.forEach((doc) => {
        notesData.push({ id: doc.id, ...doc.data() } as Note)
      })
      setNotes(notesData)
      setLoading(false)
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`)
    })

    return () => unsubscribe()
  }, [user.uid])

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const path = `users/${user.uid}/notes`
    try {
      await addDoc(collection(db, path), {
        content: newNote,
        userId: user.uid,
        createdAt: serverTimestamp()
      })
      setNewNote('')
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path)
    }
  }

  const deleteNote = async (noteId: string) => {
    const path = `users/${user.uid}/notes/${noteId}`
    try {
      await deleteDoc(doc(db, path))
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path)
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <form onSubmit={addNote} className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          className="flex-1 px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
      ) : (
        <div className="grid gap-4">
          {notes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
              No notes yet. Add your first one!
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-4 border rounded-xl bg-card flex justify-between items-start group hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  <StickyNote className="text-primary shrink-0 mt-1" size={18} />
                  <p className="text-foreground">{note.content}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid)
        try {
          const userSnap = await getDoc(userRef)
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              createdAt: serverTimestamp()
            })
          }
        } catch (error) {
          console.error("Error ensuring user document:", error)
        }
      }
      setUser(currentUser)
      setAuthReady(true)
    })
    return () => unsubscribe()
  }, [])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-medium">Initializing...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 sm:p-12">
      <header className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mimo Notes</h1>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user.displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="w-10 h-10 rounded-full border"
                referrerPolicy="no-referrer"
              />
            )}
            <button
              onClick={logout}
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <LogIn size={18} />
            Sign in with Google
          </button>
        )}
      </header>

      <main className="w-full flex flex-col items-center">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {user ? (
            <NotesApp user={user} />
          ) : (
            <div className="text-center py-20 space-y-6">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                <StickyNote size={64} className="text-primary relative" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Your thoughts, secured.</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Sign in to start taking private notes that sync across all your devices.
                </p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>

      <footer className="mt-auto pt-12 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Mimo Notes. All rights reserved.
      </footer>
    </div>
  )
}

export default App
