import React from 'react';
import LoginForm from '../features/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="login-container">
      <h1>ToiToi</h1>

      {/* サインアップ・サインインボタン */}
      <div>
        <button>サインアップ</button>
      </div>

      <div>
        <button>サインイン</button>
      </div>

      {/* ここで LoginForm を表示する */}
      <LoginForm />
    </div>
  );
};

export default LoginPage;