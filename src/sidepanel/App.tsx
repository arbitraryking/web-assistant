import { useState } from 'react';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

type View = 'chat' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('chat');

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="nav">
        <button
          className={`nav-button ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentView('chat')}
        >
          Chat
        </button>
        <button
          className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          Settings
        </button>
      </nav>

      {/* Main content - both stay mounted to preserve state */}
      <main className="main-content">
        <div className={`view-container ${currentView === 'chat' ? 'active' : ''}`}>
          <Chat />
        </div>
        <div className={`view-container ${currentView === 'settings' ? 'active' : ''}`}>
          <Settings />
        </div>
      </main>
    </div>
  );
}

export default App;
