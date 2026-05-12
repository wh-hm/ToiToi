import React, { useState } from 'react';
import { useRouter } from './userLogin';

const LoginForm: React.FC = () => {
  const { isLoading, error, loginWithGoogle } = userLogin();

  return (
    <div className="flex flex-col items-center space-y-6">
      {error && <p className="text-red-500 text-sm">{error}</p>}
    
      <button
        onClick={loginWithGoogle}
        disabled={isLoading}
        className="flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rouded-full hover:bg-gray-100 transition duration-150 disabled:opacity-50"
        >
        {/*Googleのログアイコン（実物はSVG等を推奨）*/}
        <span className="mr-2">Google</span>
        {isLoading ? '認証中...' :'Googleアカウントでログイン'}

        <p className="text-xs text-gray-500">
         ※始めての方はユーザー登録画面へ移動します。
        </p>
      </div>
    );
};

export default LoginForm;
