import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] =
    useState('admin@example.com');

  const [password, setPassword] =
    useState('Admin@123');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response =
        await api.post(
          '/auth/login',
          {
            email,
            password,
          }
        );

      localStorage.setItem(
        'token',
        response.data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(
          response.data.user
        )
      );

      navigate('/');
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <h1>Mini ERP + CRM</h1>

        <p>
          Wholesale / Distribution
          Operations Portal
        </p>

        <label>
          Email

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            required
          />
        </label>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Signing in...'
            : 'Sign in'}
        </button>

        <small>
          Demo login:
          <br />
          admin@example.com
          <br />
          Admin@123
        </small>
      </form>
    </div>
  );
}