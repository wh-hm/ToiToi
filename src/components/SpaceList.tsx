export default function SpaceList(props: any) {

    const { items, title, onEdit, onDelete, toggleFavorite } = props;

    const getLinkPath = (type: number, id: string | number) => {
        switch (type) {
            case 1: return `/chat/${id}`;    // チャット
            case 2: return `/task/${id}`;    // Task（ToDo）
            case 3: return `/question/${id}`;// 質問
            default: return `/chat/${id}`;   // デフォルト
        }
    };

    return (
        <div>
            <h2>{title}</h2>
            <ul>
                {items && items.length > 0 ? (
                    items.map((s: any) => (
                        <li key={s.id} style={{ display: 'flex', gap: '10px', padding: '8px', borderBottom: '1px solid #eee' }}>
                            {/* 関数が存在するかチェックしてから呼ぶ安全な書き方 */}
                            <button onClick={() => {
                                if (typeof toggleFavorite === 'function') {
                                    toggleFavorite(s.id);
                                } else {
                                    console.error("toggleFavoriteが関数じゃない:", toggleFavorite);
                                }
                            }}>
                                {s.favorite_flag === 1 ? "★" : "☆"}
                            </button>
                            <a href={getLinkPath(s.space_type, s.id)}>{s.name}</a>
                            <button onClick={() => onEdit(s)}>編集</button>
                            <button onClick={() => onDelete(s.id)}>削除</button>
                        </li>
                    ))
                ) : (
                    <p>データなし</p>
                )}
            </ul>
        </div>
    );
}