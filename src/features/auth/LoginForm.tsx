import React from 'react';
import { useLogin } from './useLogin';

const LoginForm: React.FC = () => {
  const { isLoading, error, loginWithGoogle } = useLogin();

  return (
    <div className="flex flex-col items-center space-y-6">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={loginWithGoogle}
        disabled={isLoading}
        className="flex items-center justify-center bg-white"
      >
        <span className="mr-2">Google</span>
        {isLoading ? '認証中...' : 'アカウントでログイン'}
      </button>

      <p className="text-xs text-gray-500">
        ※始めての方はユーザー登録画面へ移動します。
      </p>
    </div>
  );
};

export default LoginForm;
