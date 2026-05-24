import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [studyNotes, setStudyNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    summary: "",
    content: "",
    example_code: "",
    memo: "",
  });

  const fetchStudyNotes = async (keyword = "") => {
    const res = await axios.get(
      `http://localhost:8081/api/study-notes?search=${keyword}`
    );
    setStudyNotes(res.data.data);
  };

  useEffect(() => {
    fetchStudyNotes();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axios.post("http://localhost:8081/api/study-notes", form);

    setForm({
      title: "",
      category: "",
      summary: "",
      content: "",
      example_code: "",
      memo: "",
    });

    fetchStudyNotes(search);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchStudyNotes(e.target.value);
  };

  const handleShowDetail = async (id) => {
    const res = await axios.get(`http://localhost:8081/api/study-notes/${id}`);
    setSelectedNote(res.data);
  };

  return (
    <div className="container">
      <h1>Study Note</h1>

      <input
        type="text"
        placeholder="検索（Laravel / React / Docker）"
        value={search}
        onChange={handleSearch}
      />

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
          placeholder="詳しい内容"
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
          placeholder="メモ"
          value={form.memo}
          onChange={handleChange}
        />

        <button type="submit">登録</button>
      </form>

      <hr />

      {selectedNote && (
        <div className="detail">
          <button onClick={() => setSelectedNote(null)}>閉じる</button>

          <h2>{selectedNote.title}</h2>
          <p>{selectedNote.category}</p>
          <p>{selectedNote.summary}</p>

          <h3>詳しい内容</h3>
          <p>{selectedNote.content}</p>

          <h3>コード例</h3>
          <pre>{selectedNote.example_code}</pre>

          <h3>メモ</h3>
          <p>{selectedNote.memo}</p>
        </div>
      )}

      {studyNotes.map((note) => (
        <div
          key={note.id}
          className="card"
          onClick={() => handleShowDetail(note.id)}
        >
          <h2>{note.title}</h2>
          <p>{note.category}</p>
          <p>{note.summary}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
