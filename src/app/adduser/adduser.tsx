export default function LoginPage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>ユーザー名登録</h1>

      <p classname="resister">はじめまして！<br />
      継続を目的としたToiToiです！<br />
      皆様の助けとなれるように頑張りたいと思います！<br />
      まずはユーザー名を登録してください。
      </p>

      <label>登録したいユーザー名</label>
      <label>ユーザー名</label><br />
      <input
        type="text"
        name="username"
        placeholder="ユーザー名を入力"
        className="input"
        />

      <button>登録</button>
    </div>
  );
}
