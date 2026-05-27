import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [studyNotes, setStudyNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const categories = ["Laravel", "React", "Docker", "Git"];

  const [form, setForm] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
    example_code: "",
    memo: "",
  });

  useEffect(() => {
    fetchStudyNotes();

    const savedFavorites =
      JSON.parse(localStorage.getItem("study-note-favorites")) || [];

    setFavorites(savedFavorites);
  }, []);

  const fetchStudyNotes = async (keyword = "") => {
    const res = await axios.get(
      `http://localhost:8081/api/study-notes?search=${keyword}`
    );

    setStudyNotes(res.data.data);
  };

  const resetForm = () => {
    setForm({
      title: "",
      category: "",
      summary: "",
      content: "",
      example_code: "",
      memo: "",
    });

    setEditingId(null);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      await axios.put(
        `http://localhost:8081/api/study-notes/${editingId}`,
        form
      );
    } else {
      await axios.post("http://localhost:8081/api/study-notes", form);
    }

    resetForm();
    fetchStudyNotes(search);
    setSelectedNote(null);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchStudyNotes(e.target.value);
  };

  const handleCategoryClick = (category) => {
    setSearch(category);
    fetchStudyNotes(category);
  };

  const handleClearFilter = () => {
    setSearch("");
    fetchStudyNotes("");
  };

  const handleShowDetail = async (id) => {
    const res = await axios.get(`http://localhost:8081/api/study-notes/${id}`);
    setSelectedNote(res.data);
  };

  const handleEdit = (note) => {
    setEditingId(note.id);

    setForm({
      title: note.title || "",
      category: note.category || "",
      summary: note.summary || "",
      content: note.content || "",
      example_code: note.example_code || "",
      memo: note.memo || "",
    });

    setSelectedNote(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const result = window.confirm("このノートを削除しますか？");

    if (!result) return;

    await axios.delete(`http://localhost:8081/api/study-notes/${id}`);

    setSelectedNote(null);
    resetForm();
    fetchStudyNotes(search);
  };

  const toggleFavorite = (id, e) => {
    e.stopPropagation();

    let updatedFavorites;

    if (favorites.includes(id)) {
      updatedFavorites = favorites.filter((favId) => favId !== id);
    } else {
      updatedFavorites = [...favorites, id];
    }

    setFavorites(updatedFavorites);
    localStorage.setItem(
      "study-note-favorites",
      JSON.stringify(updatedFavorites)
    );
  };

  const filteredNotes = showFavoritesOnly
    ? studyNotes.filter((note) => favorites.includes(note.id))
    : studyNotes;

  return (
    <div className="container">
      <h1>Study Note</h1>

      <input
        type="text"
        className="search-input"
        placeholder="検索（Laravel / React / Docker）"
        value={search}
        onChange={handleSearch}
      />

      <div className="category-buttons">
        <button type="button" onClick={handleClearFilter}>
          すべて
        </button>

        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          {showFavoritesOnly ? "すべて表示" : "お気に入りのみ"}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="タイトル"
          value={form.title}
          onChange={handleChange}
        />

        <input
          name="category"
          placeholder="カテゴリ"
          value={form.category}
          onChange={handleChange}
        />

        <textarea
          name="summary"
          placeholder="ざっくり説明"
          value={form.summary}
          onChange={handleChange}
        />

        <textarea
          name="content"
          placeholder="詳しい内容（Markdown OK）"
          value={form.content}
          onChange={handleChange}
        />

        <textarea
          name="example_code"
          placeholder="コード例"
          value={form.example_code}
          onChange={handleChange}
        />

        <textarea
          name="memo"
          placeholder="メモ（Markdown OK）"
          value={form.memo}
          onChange={handleChange}
        />

        <button type="submit">{editingId ? "更新" : "登録"}</button>

        {editingId && (
          <button type="button" className="cancel-button" onClick={resetForm}>
            キャンセル
          </button>
        )}
      </form>

      <hr />

      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-buttons">
              <button onClick={() => setSelectedNote(null)}>閉じる</button>
              <button onClick={() => handleEdit(selectedNote)}>編集</button>
              <button onClick={() => handleDelete(selectedNote.id)}>削除</button>
            </div>

            <h2>{selectedNote.title}</h2>

            {selectedNote.category && (
              <span className="tag">{selectedNote.category}</span>
            )}

            <p>{selectedNote.summary}</p>

            <h3>詳しい内容</h3>
            <div className="markdown-body">
              <ReactMarkdown>{selectedNote.content || ""}</ReactMarkdown>
            </div>

            <h3>コード例</h3>
            <pre>{selectedNote.example_code}</pre>

            <h3>メモ</h3>
            <div className="markdown-body">
              <ReactMarkdown>{selectedNote.memo || ""}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      <div className="note-list">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="card"
            onClick={() => handleShowDetail(note.id)}
          >
            <div className="card-header">
              <h2>{note.title}</h2>

              <button
                className="favorite-button"
                onClick={(e) => toggleFavorite(note.id, e)}
              >
                {favorites.includes(note.id) ? "⭐" : "☆"}
              </button>
            </div>

            {note.category && <span className="tag">{note.category}</span>}

            <p>{note.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
