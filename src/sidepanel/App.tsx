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

      {/* Main content */}
      <main className="main-content">
        {currentView === 'chat' && <Chat />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
