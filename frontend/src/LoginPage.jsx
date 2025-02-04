import { useState } from 'react';
import axios from 'axios';
import './App.css';
import './LoginPage.css';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!username) {
      setError('Le champ username est obligatoire.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/users/login', { username });
      console.log(response.data);

      if (response.data.userId) {
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem("username", username);

        window.location.href = '/chat';
      } else {
        setError('Une erreur inattendue est survenue.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Bienvenue !</h1>
      <form className="login-form" onSubmit={handleLogin}>
        <input class="input"
          type="text"
          placeholder="Entrez votre pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br></br>
        <button class="button_connexion" type="submit" disabled={isLoading}>
          {isLoading ? 'Connexion...' : 'Connexion'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

export default LoginPage;